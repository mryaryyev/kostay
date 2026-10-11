import { Field, InputType, Int } from '@nestjs/graphql';
import { IsIn, IsNotEmpty, IsOptional, Length, Min } from 'class-validator';
import { ObjectId } from 'mongoose';
import { NotificationGroup, NotificationStatus, NotificationType } from '../../enums/notification.enum';

/** Internal only (called from other services), not exposed as a GraphQL input. */
export interface NotificationInput {
	notificationType: NotificationType;
	notificationGroup: NotificationGroup;
	notificationTitle: string;
	notificationDesc?: string;
	authorId: ObjectId;
	receiverId: ObjectId;
	propertyId?: ObjectId;
	articleId?: ObjectId;
}

@InputType()
class NotificationSearch {
	@IsOptional()
	@IsIn([NotificationStatus.WAIT, NotificationStatus.READ])
	@Field(() => NotificationStatus, { nullable: true })
	notificationStatus?: NotificationStatus;

	@IsOptional()
	@IsIn(Object.values(NotificationType))
	@Field(() => NotificationType, { nullable: true })
	notificationType?: NotificationType;
}

@InputType()
export class NotificationInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;

	@IsOptional()
	@Field(() => NotificationSearch, { nullable: true })
	search?: NotificationSearch;
}

@InputType()
export class MessageInput {
	@IsNotEmpty()
	@Field(() => String)
	propertyId: string;

	@IsNotEmpty()
	@Length(1, 100)
	@Field(() => String)
	senderName: string;

	@IsOptional()
	@Length(0, 30)
	@Field(() => String, { nullable: true })
	senderPhone?: string;

	@IsNotEmpty()
	@Length(1, 500)
	@Field(() => String)
	message: string;
}
