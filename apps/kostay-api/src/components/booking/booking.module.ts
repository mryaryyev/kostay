import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../../database/postgres/entities/booking.entity';
import { Payment } from '../../database/postgres/entities/payment.entity';

@Module({
	imports: [TypeOrmModule.forFeature([Booking, Payment])],
	exports: [TypeOrmModule],
})
export class BookingModule {}
