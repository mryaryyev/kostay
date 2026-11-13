import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AiSearchDailyMetrics {
	/** YYYY-MM-DD in Seoul time. */
	@Field(() => String)
	date: string;

	/** Searches the AI service answered. */
	@Field(() => Int)
	searches: number;

	@Field(() => Int)
	p95Ms: number;

	@Field(() => Float)
	costUsd: number;

	/** Smart Search requests NestJS received, and how many fell back to keyword search. */
	@Field(() => Int)
	requests: number;

	@Field(() => Int)
	fallbacks: number;
}

@ObjectType()
export class AiSearchRelaxedField {
	@Field(() => String)
	field: string;

	@Field(() => Int)
	count: number;
}

/** Admin monitoring page: Smart Search health over the last `days` days. */
@ObjectType()
export class AiSearchMetrics {
	@Field(() => Int)
	days: number;

	/** False when the AI service could not be reached; its numbers are then 0. */
	@Field(() => Boolean)
	available: boolean;

	@Field(() => Int)
	searches: number;

	@Field(() => Int)
	p50Ms: number;

	@Field(() => Int)
	p95Ms: number;

	@Field(() => Int)
	avgLlmMs: number;

	@Field(() => Int)
	avgEmbedMs: number;

	@Field(() => Int)
	avgSearchMs: number;

	@Field(() => Int)
	avgRerankMs: number;

	@Field(() => Float)
	costUsd: number;

	@Field(() => Float)
	costPer1kUsd: number;

	@Field(() => Int)
	noResults: number;

	@Field(() => Int)
	relaxed: number;

	@Field(() => [AiSearchRelaxedField])
	relaxedFields: AiSearchRelaxedField[];

	/** The LLM was asked for filters but answered nothing (timeout, API error). */
	@Field(() => Int)
	llmFailed: number;

	@Field(() => Int)
	requests: number;

	@Field(() => Int)
	fallbacks: number;

	@Field(() => [AiSearchDailyMetrics])
	daily: AiSearchDailyMetrics[];
}
