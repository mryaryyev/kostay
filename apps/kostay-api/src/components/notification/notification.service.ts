import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId, Types } from 'mongoose';
import { Notification, Notifications } from '../../libs/dto/notification/notification';
import {
	MessageInput,
	NotificationInput,
	NotificationInquiry,
} from '../../libs/dto/notification/notification.input';
import { Property } from '../../libs/dto/property/property';
import { Direction, Message } from '../../libs/enums/common.enum';
import {
	NotificationGroup,
	NotificationStatus,
	NotificationType,
} from '../../libs/enums/notification.enum';
import { PropertyStatus } from '../../libs/enums/property.enum';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { T } from '../../libs/types/common';

/** Compare two Mongo ids by value (ObjectId instances are never === each other). */
const sameId = (a: ObjectId, b: ObjectId) =>
	(a as unknown as Types.ObjectId).toString() ===
	(b as unknown as Types.ObjectId).toString();

const lookupAuthorData = {
	$lookup: {
		from: 'members',
		localField: 'authorId',
		foreignField: '_id',
		as: 'authorData',
	},
};

@Injectable()
export class NotificationService {
	constructor(
		@InjectModel('Notification') private readonly notificationModel: Model<Notification>,
		@InjectModel('Property') private readonly propertyModel: Model<Property>,
	) {}

	/** Used by other services. Never notifies yourself, and never breaks the caller's action. */
	public async createNotification(input: NotificationInput): Promise<void> {
		if (sameId(input.authorId, input.receiverId)) return;
		try {
			await this.notificationModel.create(input);
		} catch (err) {
			console.log('Error, createNotification:', err instanceof Error ? err.message : err);
		}
	}

	public async getNotifications(
		memberId: ObjectId,
		input: NotificationInquiry,
	): Promise<Notifications> {
		const { page, limit, search } = input;
		const match: T = { receiverId: memberId };
		if (search?.notificationStatus) match.notificationStatus = search.notificationStatus;
		if (search?.notificationType) match.notificationType = search.notificationType;

		const result: Notifications[] = await this.notificationModel
			.aggregate([
				{ $match: match },
				{ $sort: { createdAt: Direction.DESC } },
				{
					$facet: {
						list: [
							{ $skip: (page - 1) * limit },
							{ $limit: limit },
							lookupAuthorData,
							{ $unwind: { path: '$authorData', preserveNullAndEmptyArrays: true } },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		return result[0] ?? { list: [], metaCounter: [] };
	}

	public async getUnreadNotificationCount(memberId: ObjectId): Promise<number> {
		return await this.notificationModel
			.countDocuments({
				receiverId: memberId,
				notificationStatus: NotificationStatus.WAIT,
			})
			.exec();
	}

	public async markNotificationRead(
		memberId: ObjectId,
		notificationId: ObjectId,
	): Promise<Notification> {
		const result = await this.notificationModel
			.findOneAndUpdate(
				{ _id: notificationId, receiverId: memberId },
				{ notificationStatus: NotificationStatus.READ },
				{ new: true },
			)
			.exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
		return result;
	}

	public async markAllNotificationsRead(memberId: ObjectId): Promise<number> {
		const result = await this.notificationModel
			.updateMany(
				{ receiverId: memberId, notificationStatus: NotificationStatus.WAIT },
				{ notificationStatus: NotificationStatus.READ },
			)
			.exec();
		return result.modifiedCount;
	}

	/** "Contact the host" on the stay detail page: stored as a MESSAGE notification for the host. */
	public async sendMessageToHost(
		memberId: ObjectId,
		input: MessageInput,
	): Promise<Notification> {
		const propertyId = shapeIntoMongoObjectId(input.propertyId);
		const property = await this.propertyModel
			.findOne({ _id: propertyId, propertyStatus: PropertyStatus.ACTIVE })
			.lean()
			.exec();
		if (!property) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		if (sameId(property.memberId, memberId))
			throw new BadRequestException(Message.BAD_REQUEST);

		const contact = [input.senderName.trim(), input.senderPhone?.trim()]
			.filter(Boolean)
			.join(' · ');
		try {
			return await this.notificationModel.create({
				notificationType: NotificationType.MESSAGE,
				notificationGroup: NotificationGroup.PROPERTY,
				notificationTitle: `New message about ${property.propertyTitle}`,
				notificationDesc: `${input.message.trim()}\n\n— ${contact}`,
				authorId: memberId,
				receiverId: property.memberId,
				propertyId: propertyId,
			});
		} catch (err) {
			console.log('Error, sendMessageToHost:', err instanceof Error ? err.message : err);
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}
}
