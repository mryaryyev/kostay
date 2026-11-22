import { Logger } from '@nestjs/common';
import { Redis } from 'ioredis';

export const LOGIN_ATTEMPTS = 10;
export const LOGIN_WINDOW_SECONDS = 300;

/**
 * Counts login attempts of one address in fixed five-minute windows and says whether this one
 * may go on. Without Redis it lets it through, like the assistant's limit.
 */
export async function allowLogin(
	redis: Redis,
	ip: string,
	now = Date.now(),
): Promise<boolean> {
	if (redis.status !== 'ready') return true;
	const window = Math.floor(now / 1000 / LOGIN_WINDOW_SECONDS);
	const key = `login:ip:${ip}:${window}`;
	try {
		const results = await redis
			.multi()
			.incr(key)
			.expire(key, LOGIN_WINDOW_SECONDS)
			.exec();
		return Number(results?.[0]?.[1] ?? 0) <= LOGIN_ATTEMPTS;
	} catch (error) {
		new Logger('LoginLimit').warn(`login limit skipped: ${(error as Error).message}`);
		return true;
	}
}
