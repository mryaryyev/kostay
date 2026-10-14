import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationResolver } from './notification.resolver';
import { NotificationService } from './notification.service';
import NotificationSchema from '../../schemas/Notification.model';
import PropertySchema from '../../schemas/Property.model';
import { AuthModule } from '../auth/auth.module';

@Module({
	imports: [
		// Property is read directly (not via PropertyModule) so PropertyModule can import this module without a cycle.
		MongooseModule.forFeature([
			{ name: 'Notification', schema: NotificationSchema },
			{ name: 'Property', schema: PropertySchema },
		]),
		AuthModule,
	],
	providers: [NotificationResolver, NotificationService],
	exports: [NotificationService],
})
export class NotificationModule {}
