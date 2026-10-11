import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsOptional, Matches, MaxLength, Min } from 'class-validator';
import { BookingStatus } from '../../enums/booking.enum';

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

/** Instant Book: dates + guests + how the guest pays, sent once from the checkout page. */
@InputType()
export class BookAndPayInput extends BookingInput {
	@IsNotEmpty()
	@MaxLength(50)
	@Field(() => String)
	paymentMethod: string; // e.g. CARD
}

@InputType()
export class BookingsInquiry {
	@IsInt()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsInt()
	@Min(1)
	@Field(() => Int)
	limit: number;

	@IsOptional()
	@Field(() => BookingStatus, { nullable: true })
	status?: BookingStatus;
}

/** Admin booking list: optional status and check-in range (YYYY-MM-DD). */
@InputType()
export class AllBookingsInquiry extends BookingsInquiry {
	@IsOptional()
	@Matches(/^\d{4}-\d{2}-\d{2}$/)
	@Field(() => String, { nullable: true })
	checkInFrom?: string;

	@IsOptional()
	@Matches(/^\d{4}-\d{2}-\d{2}$/)
	@Field(() => String, { nullable: true })
	checkInTo?: string;
}
