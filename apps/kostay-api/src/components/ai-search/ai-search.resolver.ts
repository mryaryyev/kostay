import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AiSearchService } from './ai-search.service';
import { AiSearchMetrics } from '../../libs/dto/ai-search/ai-search-metrics';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MemberType } from '../../libs/enums/member.enum';

@Resolver()
export class AiSearchResolver {
	constructor(private readonly aiSearchService: AiSearchService) {}

	/** Admin monitoring page: Smart Search volume, latency, cost and fallbacks. */
	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Query(() => AiSearchMetrics)
	public async getAiSearchMetrics(
		@Args('days', { type: () => Int, defaultValue: 7 }) days: number,
	): Promise<AiSearchMetrics> {
		console.log('Query: getAiSearchMetrics');
		return await this.aiSearchService.getMetrics(Math.min(Math.max(days, 1), 90));
	}
}
