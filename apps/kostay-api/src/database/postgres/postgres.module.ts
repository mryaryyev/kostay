import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Module({
	imports: [
		TypeOrmModule.forRootAsync({
			useFactory: () => ({
				type: 'postgres' as const,
				url:
					process.env.NODE_ENV === 'production'
						? process.env.POSTGRES_PROD
						: process.env.POSTGRES_DEV,
				synchronize: false,
				autoLoadEntities: true,
			}),
		}),
	],
})
export class PostgresModule {
	constructor(private readonly dataSource: DataSource) {
		if (this.dataSource.isInitialized) {
			console.log(
				`PostgreSQL is connected into ${process.env.NODE_ENV === 'production' ? 'production' : 'development'} db`,
			);
		} else {
			console.log('PostgreSQL is not connected');
		}
	}
}
