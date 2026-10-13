import { Global, Logger, Module } from '@nestjs/common';
import { Redis } from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
	providers: [
		{
			provide: REDIS_CLIENT,
			useFactory: () => {
				const logger = new Logger('Redis');
				const client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
					maxRetriesPerRequest: 1,
					retryStrategy: (times) => (times > 3 ? null : times * 500),
				});
				client.on('connect', () => logger.log('Redis is connected'));
				client.on('error', (err) => logger.warn(`Redis error: ${err.message}`));
				return client;
			},
		},
	],
	exports: [REDIS_CLIENT],
})
export class RedisModule {}
