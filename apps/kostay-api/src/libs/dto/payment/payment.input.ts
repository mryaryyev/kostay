import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID, MaxLength } from 'class-validator';

@InputType()
export class PaymentInput {
	@IsUUID()
	@Field(() => String)
	bookingId: string;

	@IsNotEmpty()
	@MaxLength(50)
	@Field(() => String)
	paymentMethod: string; // e.g. CARD
}