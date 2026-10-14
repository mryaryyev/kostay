import {
	Check,
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';
import { BookingStatus } from '../../../libs/enums/booking.enum';

@Entity('bookings')
@Index('idx_availability', ['propertyId', 'checkIn', 'checkOut'])
@Check('chk_booking_dates', '"check_out" > "check_in"')
@Check('chk_booking_guests', '"guests_count" > 0')
export class Booking {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	// MongoDB properties._id (not a real foreign key)
	@Column({ name: 'property_id', type: 'varchar', length: 24 })
	propertyId: string;

	// MongoDB members._id of the member who made the booking (not a real foreign key)
	@Column({ name: 'member_id', type: 'varchar', length: 24 })
	memberId: string;

	@Column({ name: 'check_in', type: 'date' })
	checkIn: string;

	@Column({ name: 'check_out', type: 'date' })
	checkOut: string;

	@Column({ name: 'guests_count', type: 'int' })
	guestsCount: number;

	@Column({
		name: 'total_price',
		type: 'numeric',
		precision: 12,
		scale: 2,
		transformer: {
			to: (value: number) => value,
			from: (value: string) => Number(value),
		},
	})
	totalPrice: number;

	@Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
	status: BookingStatus;

	@CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
	createdAt: Date;

	@UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
	updatedAt: Date;
}
