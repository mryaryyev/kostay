import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ObjectId } from 'mongoose';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { BookingDto } from '../../libs/dto/booking/booking';
import { BookingInput } from '../../libs/dto/booking/booking.input';
import { BookingService } from './booking.service';

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
}
