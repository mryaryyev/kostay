import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import MemberSchema from '../../schemas/Member.model';
import PropertySchema from '../../schemas/Property.model';
import BoardArticleSchema from '../../schemas/BoardArticle.model';
import InquirySchema from '../../schemas/Inquiry.model';
import { Booking } from '../../database/postgres/entities/booking.entity';
import { AuthModule } from '../auth/auth.module';
import { DashboardResolver } from './dashboard.resolver';
import { DashboardService } from './dashboard.service';

/** Admin home numbers; reads models directly so no feature module has to export anything. */
@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: 'Member', schema: MemberSchema },
			{ name: 'Property', schema: PropertySchema },
			{ name: 'BoardArticle', schema: BoardArticleSchema },
			{ name: 'Inquiry', schema: InquirySchema },
		]),
		TypeOrmModule.forFeature([Booking]),
		AuthModule,
	],
	providers: [DashboardResolver, DashboardService],
})
export class DashboardModule {}
