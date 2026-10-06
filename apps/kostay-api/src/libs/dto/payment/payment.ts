import { Field, Float, ObjectType } from '@nestjs/graphql';
import { PaymentStatus } from '../../enums/payment.enum';

@ObjectType('Payment')
export class PaymentDto {
	@Field(() => String)
	id: string;

	@Field(() => String)
	bookingId: string;

	@Field(() => Float)
	amount: number;

	@Field(() => String)
	currency: string;

	@Field(() => String)
	paymentMethod: string;

	@Field(() => PaymentStatus)
	status: PaymentStatus;

	@Field(() => Date, { nullable: true })
	paidAt: Date | null;

	@Field(() => Date)
	createdAt: Date;
}
