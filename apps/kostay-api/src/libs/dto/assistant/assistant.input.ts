import { ArrayMaxSize, IsArray, IsOptional, IsString, Length } from 'class-validator';

/** Earlier questions the AI service reads to understand a follow-up. */
export const MAX_HISTORY = 3;

export class AskInput {
	@IsString()
	@Length(1, 500)
	question: string;

	/**
	 * The visitor's earlier questions in this conversation, oldest first, so a follow-up
	 * ("in Incheon") can be understood. Questions only: an answer sent back by a browser
	 * could be forged. Nothing is stored; the browser sends them with each question.
	 */
	@IsOptional()
	@IsArray()
	@ArrayMaxSize(MAX_HISTORY)
	@IsString({ each: true })
	@Length(1, 500, { each: true })
	history?: string[];
}
