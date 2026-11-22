import { Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import moment from 'moment';

/** Per visitor: enough to chat, too few to script the bill up. */
export const PER_IP_PER_MINUTE = 10;
/** For everyone together: about $0.5 a day at ~$0.0005 per answer. */
export const PER_DAY = 1000;

export type LimitResult = { allowed: true } | { allowed: false; reason: 'ip' | 'day' };

export function decide(ipCount: number, dayCount: number): LimitResult {
	if (dayCount > PER_DAY) return { allowed: false, reason: 'day' };
	if (ipCount > PER_IP_PER_MINUTE) return { allowed: false, reason: 'ip' };
	return { allowed: true };
}

export class AssistantRateLimiter {
	private readonly logger = new Logger(AssistantRateLimiter.name);

	constructor(private readonly redis: Redis) {}

	/** Counts this question and says whether it may go on. Without Redis it lets it through. */
	public async hit(ip: string, now = moment()): Promise<LimitResult> {
		if (this.redis.status !== 'ready') return { allowed: true };
		const ipKey = `assistant:ip:${ip}:${now.format('YYYYMMDDHHmm')}`;
		const dayKey = `assistant:day:${now.format('YYYY-MM-DD')}`;
		try {
			const results = await this.redis
				.multi()
				.incr(ipKey)
				.expire(ipKey, 60)
				.incr(dayKey)
				.expire(dayKey, 2 * 24 * 3600)
				.exec();
			const ipCount = Number(results?.[0]?.[1] ?? 0);
			const dayCount = Number(results?.[2]?.[1] ?? 0);
			return decide(ipCount, dayCount);
		} catch (error) {
			this.logger.warn(`assistant rate limit skipped: ${(error as Error).message}`);
			return { allowed: true };
		}
	}
}
