import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { BookingStatus } from '../../enums/booking.enum';
import { PaymentStatus } from '../../enums/payment.enum';

/** Slim stay info shown on booking cards (from MongoDB). */
@ObjectType('BookingPropertyData')
export class BookingPropertyData {
	@Field(() => String)
	_id: string;

	@Field(() => String)
	propertyTitle: string;

	@Field(() => String, { nullable: true })
	propertyImage?: string;

	@Field(() => String)
	propertyLocation: string;

	@Field(() => String, { nullable: true })
	propertyAddress?: string;
}

/** Slim guest info shown to the host on reservation cards (from MongoDB). */
@ObjectType('BookingGuestData')
export class BookingGuestData {
	@Field(() => String)
	_id: string;

	@Field(() => String)
	memberNick: string;

	@Field(() => String, { nullable: true })
	memberFullName?: string;

	@Field(() => String, { nullable: true })
	memberImage?: string;

	@Field(() => String, { nullable: true })
	memberPhone?: string;
}

@ObjectType('Booking')
export class BookingDto {
	@Field(() => String)
	id: string;

	@Field(() => String)
	propertyId: string;

	@Field(() => String)
	memberId: string;

	@Field(() => String)
	checkIn: string;

	@Field(() => String)
	checkOut: string;

	@Field(() => Int)
	guestsCount: number;

	@Field(() => Float)
	totalPrice: number;

	@Field(() => BookingStatus)
	status: BookingStatus;

	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;

	@Field(() => PaymentStatus, { nullable: true })
	paymentStatus?: PaymentStatus;

	@Field(() => BookingPropertyData, { nullable: true })
	propertyData?: BookingPropertyData;

	@Field(() => BookingGuestData, { nullable: true })
	guestData?: BookingGuestData;
}

@ObjectType('Bookings')
export class BookingsDto {
	@Field(() => [BookingDto])
	list: BookingDto[];

	@Field(() => Int)
	total: number;
}
