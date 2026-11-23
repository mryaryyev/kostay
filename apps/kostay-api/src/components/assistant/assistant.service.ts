import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Redis } from 'ioredis';
import { Model, Types } from 'mongoose';
import { Readable } from 'stream';
import { REDIS_CLIENT } from '../../database/redis/redis.module';
import { Property } from '../../libs/dto/property/property';
import { MemberStatus, MemberType } from '../../libs/enums/member.enum';
import { PropertyLocation, PropertyStatus } from '../../libs/enums/property.enum';
import { Member } from '../../libs/dto/member/member';
import { toHexId } from '../ai-search/ai-search.service';
import { AssistantRateLimiter, LimitResult } from './rate-limit';
import { SseParser, formatSse } from './sse';

/** What a stay suggestion needs to be shown as a card. */
export interface StayCard {
	_id: string;
	propertyTitle: string;
	propertyType: string;
	propertyLocation: string;
	pricePerNight: number;
	maxGuests: number;
	propertyImage: string | null;
}

/** What a host suggestion needs to be shown as a card. */
export interface HostCard {
	_id: string;
	memberNick: string;
	memberImage: string | null;
	/** active stays of this host in the asked city */
	stays: number;
}

/** At most this many hosts are suggested for a city: those with the most active stays there. */
const HOST_CARDS = 3;

/** The final event of kostay-ai-search's /v1/assistant/stream (same shape as /assistant/answer). */
export interface AssistantDone {
	status: 'answered' | 'no_source' | 'stays' | 'error' | 'limited';
	answer: string;
	citations: {
		number: number;
		doc_id: string;
		title: string;
		url: string | null;
		source: string;
	}[];
	intent: string;
	stays: string[];
	stayCards?: StayCard[];
	/** hosts asked for in this city (SEOUL, BUSAN, ...); turned into hostCards here */
	hosts_city?: string;
	hostCards?: HostCard[];
}

/** A slow first answer (cold start, planner + answer calls) still fits; a hung one does not. */
const STREAM_TIMEOUT_MS = 30000;

export const UNAVAILABLE: AssistantDone = {
	status: 'error',
	answer: 'The assistant is not available right now. Please try again in a moment.',
	citations: [],
	intent: 'unknown',
	stays: [],
};

export const LIMITED: Record<'ip' | 'day', AssistantDone> = {
	ip: {
		...UNAVAILABLE,
		status: 'limited',
		answer: 'You are asking a little too fast. Please wait a minute and try again.',
	},
	day: {
		...UNAVAILABLE,
		status: 'limited',
		answer: 'The assistant has answered many questions today. Please try again tomorrow.',
	},
};

/** Anything with write(), like Express's response: kept small so tests can pass a fake. */
export interface EventSink {
	write(chunk: string): unknown;
}

@Injectable()
export class AssistantService {
	private readonly logger = new Logger(AssistantService.name);
	private readonly baseUrl?: string;
	private readonly apiKey: string;
	private readonly limiter: AssistantRateLimiter;

	constructor(
		private readonly http: HttpService,
		config: ConfigService,
		@Inject(REDIS_CLIENT) redis: Redis,
		@InjectModel('Property') private readonly propertyModel: Model<Property>,
		@InjectModel('Member') private readonly memberModel: Model<Member>,
	) {
		this.baseUrl = config.get<string>('AI_SEARCH_URL');
		this.apiKey = config.get<string>('AI_SEARCH_API_KEY') ?? '';
		this.limiter = new AssistantRateLimiter(redis);
	}

	public limit(ip: string): Promise<LimitResult> {
		return this.limiter.hit(ip);
	}

	/**
	 * Passes kostay-ai-search's events on as they arrive. "start" and "delta" go through
	 * untouched; "done" gets stay and host cards added. Always ends with exactly one "done" event.
	 * `signal` aborts the upstream call when the visitor leaves, so nobody pays for an
	 * answer no one reads. `history`: the visitor's earlier questions, for follow-ups.
	 */
	public async stream(
		question: string,
		out: EventSink,
		signal: AbortSignal,
		history: string[] = [],
	): Promise<void> {
		if (!this.baseUrl) {
			out.write(formatSse('done', UNAVAILABLE));
			return;
		}
		let sentDone = false;
		try {
			const response = await this.http.axiosRef.post<Readable>(
				`${this.baseUrl}/v1/assistant/stream`,
				{ question, history },
				{
					headers: { 'X-Internal-Api-Key': this.apiKey },
					responseType: 'stream',
					timeout: STREAM_TIMEOUT_MS,
					signal,
				},
			);
			const parser = new SseParser();
			for await (const chunk of response.data) {
				for (const event of parser.push(String(chunk))) {
					if (event.event === 'done') {
						const done = JSON.parse(event.data) as AssistantDone;
						out.write(
							formatSse('done', await this.withHostCards(await this.withStayCards(done))),
						);
						sentDone = true;
					} else {
						out.write(`event: ${event.event}\ndata: ${event.data}\n\n`);
					}
				}
			}
		} catch (error) {
			if (signal.aborted) return; // the visitor left: nothing to send
			this.logger.warn(`assistant stream failed: ${(error as Error).message}`);
		}
		if (!sentDone && !signal.aborted) out.write(formatSse('done', UNAVAILABLE));
	}

	/** Property ids -> cards, in the AI service's order; only stays that are still ACTIVE. */
	public async withStayCards(done: AssistantDone): Promise<AssistantDone> {
		const ids = (done.stays ?? []).filter((id) => Types.ObjectId.isValid(id));
		if (!ids.length) return done;
		const found = await this.propertyModel
			.find({ _id: { $in: ids }, propertyStatus: PropertyStatus.ACTIVE })
			.select(
				'propertyTitle propertyType propertyLocation pricePerNight maxGuests propertyImages',
			)
			.lean()
			.exec();
		const byId = new Map(found.map((p) => [toHexId(p._id), p]));
		const stayCards = ids
			.map((id) => byId.get(id))
			.filter((p) => p !== undefined)
			.map((p) => ({
				_id: toHexId(p._id),
				propertyTitle: p.propertyTitle,
				propertyType: p.propertyType,
				propertyLocation: p.propertyLocation,
				pricePerNight: p.pricePerNight,
				maxGuests: p.maxGuests,
				propertyImage: p.propertyImages?.[0] ?? null,
			}));
		return { ...done, stays: stayCards.map((card) => card._id), stayCards };
	}

	/**
	 * A city -> the hosts with the most active stays there, as cards. The AI service only knows
	 * the city: members live in MongoDB, which only this API reads.
	 */
	public async withHostCards(done: AssistantDone): Promise<AssistantDone> {
		const city = done.hosts_city ?? '';
		if (!Object.values(PropertyLocation).includes(city as PropertyLocation)) return done;
		const counts: { _id: Types.ObjectId; stays: number }[] = await this.propertyModel
			.aggregate([
				{ $match: { propertyStatus: PropertyStatus.ACTIVE, propertyLocation: city } },
				{ $group: { _id: '$memberId', stays: { $sum: 1 } } },
				{ $sort: { stays: -1, _id: 1 } },
			])
			.exec();
		const hosts = await this.memberModel
			.find({
				_id: { $in: counts.map((c) => c._id) },
				memberType: MemberType.HOST,
				memberStatus: MemberStatus.ACTIVE,
			})
			.select('memberNick memberImage')
			.lean()
			.exec();
		const byId = new Map(hosts.map((h) => [toHexId(h._id), h]));
		const hostCards = counts
			.map((c) => ({ host: byId.get(c._id.toHexString()), stays: c.stays }))
			.filter((c) => c.host !== undefined)
			.slice(0, HOST_CARDS)
			.map(({ host, stays }) => ({
				_id: toHexId(host!._id),
				memberNick: host!.memberNick,
				memberImage: host!.memberImage ?? null,
				stays,
			}));
		return { ...done, hostCards };
	}
}
