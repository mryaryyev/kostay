import { Module } from '@nestjs/common';
import { BatchController } from './batch.controller';
import { BatchService } from './batch.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import PropertySchema from '../../kostay-api/src/schemas/Property.model';
import MemberSchema from '../../kostay-api/src/schemas/Member.model';
import { Booking } from '../../kostay-api/src/database/postgres/entities/booking.entity';

@Module({
	imports: [
		ConfigModule.forRoot(),
		DatabaseModule,
		ScheduleModule.forRoot(),
		MongooseModule.forFeature([{ name: 'Property', schema: PropertySchema }]),
		MongooseModule.forFeature([{ name: 'Member', schema: MemberSchema }]),
		TypeOrmModule.forFeature([Booking]),
	],
	controllers: [BatchController],
	providers: [BatchService],
})
export class BatchModule {}
