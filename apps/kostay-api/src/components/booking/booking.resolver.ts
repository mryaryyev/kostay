import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ObjectId } from 'mongoose';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { BookedRange, BookingDto, BookingsDto } from '../../libs/dto/booking/booking';
import { BookAndPayInput, BookingsInquiry } from '../../libs/dto/booking/booking.input';
import { BookingService } from './booking.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { MemberType } from '../../libs/enums/member.enum';
import { RolesGuard } from '../auth/guards/roles.guard';

@Resolver()
export class BookingResolver {
	constructor(private readonly bookingService: BookingService) {}

	@UseGuards(AuthGuard)
	@Mutation(() => BookingDto)
	public async bookAndPay(
		@Args('input') input: BookAndPayInput,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<BookingDto> {
		console.log('Mutation: bookAndPay');
		return await this.bookingService.bookAndPay(memberId, input);
	}

	// Public on purpose: the stay page needs taken dates before login. Returns only date ranges.
	@Query(() => [BookedRange])
	public async getBookedDates(
		@Args('propertyId') propertyId: string,
	): Promise<BookedRange[]> {
		console.log('Query: getBookedDates');
		return await this.bookingService.getBookedDates(propertyId);
	}

	@UseGuards(AuthGuard)
	@Query(() => BookingsDto)
	public async getMyBookings(
		@Args('input') input: BookingsInquiry,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<BookingsDto> {
		console.log('Query: getMyBookings');
		return await this.bookingService.getMyBookings(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => BookingDto)
	public async cancelBooking(
		@Args('bookingId', ParseUUIDPipe) bookingId: string,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<BookingDto> {
		console.log('Mutation: cancelBooking');
		return await this.bookingService.cancelBooking(memberId, bookingId);
	}

	@Roles(MemberType.AGENT)
	@UseGuards(RolesGuard)
	@Query(() => BookingsDto)
	public async getHostBookings(
		@Args('input') input: BookingsInquiry,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<BookingsDto> {
		console.log('Query: getHostBookings');
		return await this.bookingService.getHostBookings(memberId, input);
	}
}
