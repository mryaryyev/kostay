import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ObjectId } from 'mongoose';
import { Observable, firstValueFrom } from 'rxjs';
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
}

interface AiSearchResponse {
	filters: AiSearchFilters | null;
	results: { property_id: string; score: number }[];
}

@Injectable()
export class AiSearchService {
	private readonly logger = new Logger(AiSearchService.name);
	private readonly baseUrl?: string;
	private readonly apiKey: string;

	constructor(
		private readonly http: HttpService,
		config: ConfigService,
	) {
		this.baseUrl = config.get<string>('AI_SEARCH_URL');
		this.apiKey = config.get<string>('AI_SEARCH_API_KEY') ?? '';
	}

	/** Ranked property ids (and extracted filters) for a query, or null when the AI service is unavailable. */
	public async search(query: string, limit: number): Promise<AiSearchResult | null> {
		if (!this.baseUrl) return null;
		try {
			const { data } = await firstValueFrom(
				this.http.post<AiSearchResponse>(
					`${this.baseUrl}/v1/search`,
					{ query, limit },
					{ ...this.options(), timeout: SEARCH_TIMEOUT_MS },
				),
			);
			return { ids: data.results.map((hit) => hit.property_id), filters: data.filters };
		} catch (error) {
			this.logger.warn(
				`AI search failed, using keyword search: ${(error as Error).message}`,
			);
			return null;
		}
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
