import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
} from 'typeorm';
import { PaymentStatus } from '../../../libs/enums/payment.enum';
import { Booking } from './booking.entity';

@Entity('payments')
@Index('idx_payments_booking_id', ['bookingId'])
export class Payment {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ name: 'booking_id', type: 'uuid' })
	bookingId: string;

	@ManyToOne(() => Booking, { onDelete: 'RESTRICT' })
	@JoinColumn({ name: 'booking_id' })
	booking: Booking;

	@Column({
		type: 'numeric',
		precision: 12,
		scale: 2,
		transformer: {
			to: (value: number) => value,
			from: (value: string) => Number(value),
		},
	})
	amount: number;

	@Column({ type: 'varchar', length: 3, default: 'KRW' })
	currency: string;

	@Column({ name: 'payment_method', type: 'varchar', length: 50 })
	paymentMethod: string;

	@Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
	status: PaymentStatus;

	@Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
	paidAt: Date | null;

	@CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
	createdAt: Date;
}
