import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { BookingStatus } from '../../enums/booking.enum';

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
}

@ObjectType('Bookings')
export class BookingsDto {
	@Field(() => [BookingDto])
	list: BookingDto[];

	@Field(() => Int)
	total: number;
}
