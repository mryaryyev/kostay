import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId, PipelineStage } from 'mongoose';
import { Inquiries, Inquiry } from '../../libs/dto/inquiry/inquiry';
import {
	AllInquiriesInquiry,
	AnswerInquiryInput,
	InquiryInput,
	InquiryUpdate,
	MyInquiriesInquiry,
} from '../../libs/dto/inquiry/inquiry.input';
import { InquiryStatus } from '../../libs/enums/inquiry.enum';
import { MemberStatus, MemberType } from '../../libs/enums/member.enum';
import { Member } from '../../libs/dto/member/member';
import { Message } from '../../libs/enums/common.enum';
import { NotificationGroup, NotificationType } from '../../libs/enums/notification.enum';
import { T } from '../../libs/types/common';
import { lookupMember } from '../../libs/config';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class InquiryService {
	constructor(
		@InjectModel('Inquiry') private readonly inquiryModel: Model<Inquiry>,
		@InjectModel('Member') private readonly memberModel: Model<Member>,
		private readonly notificationService: NotificationService,
	) {}

	/** MEMBER **/

	public async createInquiry(memberId: ObjectId, input: InquiryInput): Promise<Inquiry> {
		let result: Inquiry;
		try {
			result = await this.inquiryModel.create({ ...input, memberId });
		} catch (err) {
			console.log('Error, Service.model:', err instanceof Error ? err.message : err);
			throw new BadRequestException(Message.CREATE_FAILED);
		}

		// Every active admin is told about the new question.
		const admins = await this.memberModel
			.find({ memberType: MemberType.ADMIN, memberStatus: MemberStatus.ACTIVE })
			.select('_id')
			.lean()
			.exec();
		await Promise.all(
			admins.map((admin) =>
				this.notificationService.createNotification({
					notificationType: NotificationType.INQUIRY,
					notificationGroup: NotificationGroup.INQUIRY,
					notificationTitle: 'sent an inquiry',
					notificationDesc: result.inquiryTitle,
					authorId: memberId,
					receiverId: admin._id,
				}),
			),
		);
		return result;
	}

	public async getMyInquiries(
		memberId: ObjectId,
		input: MyInquiriesInquiry,
	): Promise<Inquiries> {
		return await this.findInquiries({ memberId }, input, false);
	}

	/** A question can be withdrawn only while it is still waiting for an answer. */
	public async removeMyInquiry(
		memberId: ObjectId,
		inquiryId: ObjectId,
	): Promise<Inquiry> {
		const result = await this.inquiryModel
			.findOneAndDelete({
				_id: inquiryId,
				memberId,
				inquiryStatus: InquiryStatus.WAITING,
			})
			.exec();
		if (!result) throw new BadRequestException(Message.REMOVE_FAILED);
		return result;
	}

	/** ADMIN **/

	public async getAllInquiriesByAdmin(input: AllInquiriesInquiry): Promise<Inquiries> {
		const { inquiryStatus, inquiryTopic, text } = input.search;
		const match: T = {};
		if (inquiryTopic) match.inquiryTopic = inquiryTopic;
		if (text)
			match.inquiryTitle = {
				$regex: new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
			};
		const statusMatch: T = { ...match };
		if (inquiryStatus) match.inquiryStatus = inquiryStatus;

		const [result, statusCounter] = await Promise.all([
			this.findInquiries(match, input, true),
			// Tab counts ignore the selected status, so every tab shows its own number.
			this.inquiryModel.aggregate<{ _id: InquiryStatus; count: number }>([
				{ $match: statusMatch },
				{ $group: { _id: '$inquiryStatus', count: { $sum: 1 } } },
			]),
		]);
		return { ...result, statusCounter };
	}

	/** Save (or edit) the answer and tell the member. */
	public async answerInquiry(
		adminId: ObjectId,
		input: AnswerInquiryInput,
	): Promise<Inquiry> {
		const result = await this.inquiryModel
			.findOneAndUpdate(
				{ _id: input._id, inquiryStatus: { $ne: InquiryStatus.CLOSED } },
				{
					answerContent: input.answerContent,
					answeredBy: adminId,
					answeredAt: new Date(),
					inquiryStatus: InquiryStatus.ANSWERED,
				},
				{ new: true },
			)
			.exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		await this.notificationService.createNotification({
			notificationType: NotificationType.INQUIRY,
			notificationGroup: NotificationGroup.INQUIRY,
			notificationTitle: 'answered your inquiry',
			notificationDesc: result.inquiryTitle,
			authorId: adminId,
			receiverId: result.memberId,
		});
		return result;
	}

	public async updateInquiryByAdmin(input: InquiryUpdate): Promise<Inquiry> {
		const result = await this.inquiryModel
			.findByIdAndUpdate(input._id, { inquiryStatus: input.inquiryStatus }, { new: true })
			.exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
		return result;
	}

	/** HELPERS **/

	private async findInquiries(
		match: T,
		input: { page: number; limit: number },
		withMember: boolean,
	): Promise<Inquiries> {
		const list: PipelineStage.FacetPipelineStage[] = [
			{ $skip: (input.page - 1) * input.limit },
			{ $limit: input.limit },
		];
		if (withMember)
			list.push(lookupMember, {
				$unwind: { path: '$memberData', preserveNullAndEmptyArrays: true },
			});

		const result: Inquiries[] = await this.inquiryModel
			.aggregate<Inquiries>([
				{ $match: match },
				{ $sort: { createdAt: -1 } },
				{ $facet: { list, metaCounter: [{ $count: 'total' }] } },
			])
			.exec();
		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		return result[0];
	}
}
