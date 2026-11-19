import { IsString, Length } from 'class-validator';

export class AskInput {
	@IsString()
	@Length(1, 500)
	question: string;
}
