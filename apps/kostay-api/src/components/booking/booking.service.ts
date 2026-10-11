import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import moment from 'moment';
import { Model, ObjectId, Types } from 'mongoose';
import { DataSource, FindOptionsWhere, In, Repository } from 'typeorm';
import { Booking } from '../../database/postgres/entities/booking.entity';
import {
	BookingDto,
	BookingGuestData,
	BookingPropertyData,
	BookingsDto,
} from '../../libs/dto/booking/booking';
import { Member } from '../../libs/dto/member/member';
import { BookingInput, BookingsInquiry } from '../../libs/dto/booking/booking.input';
import { Property } from '../../libs/dto/property/property';
import { Message } from '../../libs/enums/common.enum';
import { BookingStatus } from '../../libs/enums/booking.enum';
import { PropertyStatus } from '../../libs/enums/property.enum';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { Payment } from '../../database/postgres/entities/payment.entity';
import { PaymentStatus } from '../../libs/enums/payment.enum';
import { PaymentInput } from '../../libs/dto/payment/payment.input';
import { PaymentDto } from '../../libs/dto/payment/payment';

@Injectable()
export class BookingService {
	constructor(
		@InjectRepository(Booking) private readonly bookingRepository: Repository<Booking>,
		@InjectModel('Property') private readonly propertyModel: Model<Property>,
		@InjectModel('Member') private readonly memberModel: Model<Member>,
		private readonly dataSource: DataSource,
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
		try {
			return await this.bookingRepository.save(booking);
		} catch (err) {
			// excl_booking_overlap: another request booked the same dates a moment earlier.
			if ((err as { code?: string })?.code === '23P01')
				throw new BadRequestException('Dates are not available');
			throw err;
		}
	}

	public async getMyBookings(
		memberId: ObjectId,
		input: BookingsInquiry,
	): Promise<BookingsDto> {
		const guestId = (memberId as unknown as Types.ObjectId).toString();
		return await this.findBookings(
			{ memberId: guestId, ...(input.status ? { status: input.status } : {}) },
			input,
		);
	}

	public async getHostBookings(
		memberId: ObjectId,
		input: BookingsInquiry,
	): Promise<BookingsDto> {
		const properties = await this.propertyModel
			.find({ memberId })
			.select('_id')
			.lean()
			.exec();
		if (!properties.length) return { list: [], total: 0 };

		const propertyIds = properties.map((p) =>
			(p._id as unknown as Types.ObjectId).toString(),
		);
		return await this.findBookings(
			{ propertyId: In(propertyIds), ...(input.status ? { status: input.status } : {}) },
			input,
		);
	}

	public async cancelBooking(memberId: ObjectId, bookingId: string): Promise<BookingDto> {
		const guestId = (memberId as unknown as Types.ObjectId).toString();

		return await this.dataSource.transaction(async (manager) => {
			const booking = await manager.findOne(Booking, {
				where: { id: bookingId, memberId: guestId },
				lock: { mode: 'pessimistic_write' },
			});
			if (!booking) throw new BadRequestException(Message.NO_DATA_FOUND);
			if (![BookingStatus.PENDING, BookingStatus.CONFIRMED].includes(booking.status))
				throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);

			// full refund if the booking was already paid
			await manager.update(
				Payment,
				{ bookingId: booking.id, status: PaymentStatus.SUCCEEDED },
				{ status: PaymentStatus.REFUNDED },
			);

			booking.status = BookingStatus.CANCELLED;
			return await manager.save(booking);
		});
	}

	public async confirmBooking(
		memberId: ObjectId,
		bookingId: string,
	): Promise<BookingDto> {
		const booking = await this.findPendingHostBooking(memberId, bookingId);
		booking.status = BookingStatus.CONFIRMED;
		return await this.bookingRepository.save(booking);
	}

	/** Host turns down a request. Only PENDING bookings, so no payment exists yet and nothing to refund. */
	public async declineBooking(
		memberId: ObjectId,
		bookingId: string,
	): Promise<BookingDto> {
		const booking = await this.findPendingHostBooking(memberId, bookingId);
		booking.status = BookingStatus.CANCELLED;
		return await this.bookingRepository.save(booking);
	}

	/** A PENDING booking on one of this host's stays; otherwise the request is not allowed. */
	private async findPendingHostBooking(
		memberId: ObjectId,
		bookingId: string,
	): Promise<Booking> {
		const booking = await this.bookingRepository.findOne({ where: { id: bookingId } });
		if (!booking) throw new BadRequestException(Message.NO_DATA_FOUND);
		if (booking.status !== BookingStatus.PENDING)
			throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);

		// only the host of this property can confirm or decline
		const property = await this.propertyModel
			.findOne({ _id: shapeIntoMongoObjectId(booking.propertyId), memberId })
			.lean()
			.exec();
		if (!property) throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);

		return booking;
	}

	private async findBookings(
		where: FindOptionsWhere<Booking>,
		input: BookingsInquiry,
	): Promise<BookingsDto> {
		const [list, total] = await this.bookingRepository.findAndCount({
			where,
			order: { createdAt: 'DESC' },
			skip: (input.page - 1) * input.limit,
			take: input.limit,
		});
		const withPayments = await this.attachPaymentStatus(list);
		return { list: await this.attachDisplayData(withPayments), total };
	}

	public async createPayment(
		memberId: ObjectId,
		input: PaymentInput,
	): Promise<PaymentDto> {
		const guestId = (memberId as unknown as Types.ObjectId).toString();

		return await this.dataSource.transaction(async (manager) => {
			const booking = await manager.findOne(Booking, {
				where: { id: input.bookingId, memberId: guestId },
				lock: { mode: 'pessimistic_write' },
			});
			if (!booking) throw new BadRequestException(Message.NO_DATA_FOUND);
			if (booking.status !== BookingStatus.CONFIRMED)
				throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);

			const alreadyPaid = await manager.exists(Payment, {
				where: { bookingId: booking.id, status: PaymentStatus.SUCCEEDED },
			});
			if (alreadyPaid) throw new BadRequestException('Booking is already paid');

			const payment = manager.create(Payment, {
				bookingId: booking.id,
				amount: booking.totalPrice, // always from the server, never from the client
				paymentMethod: input.paymentMethod,
				status: PaymentStatus.SUCCEEDED, // simulated: no real payment gateway yet
				paidAt: new Date(),
			});
			return await manager.save(payment);
		});
	}

	private async attachPaymentStatus(bookings: Booking[]): Promise<BookingDto[]> {
		if (!bookings.length) return [];

		const payments = await this.dataSource.getRepository(Payment).find({
			where: { bookingId: In(bookings.map((b) => b.id)) },
			order: { createdAt: 'ASC' },
		});
		const latest = new Map<string, PaymentStatus>();
		payments.forEach((p) => latest.set(p.bookingId, p.status)); // newest overwrites older

		return bookings.map((b) => ({ ...b, paymentStatus: latest.get(b.id) }));
	}

	/** Booking rows live in PostgreSQL; stay and guest details come from MongoDB in one query each. */
	private async attachDisplayData(bookings: BookingDto[]): Promise<BookingDto[]> {
		if (!bookings.length) return [];

		const propertyIds = [...new Set(bookings.map((b) => b.propertyId))];
		const guestIds = [...new Set(bookings.map((b) => b.memberId))];
		const [properties, guests] = await Promise.all([
			this.propertyModel
				.find({ _id: { $in: propertyIds.map(shapeIntoMongoObjectId) } })
				.select('propertyTitle propertyImages propertyLocation propertyAddress')
				.lean()
				.exec(),
			this.memberModel
				.find({ _id: { $in: guestIds.map(shapeIntoMongoObjectId) } })
				.select('memberNick memberFullName memberImage memberPhone')
				.lean()
				.exec(),
		]);

		const propertyMap = new Map<string, BookingPropertyData>(
			properties.map((p) => [
				String(p._id),
				{
					_id: String(p._id),
					propertyTitle: p.propertyTitle,
					propertyImage: p.propertyImages?.[0],
					propertyLocation: p.propertyLocation,
					propertyAddress: p.propertyAddress,
				},
			]),
		);
		const guestMap = new Map<string, BookingGuestData>(
			guests.map((m) => [
				String(m._id),
				{
					_id: String(m._id),
					memberNick: m.memberNick,
					memberFullName: m.memberFullName,
					memberImage: m.memberImage,
					memberPhone: m.memberPhone,
				},
			]),
		);

		return bookings.map((b) => ({
			...b,
			propertyData: propertyMap.get(b.propertyId),
			guestData: guestMap.get(b.memberId),
		}));
	}
}
