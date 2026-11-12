import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiSearchService } from './ai-search.service';

@Module({
	imports: [HttpModule.register({ timeout: 5000 }), ConfigModule],
	providers: [AiSearchService],
	exports: [AiSearchService],
})
export class AiSearchModule {}
