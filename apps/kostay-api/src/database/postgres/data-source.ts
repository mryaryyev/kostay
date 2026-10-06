import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { Payment } from './entities/payment.entity';

export default new DataSource({
	type: 'postgres',
	url:
		process.env.NODE_ENV === 'production'
			? process.env.POSTGRES_PROD
			: process.env.POSTGRES_DEV,
	entities: [Booking, Payment],
	migrations: [__dirname + '/migrations/*.{ts,js}'],
	synchronize: false,
});
