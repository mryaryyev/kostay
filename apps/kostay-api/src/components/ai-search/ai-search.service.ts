import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import moment from 'moment';
import { ObjectId } from 'mongoose';
import { Observable, firstValueFrom } from 'rxjs';
import { REDIS_CLIENT } from '../../database/redis/redis.module';
import { AiSearchMetrics } from '../../libs/dto/ai-search/ai-search-metrics';
import { Property } from '../../libs/dto/property/property';

/** mongoose's ObjectId type declares no toString, so String(id) trips no-base-to-string. */
export function toHexId(id: ObjectId): string {
	return (id as unknown as { toHexString(): string }).toHexString();
}

/**
 * After this the caller falls back to keyword search. A warm search takes 1-2 s; after hours
 * without traffic the first one took 7.2 s on the production server, so leave room for it.
 */
const SEARCH_TIMEOUT_MS = 8000;

/** Filters the AI service extracted from the query (same names as PISearch). */
export interface AiSearchFilters {
	checkIn?: string;
	checkOut?: string;
}

export interface AiSearchResult {
	ids: string[];
	filters: AiSearchFilters | null;
	/** Filters dropped because nothing matched all of them, in the order they were dropped. */
	relaxedFields: string[];
}

interface AiSearchResponse {
	filters: AiSearchFilters | null;
	results: { property_id: string; score: number }[];
	relaxed_fields?: string[];
}

/** GET /v1/metrics of kostay-ai-search (snake_case). */
interface AiMetricsResponse {
	days: number;
	searches: number;
	p50_ms: number;
	p95_ms: number;
	avg_llm_ms: number;
	avg_embed_ms: number;
	avg_search_ms: number;
	avg_rerank_ms: number;
	cost_usd: number;
	cost_per_1k_usd: number;
	no_results: number;
	relaxed: number;
	relaxed_fields: Record<string, number>;
	llm_failed: number;
	daily: { date: string; searches: number; p95_ms: number; cost_usd: number }[];
}

/** Redis hash per day (Seoul time): Smart Search requests and keyword fallbacks, kept 100 days. */
const STATS_KEY = 'ai-search:stats:';
const STATS_TTL_SECONDS = 100 * 24 * 3600;

@Injectable()
export class AiSearchService {
	private readonly logger = new Logger(AiSearchService.name);
	private readonly baseUrl?: string;
	private readonly apiKey: string;

	constructor(
		private readonly http: HttpService,
		config: ConfigService,
		@Inject(REDIS_CLIENT) private readonly redis: Redis,
	) {
		this.baseUrl = config.get<string>('AI_SEARCH_URL');
		this.apiKey = config.get<string>('AI_SEARCH_API_KEY') ?? '';
	}

	/** Ranked property ids (and extracted filters) for a query, or null when the AI service is unavailable. */
	public async search(query: string, limit: number): Promise<AiSearchResult | null> {
		if (!this.baseUrl) return null;
		this.count('requests');
		try {
			const { data } = await firstValueFrom(
				this.http.post<AiSearchResponse>(
					`${this.baseUrl}/v1/search`,
					{ query, limit },
					{ ...this.options(), timeout: SEARCH_TIMEOUT_MS },
				),
			);
			return {
				ids: data.results.map((hit) => hit.property_id),
				filters: data.filters,
				relaxedFields: data.relaxed_fields ?? [],
			};
		} catch (error) {
			this.count('fallbacks');
			this.logger.warn(
				`AI search failed, using keyword search: ${(error as Error).message}`,
			);
			return null;
		}
	}

	/**
	 * Admin monitoring: the AI service's own numbers plus what only NestJS sees (how often it fell back
	 * to keyword search because the AI service was down or too slow).
	 */
	public async getMetrics(days: number): Promise<AiSearchMetrics> {
		const ai = await this.fetchMetrics(days);
		const dates = ai?.daily.map((day) => day.date) ?? this.lastDates(days);
		const counts = await this.readCounts(dates);
		const daily = dates.map((date, index) => ({
			date,
			searches: ai?.daily[index]?.searches ?? 0,
			p95Ms: ai?.daily[index]?.p95_ms ?? 0,
			costUsd: ai?.daily[index]?.cost_usd ?? 0,
			requests: counts[index].requests,
			fallbacks: counts[index].fallbacks,
		}));
		return {
			days,
			available: ai !== null,
			searches: ai?.searches ?? 0,
			p50Ms: ai?.p50_ms ?? 0,
			p95Ms: ai?.p95_ms ?? 0,
			avgLlmMs: ai?.avg_llm_ms ?? 0,
			avgEmbedMs: ai?.avg_embed_ms ?? 0,
			avgSearchMs: ai?.avg_search_ms ?? 0,
			avgRerankMs: ai?.avg_rerank_ms ?? 0,
			costUsd: ai?.cost_usd ?? 0,
			costPer1kUsd: ai?.cost_per_1k_usd ?? 0,
			noResults: ai?.no_results ?? 0,
			relaxed: ai?.relaxed ?? 0,
			relaxedFields: Object.entries(ai?.relaxed_fields ?? {}).map(([field, count]) => ({
				field,
				count,
			})),
			llmFailed: ai?.llm_failed ?? 0,
			requests: daily.reduce((sum, day) => sum + day.requests, 0),
			fallbacks: daily.reduce((sum, day) => sum + day.fallbacks, 0),
			daily,
		};
	}

	private async fetchMetrics(days: number): Promise<AiMetricsResponse | null> {
		if (!this.baseUrl) return null;
		try {
			const { data } = await firstValueFrom(
				this.http.get<AiMetricsResponse>(`${this.baseUrl}/v1/metrics`, {
					...this.options(),
					params: { days },
				}),
			);
			return data;
		} catch (error) {
			this.logger.warn(`AI search metrics unavailable: ${(error as Error).message}`);
			return null;
		}
	}

	/** Fire-and-forget: a Redis problem must not slow down or break a search. */
	private count(field: 'requests' | 'fallbacks'): void {
		if (this.redis.status !== 'ready') return;
		const key = STATS_KEY + moment().format('YYYY-MM-DD');
		this.redis
			.multi()
			.hincrby(key, field, 1)
			.expire(key, STATS_TTL_SECONDS)
			.exec()
			.catch((error: Error) => this.logger.warn(`AI search stats: ${error.message}`));
	}

	private async readCounts(
		dates: string[],
	): Promise<{ requests: number; fallbacks: number }[]> {
		const empty = dates.map(() => ({ requests: 0, fallbacks: 0 }));
		if (this.redis.status !== 'ready') return empty;
		try {
			const pipeline = this.redis.pipeline();
			dates.forEach((date) => pipeline.hgetall(STATS_KEY + date));
			const results = (await pipeline.exec()) ?? [];
			return results.map(([, value]) => {
				const hash = (value ?? {}) as Record<string, string>;
				return {
					requests: Number(hash.requests ?? 0),
					fallbacks: Number(hash.fallbacks ?? 0),
				};
			});
		} catch {
			return empty;
		}
	}

	private lastDates(days: number): string[] {
		return Array.from({ length: days }, (_, index) =>
			moment()
				.subtract(days - 1 - index, 'days')
				.format('YYYY-MM-DD'),
		);
	}

	/** Fire-and-forget: never throws and never blocks the caller. Non-ACTIVE stays are removed by the AI service. */
	public syncProperty(property: Property): void {
		const id = toHexId(property._id);
		const body = {
			propertyTitle: property.propertyTitle,
			propertyDesc: property.propertyDesc,
			propertyAddress: property.propertyAddress,
			propertyLocation: property.propertyLocation,
			propertyType: property.propertyType,
			propertyStatus: property.propertyStatus,
			pricePerNight: property.pricePerNight,
			maxGuests: property.maxGuests,
			propertyRooms: property.propertyRooms,
			propertyBeds: property.propertyBeds,
			propertySquare: property.propertySquare,
			propertyRank: property.propertyRank,
		};
		this.send(id, () => this.http.put(this.url(id), body, this.options()));
	}

	public removeProperty(propertyId: ObjectId): void {
		const id = toHexId(propertyId);
		this.send(id, () => this.http.delete(this.url(id), this.options()));
	}

	private send(id: string, request: () => Observable<unknown>): void {
		if (!this.baseUrl) return;
		firstValueFrom(request()).catch((error: Error) =>
			this.logger.warn(`AI search sync failed for property ${id}: ${error.message}`),
		);
	}

	private url(propertyId: string): string {
		return `${this.baseUrl}/v1/index/properties/${propertyId}`;
	}

	private options() {
		return { headers: { 'X-Internal-Api-Key': this.apiKey } };
	}
}
