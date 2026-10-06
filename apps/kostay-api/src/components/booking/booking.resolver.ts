import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ObjectId } from 'mongoose';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { BookingDto, BookingsDto } from '../../libs/dto/booking/booking';
import { BookingInput, BookingsInquiry } from '../../libs/dto/booking/booking.input';
import { BookingService } from './booking.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { MemberType } from '../../libs/enums/member.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PaymentDto } from '../../libs/dto/payment/payment';
import { PaymentInput } from '../../libs/dto/payment/payment.input';

@Resolver()
export class BookingResolver {
	constructor(private readonly bookingService: BookingService) {}

	@UseGuards(AuthGuard)
	@Mutation(() => BookingDto)
	public async createBooking(
		@Args('input') input: BookingInput,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<BookingDto> {
		console.log('Mutation: createBooking');
		return await this.bookingService.createBooking(memberId, input);
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

	@Roles(MemberType.AGENT)
	@UseGuards(RolesGuard)
	@Mutation(() => BookingDto)
	public async confirmBooking(
		@Args('bookingId', ParseUUIDPipe) bookingId: string,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<BookingDto> {
		console.log('Mutation: confirmBooking');
		return await this.bookingService.confirmBooking(memberId, bookingId);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => PaymentDto)
	public async createPayment(
		@Args('input') input: PaymentInput,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<PaymentDto> {
		console.log('Mutation: createPayment');
		return await this.bookingService.createPayment(memberId, input);
	}
}
