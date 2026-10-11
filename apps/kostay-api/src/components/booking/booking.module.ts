import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../../database/postgres/entities/booking.entity';
import { Payment } from '../../database/postgres/entities/payment.entity';
import { BookingService } from './booking.service';
import { MongooseModule } from '@nestjs/mongoose';
import { BookingResolver } from './booking.resolver';
import PropertySchema from '../../schemas/Property.model';
import MemberSchema from '../../schemas/Member.model';
import { AuthModule } from '../auth/auth.module';

@Module({
	imports: [
		TypeOrmModule.forFeature([Booking, Payment]),
		MongooseModule.forFeature([
			{ name: 'Property', schema: PropertySchema },
			{ name: 'Member', schema: MemberSchema },
		]),
		AuthModule,
	],
	exports: [TypeOrmModule],
	providers: [BookingService, BookingResolver],
})
export class BookingModule {}
