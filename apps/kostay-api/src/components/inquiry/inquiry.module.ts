import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import InquirySchema from '../../schemas/Inquiry.model';
import MemberSchema from '../../schemas/Member.model';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { InquiryResolver } from './inquiry.resolver';
import { InquiryService } from './inquiry.service';

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: 'Inquiry', schema: InquirySchema },
			{ name: 'Member', schema: MemberSchema },
		]),
		AuthModule,
		NotificationModule,
	],
	providers: [InquiryResolver, InquiryService],
})
export class InquiryModule {}
