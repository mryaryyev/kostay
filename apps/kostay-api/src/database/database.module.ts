import { Module } from '@nestjs/common';
import { MongoModule } from './mongo/mongo.module';
import { PostgresModule } from './postgres/postgres.module';
import { RedisModule } from './redis/redis.module';

@Module({
	imports: [MongoModule, PostgresModule, RedisModule],
	exports: [MongoModule],
})
export class DatabaseModule {}
