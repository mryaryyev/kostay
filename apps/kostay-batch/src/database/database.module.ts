import { Module } from '@nestjs/common';
import { InjectConnection, MongooseModule } from '@nestjs/mongoose';
import { Connection, ConnectionStates } from 'mongoose';
import { PostgresModule } from '../../../kostay-api/src/database/postgres/postgres.module';

@Module({
	imports: [
		MongooseModule.forRootAsync({
			useFactory: () => ({
				uri:
					process.env.NODE_ENV === 'production'
						? process.env.MONGO_PROD
						: process.env.MONGO_DEV,
			}),
		}),
		// Bookings and payments live in PostgreSQL; same connection settings as the api.
		PostgresModule,
	],
	exports: [MongooseModule],
})
export class DatabaseModule {
	constructor(@InjectConnection() private readonly connection: Connection) {
		if (connection.readyState === ConnectionStates.connected) {
			console.log(
				`MongoDB is connected into ${process.env.NODE_ENV === 'production' ? 'production' : 'development'} db`,
			);
		} else {
			console.log('DB is not connected');
		}
	}
}
