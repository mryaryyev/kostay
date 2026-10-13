import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../../database/postgres/entities/booking.entity';
import { BookingStatus } from '../../libs/enums/booking.enum';
import { Model, ObjectId } from 'mongoose';
import { Properties, Property } from '../../libs/dto/property/property';
import { Direction, Message } from '../../libs/enums/common.enum';
import {
	AgentPropertiesInquiry,
	AllPropertiesInquiry,
	OrdinaryInquiry,
	PropertiesInquiry,
	PropertyInput,
} from '../../libs/dto/property/property.input';
import { MemberService } from '../member/member.service';
import { StatisticModifier, T } from '../../libs/types/common';
import { PropertyStatus } from '../../libs/enums/property.enum';
import { ViewGroup } from '../../libs/enums/view.enum';
import { ViewService } from '../view/view.service';
import { PropertyUpdate } from '../../libs/dto/property/property.update';
import moment from 'moment';
import {
	lookupAuthMemberLiked,
	lookupMember,
	shapeIntoMongoObjectId,
} from '../../libs/config';
import { LikeService } from '../like/like.service';
import { LikeInput } from '../../libs/dto/like/like.input';
import { LikeGroup } from '../../libs/enums/like.enum';

import { NotificationService } from '../notification/notification.service';
import { NotificationGroup, NotificationType } from '../../libs/enums/notification.enum';
import { Member } from '../../libs/dto/member/member';
import { MemberStatus, MemberType } from '../../libs/enums/member.enum';
@Injectable()
export class PropertyService {
	constructor(
		@InjectModel('Property') private readonly propertyModel: Model<Property>,
		@InjectModel('Member') private readonly memberModel: Model<Member>,
		private memberService: MemberService,
		private viewService: ViewService,
		private likeService: LikeService,
		private notificationService: NotificationService,
		@InjectRepository(Booking) private readonly bookingRepository: Repository<Booking>,
	) {}

	public async createProperty(input: PropertyInput): Promise<Property> {
		try {
			// New stays wait for admin approval before they appear in search.
			// memberProperties only counts public (ACTIVE) stays, so it changes on approval, not here.
			const result = await this.propertyModel.create({ ...input, propertyStatus: PropertyStatus.PENDING });
			await this.notifyAdmins(result);
			return result;
		} catch (err) {
			console.log('Error, Service.model:', err instanceof Error ? err.message : err);
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	/** Every active admin is told that a stay is waiting for review. */
	private async notifyAdmins(property: Property): Promise<void> {
		const admins = await this.memberModel
			.find({ memberType: MemberType.ADMIN, memberStatus: MemberStatus.ACTIVE })
			.select('_id')
			.lean()
			.exec();
		await Promise.all(
			admins.map((admin) =>
				this.notificationService.createNotification({
					notificationType: NotificationType.LISTING,
					notificationGroup: NotificationGroup.PROPERTY,
					notificationTitle: 'submitted a stay for review',
					notificationDesc: property.propertyTitle,
					authorId: property.memberId,
					receiverId: admin._id,
					propertyId: property._id,
				}),
			),
		);
	}

	public async getProperty(
		memberId: ObjectId,
		propertyId: ObjectId,
		memberType?: MemberType,
	): Promise<Property> {
		// Everyone sees ACTIVE stays. Admins (to review) and the owner (to preview) also see pending / paused ones.
		const targetProperty: Property | null = await this.propertyModel
			.findOne({ _id: propertyId, propertyStatus: { $ne: PropertyStatus.DELETE } })
			.lean()
			.exec();
		const isOwner = Boolean(memberId) && String(targetProperty?.memberId) === String(memberId);
		const canSeePrivate = memberType === MemberType.ADMIN || isOwner;
		if (!targetProperty || (targetProperty.propertyStatus !== PropertyStatus.ACTIVE && !canSeePrivate))
			throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		if (memberId && targetProperty.propertyStatus === PropertyStatus.ACTIVE) {
			// record view
			const viewInput = {
				memberId: memberId,
				viewRefId: propertyId,
				viewGroup: ViewGroup.PROPERTY,
			};
			const newView = await this.viewService.recordView(viewInput);
			if (newView) {
				// increase propertyViews
				await this.propertyStatsEditor({
					_id: propertyId,
					targetKey: 'propertyViews',
					modifier: 1,
				});
				targetProperty.propertyViews++;
			}
			// meLiked
			const likeInput = {
				memberId: memberId,
				likeRefId: propertyId,
				likeGroup: LikeGroup.PROPERTY,
			};
			targetProperty.meLiked = await this.likeService.checkLikeExistence(likeInput);
		}

		targetProperty.memberData = await this.memberService.getMember(
			null,
			targetProperty.memberId,
		);
		return targetProperty;
	}

	public async updateProperty(
		memberId: ObjectId,
		input: PropertyUpdate,
	): Promise<Property> {
		const { propertyStatus } = input;
		// Only an admin can publish a stay: hosts never set PENDING, and a pending stay
		// can be edited or deleted but not switched to ACTIVE / INACTIVE.
		if (propertyStatus === PropertyStatus.PENDING) throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);
		const togglesVisibility =
			propertyStatus === PropertyStatus.ACTIVE || propertyStatus === PropertyStatus.INACTIVE;
		const deletedAt =
			propertyStatus === PropertyStatus.DELETE ? moment().toDate() : undefined;
		const search: T = {
			_id: input._id,
			memberId: memberId,
			propertyStatus: {
				$in: togglesVisibility
					? [PropertyStatus.ACTIVE, PropertyStatus.INACTIVE]
					: [PropertyStatus.PENDING, PropertyStatus.ACTIVE, PropertyStatus.INACTIVE],
			},
		};

		const result = await this.propertyModel
			.findOneAndUpdate(
				search,
				{ ...input, ...(deletedAt ? { deletedAt } : {}) },
				{
					new: true,
				},
			)
			.exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		if (propertyStatus) await this.syncHostStayCount(memberId);
		return result;
	}

	/** memberProperties = the host's public (ACTIVE) stays, so the profile count matches the visible list. */
	private async syncHostStayCount(memberId: ObjectId): Promise<void> {
		const activeStays = await this.propertyModel
			.countDocuments({ memberId, propertyStatus: PropertyStatus.ACTIVE })
			.exec();
		await this.memberModel.updateOne({ _id: memberId }, { memberProperties: activeStays }).exec();
	}

	public async getProperties(
		memberId: ObjectId,
		input: PropertiesInquiry,
	): Promise<Properties> {
		const match: T = { propertyStatus: PropertyStatus.ACTIVE };
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		this.shapeMatchQuery(match, input);
		const { checkIn, checkOut } = input.search;
		if (checkIn && checkOut && checkOut > checkIn) {
			const unavailableIds = await this.getUnavailablePropertyIds(checkIn, checkOut);
			if (unavailableIds.length)
				match._id = { $nin: unavailableIds.map(shapeIntoMongoObjectId) };
		}
		console.log('match:', match);

		const result: Properties[] = await this.propertyModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							// meLiked
							lookupAuthMemberLiked(memberId),
							lookupMember,
							{ $unwind: '$memberData' }, // [memberData] => memberData
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		return result[0];
	}

	/** PostgreSQL: stays with an active booking overlapping the dates (same rule as bookAndPay, check-out day stays free). */
	private async getUnavailablePropertyIds(
		checkIn: string,
		checkOut: string,
	): Promise<string[]> {
		const rows: { propertyId: string }[] = await this.bookingRepository
			.createQueryBuilder('b')
			.select('DISTINCT b.propertyId', 'propertyId')
			.where('b.status IN (:...statuses)', {
				statuses: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
			})
			.andWhere('b.checkIn < :checkOut AND b.checkOut > :checkIn', { checkIn, checkOut })
			.getRawMany();
		return rows.map((row) => row.propertyId);
	}

	private shapeMatchQuery(match: T, input: PropertiesInquiry): void {
		const {
			memberId,
			locationList,
			roomsList,
			bedsList,
			typeList,
			pricesRange,
			squaresRange,
			guestsCount,
			text,
		} = input.search;
		if (memberId) match.memberId = shapeIntoMongoObjectId(memberId);
		if (locationList && locationList.length)
			match.propertyLocation = { $in: locationList };
		if (roomsList && roomsList.length) match.propertyRooms = { $in: roomsList };
		if (bedsList && bedsList.length) match.propertyBeds = { $in: bedsList };
		if (typeList && typeList.length) match.propertyType = { $in: typeList };

		if (pricesRange)
			match.pricePerNight = { $gte: pricesRange.start, $lte: pricesRange.end };
		if (squaresRange)
			match.propertySquare = { $gte: squaresRange.start, $lte: squaresRange.end };

		if (text) match.propertyTitle = { $regex: new RegExp(text, 'i') };
		if (guestsCount) match.maxGuests = { $gte: guestsCount };
	}

	public async getFavorites(
		memberId: ObjectId,
		input: OrdinaryInquiry,
	): Promise<Properties> {
		return await this.likeService.getFavoriteProperties(memberId, input);
	}

	public async getVisited(
		memberId: ObjectId,
		input: OrdinaryInquiry,
	): Promise<Properties> {
		return await this.viewService.getVisitedProperties(memberId, input);
	}

	public async getAgentProperties(
		memberId: ObjectId,
		input: AgentPropertiesInquiry,
	): Promise<Properties> {
		const { propertyStatus } = input.search;
		if (propertyStatus === PropertyStatus.DELETE)
			throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);

		const match: T = {
			memberId: memberId,
			propertyStatus: propertyStatus ?? { $ne: PropertyStatus.DELETE },
		};
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		const result: Properties[] = await this.propertyModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							lookupMember,
							{ $unwind: '$memberData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		return result[0];
	}

	public async likeTargetProperty(
		memberId: ObjectId,
		likeRefId: ObjectId,
	): Promise<Property> {
		const target = await this.propertyModel
			.findOne({ _id: likeRefId, propertyStatus: PropertyStatus.ACTIVE })
			.exec();
		if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		const input: LikeInput = {
			memberId: memberId,
			likeRefId: likeRefId,
			likeGroup: LikeGroup.PROPERTY,
		};

		// LIKE TOGGLE via Like modules
		const modifier: number = await this.likeService.toggleLike(input);
		// Notify the host only when the like is added, not when it is removed.
		if (modifier === 1) {
			await this.notificationService.createNotification({
				notificationType: NotificationType.LIKE,
				notificationGroup: NotificationGroup.PROPERTY,
				notificationTitle: 'liked your stay',
				notificationDesc: target.propertyTitle,
				authorId: memberId,
				receiverId: target.memberId,
				propertyId: likeRefId,
			});
		}
		const result = await this.propertyStatsEditor({
			_id: likeRefId,
			targetKey: 'propertyLikes',
			modifier: modifier,
		});

		if (!result) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);
		return result;
	}

	public async getAllPropertiesByAdmin(input: AllPropertiesInquiry): Promise<Properties> {
		const { propertyStatus, propertyLocationList } = input.search;
		const match: T = {};
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		if (propertyStatus) match.propertyStatus = propertyStatus;
		if (propertyLocationList) match.propertyLocation = { $in: propertyLocationList };

		const result: Properties[] = await this.propertyModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit }, // [property1, property2]
							lookupMember, // memberData: [memberDataValue]
							{ $unwind: '$memberData' }, // memberData: memberDataValue
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		return result[0];
	}

	public async updatePropertyByAdmin(adminId: ObjectId, input: PropertyUpdate): Promise<Property> {
		const { propertyStatus } = input;
		const deletedAt =
			propertyStatus === PropertyStatus.DELETE ? moment().toDate() : undefined;
		const search: T = {
			_id: input._id,
			propertyStatus: { $in: [PropertyStatus.PENDING, PropertyStatus.ACTIVE, PropertyStatus.INACTIVE] },
		};

		// new: false returns the stay as it was, so a decision on a pending stay can be detected.
		const previous = await this.propertyModel
			.findOneAndUpdate(search, { ...input, ...(deletedAt ? { deletedAt } : {}) }, { new: false })
			.exec();
		if (!previous) throw new InternalServerErrorException(Message.UPDATE_FAILED);
		const result = (await this.propertyModel.findById(previous._id).exec()) as Property;

		// Approve (PENDING → ACTIVE) or reject (PENDING → DELETE): tell the host.
		if (previous.propertyStatus === PropertyStatus.PENDING && (propertyStatus === PropertyStatus.ACTIVE || deletedAt)) {
			await this.notificationService.createNotification({
				notificationType: NotificationType.LISTING,
				notificationGroup: NotificationGroup.PROPERTY,
				notificationTitle: deletedAt ? 'Did not approve your stay' : 'Approved your stay',
				notificationDesc: previous.propertyTitle,
				authorId: adminId,
				receiverId: previous.memberId,
				propertyId: previous._id,
			});
		}

		if (propertyStatus) await this.syncHostStayCount(result.memberId);
		return result;
	}

	public async removePropertyByAdmin(propertyId: ObjectId): Promise<Property> {
		const search: T = {
			_id: propertyId,
			propertyStatus: PropertyStatus.DELETE,
		};

		const result = await this.propertyModel.findOneAndDelete(search).exec();
		if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);

		return result;
	}

	public async propertyStatsEditor(input: StatisticModifier): Promise<Property | null> {
		const { _id, targetKey, modifier } = input;
		return await this.propertyModel
			.findByIdAndUpdate(_id, { $inc: { [targetKey]: modifier } }, { new: true })
			.exec();
	}
}
