import moment from 'moment';
import {
	AssistantRateLimiter,
	PER_DAY,
	PER_IP_PER_MINUTE,
	decide,
} from './rate-limit';
import { clientIp } from '../../libs/client-ip';

describe('clientIp', () => {
	it('ignores X-Forwarded-For, which the visitor controls', () => {
		const headers = { 'x-forwarded-for': '1.2.3.4, 5.6.7.8', 'x-real-ip': '5.6.7.8' };
		expect(clientIp(headers, '10.0.0.1')).toBe('5.6.7.8');
	});
	it('uses X-Real-IP, then the socket address', () => {
		expect(clientIp({ 'x-real-ip': '5.6.7.8' }, '10.0.0.1')).toBe('5.6.7.8');
		expect(clientIp({}, '10.0.0.1')).toBe('10.0.0.1');
		expect(clientIp({})).toBe('unknown');
	});
});

describe('decide', () => {
	it('allows up to the limits and names the one that was hit', () => {
		expect(decide(PER_IP_PER_MINUTE, PER_DAY)).toEqual({ allowed: true });
		expect(decide(PER_IP_PER_MINUTE + 1, 5)).toEqual({ allowed: false, reason: 'ip' });
		expect(decide(1, PER_DAY + 1)).toEqual({ allowed: false, reason: 'day' });
	});
});

/** Just enough of ioredis: counters in a Map, multi() that runs them in order. */
function fakeRedis(status = 'ready') {
	const counts = new Map<string, number>();
	const ttls = new Map<string, number>();
	return {
		status,
		counts,
		ttls,
		multi() {
			const ops: (() => [null, number])[] = [];
			const chain = {
				incr(key: string) {
					ops.push(() => {
						counts.set(key, (counts.get(key) ?? 0) + 1);
						return [null, counts.get(key)!];
					});
					return chain;
				},
				expire(key: string, seconds: number) {
					ops.push(() => {
						ttls.set(key, seconds);
						return [null, 1];
					});
					return chain;
				},
				exec: () => Promise.resolve(ops.map((op) => op())),
			};
			return chain;
		},
	};
}

describe('AssistantRateLimiter', () => {
	const now = moment('2026-11-20T10:15:00');

	it('blocks the 11th question from one address within a minute', async () => {
		const redis = fakeRedis();
		const limiter = new AssistantRateLimiter(redis as never);
		for (let i = 0; i < PER_IP_PER_MINUTE; i++) {
			expect(await limiter.hit('1.2.3.4', now)).toEqual({ allowed: true });
		}
		expect(await limiter.hit('1.2.3.4', now)).toEqual({ allowed: false, reason: 'ip' });
		expect(await limiter.hit('9.9.9.9', now)).toEqual({ allowed: true });
		expect(redis.ttls.get('assistant:ip:1.2.3.4:202611201015')).toBe(60);
	});

	it('lets questions through when Redis is down', async () => {
		const limiter = new AssistantRateLimiter(fakeRedis('end') as never);
		expect(await limiter.hit('1.2.3.4', now)).toEqual({ allowed: true });
	});
});
