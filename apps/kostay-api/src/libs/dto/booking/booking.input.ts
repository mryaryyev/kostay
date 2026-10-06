import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, Matches, Min } from 'class-validator';

@InputType()
export class BookingInput {
	@IsNotEmpty()
	@Field(() => String)
	propertyId: string;

	@Matches(/^\d{4}-\d{2}-\d{2}$/)
	@Field(() => String)
	checkIn: string; // YYYY-MM-DD

	@Matches(/^\d{4}-\d{2}-\d{2}$/)
	@Field(() => String)
	checkOut: string; // YYYY-MM-DD

	@IsInt()
	@Min(1)
	@Field(() => Int)
	guestsCount: number;
}