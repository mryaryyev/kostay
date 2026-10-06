import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import moment from 'moment';
import { Model, ObjectId, Types } from 'mongoose';
import { Repository } from 'typeorm';
import { Booking } from '../../database/postgres/entities/booking.entity';
import { BookingDto } from '../../libs/dto/booking/booking';
import { BookingInput } from '../../libs/dto/booking/booking.input';
import { Property } from '../../libs/dto/property/property';
import { Message } from '../../libs/enums/common.enum';
import { BookingStatus } from '../../libs/enums/booking.enum';
import { PropertyStatus } from '../../libs/enums/property.enum';
import { shapeIntoMongoObjectId } from '../../libs/config';

@Injectable()
export class BookingService {
	constructor(
		@InjectRepository(Booking) private readonly bookingRepository: Repository<Booking>,
		@InjectModel('Property') private readonly propertyModel: Model<Property>,
	) {}

	public async createBooking(
		memberId: ObjectId,
		input: BookingInput,
	): Promise<BookingDto> {
		const { propertyId, checkIn, checkOut, guestsCount } = input;

		// 1. dates
		const start = moment(checkIn, 'YYYY-MM-DD', true);
		const end = moment(checkOut, 'YYYY-MM-DD', true);
		if (!start.isValid() || !end.isValid()) throw new BadRequestException('Invalid date');
		if (start.isBefore(moment().startOf('day')))
			throw new BadRequestException('Check-in cannot be in the past');
		const nights = end.diff(start, 'days');
		if (nights < 1) throw new BadRequestException('Check-out must be after check-in');

		// 2. property (MongoDB)
		const property = await this.propertyModel
			.findOne({
				_id: shapeIntoMongoObjectId(propertyId),
				propertyStatus: PropertyStatus.ACTIVE,
			})
			.lean()
			.exec();
		if (!property) throw new BadRequestException(Message.NO_DATA_FOUND);
		const guestId = (memberId as unknown as Types.ObjectId).toString();
		const hostId = (property.memberId as unknown as Types.ObjectId).toString();
		const propertyIdStr = (property._id as unknown as Types.ObjectId).toString();
		if (hostId === guestId) throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);
		if (guestsCount > property.maxGuests)
			throw new BadRequestException('Too many guests');

		// 3. availability (PostgreSQL)
		const hasConflict = await this.bookingRepository
			.createQueryBuilder('b')
			.where('b.propertyId = :propertyId', { propertyId: propertyIdStr })
			.andWhere('b.status IN (:...statuses)', {
				statuses: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
			})
			.andWhere('b.checkIn < :checkOut AND b.checkOut > :checkIn', { checkIn, checkOut })
			.getExists();
		if (hasConflict) throw new BadRequestException('Dates are not available');

		// 4. save
		const booking = this.bookingRepository.create({
			propertyId: propertyIdStr,
			memberId: guestId,
			checkIn,
			checkOut,
			guestsCount,
			totalPrice: nights * property.pricePerNight,
		});
		return await this.bookingRepository.save(booking);
	}
}
