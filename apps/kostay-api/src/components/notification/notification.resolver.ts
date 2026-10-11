import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ObjectId } from 'mongoose';
import { NotificationService } from './notification.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { Notification, Notifications } from '../../libs/dto/notification/notification';
import { MessageInput, NotificationInquiry } from '../../libs/dto/notification/notification.input';
import { shapeIntoMongoObjectId } from '../../libs/config';

@Resolver()
export class NotificationResolver {
	constructor(private readonly notificationService: NotificationService) {}

	@UseGuards(AuthGuard)
	@Query(() => Notifications)
	public async getNotifications(
		@Args('input') input: NotificationInquiry,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Notifications> {
		console.log('Query: getNotifications');
		return await this.notificationService.getNotifications(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Query(() => Int)
	public async getUnreadNotificationCount(@AuthMember('_id') memberId: ObjectId): Promise<number> {
		console.log('Query: getUnreadNotificationCount');
		return await this.notificationService.getUnreadNotificationCount(memberId);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Notification)
	public async markNotificationRead(
		@Args('input') input: string,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Notification> {
		console.log('Mutation: markNotificationRead');
		return await this.notificationService.markNotificationRead(memberId, shapeIntoMongoObjectId(input));
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Int)
	public async markAllNotificationsRead(@AuthMember('_id') memberId: ObjectId): Promise<number> {
		console.log('Mutation: markAllNotificationsRead');
		return await this.notificationService.markAllNotificationsRead(memberId);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Notification)
	public async sendMessageToHost(
		@Args('input') input: MessageInput,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Notification> {
		console.log('Mutation: sendMessageToHost');
		return await this.notificationService.sendMessageToHost(memberId, input);
	}
}
