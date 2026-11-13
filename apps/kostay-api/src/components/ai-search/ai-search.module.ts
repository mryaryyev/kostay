import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiSearchService } from './ai-search.service';
import { AiSearchResolver } from './ai-search.resolver';
import { AuthModule } from '../auth/auth.module';

@Module({
	imports: [HttpModule.register({ timeout: 5000 }), ConfigModule, AuthModule],
	providers: [AiSearchService, AiSearchResolver],
	exports: [AiSearchService],
})
export class AiSearchModule {}
