import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { Notice, Notices } from '../../libs/dto/notice/notice';
import {
	AllNoticesInquiry,
	NoticeInput,
	NoticesInquiry,
} from '../../libs/dto/notice/notice.input';
import { NoticeUpdate } from '../../libs/dto/notice/notice.update';
import { NoticeCategory, NoticeStatus } from '../../libs/enums/notice.enum';
import { Message } from '../../libs/enums/common.enum';
import { T } from '../../libs/types/common';
import { lookupMember } from '../../libs/config';

@Injectable()
export class NoticeService {
	constructor(@InjectModel('Notice') private readonly noticeModel: Model<Notice>) {}

	/** PUBLIC (CS page) **/

	public async getNotices(input: NoticesInquiry): Promise<Notices> {
		const match: T = { noticeStatus: NoticeStatus.ACTIVE };
		this.shapeMatchQuery(match, input.search);
		// Event notices are pinned on top, then the newest first.
		return await this.findNotices(match, { noticeEvent: -1, createdAt: -1 }, input);
	}

	public async getNotice(noticeId: ObjectId): Promise<Notice> {
		const result = await this.noticeModel
			.findOneAndUpdate(
				{ _id: noticeId, noticeStatus: NoticeStatus.ACTIVE },
				{ $inc: { noticeViews: 1 } },
				{ new: true },
			)
			.lean()
			.exec();
		if (!result) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		return result;
	}

	/** ADMIN **/

	public async createNotice(memberId: ObjectId, input: NoticeInput): Promise<Notice> {
		this.checkCategoryFields(input.noticeCategory, input);
		try {
			return await this.noticeModel.create({ ...input, memberId });
		} catch (err) {
			console.log('Error, Service.model:', err instanceof Error ? err.message : err);
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	public async updateNotice(input: NoticeUpdate): Promise<Notice> {
		const { _id, ...update } = input;
		const target = await this.noticeModel.findById(_id).lean().exec();
		if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		this.checkCategoryFields(target.noticeCategory, { ...target, ...update });

		const result = await this.noticeModel
			.findByIdAndUpdate(_id, update, { new: true })
			.exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
		return result;
	}

	/** Hard delete only after the item was moved to DELETE (same rule as board articles). */
	public async removeNotice(noticeId: ObjectId): Promise<Notice> {
		const result = await this.noticeModel
			.findOneAndDelete({ _id: noticeId, noticeStatus: NoticeStatus.DELETE })
			.exec();
		if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);
		return result;
	}

	public async getAllNoticesByAdmin(input: AllNoticesInquiry): Promise<Notices> {
		const { noticeStatus, ...search } = input.search;
		const match: T = {};
		this.shapeMatchQuery(match, search);
		const statusMatch: T = { ...match };
		if (noticeStatus) match.noticeStatus = noticeStatus;

		const [result, statusCounter] = await Promise.all([
			this.findNotices(match, { createdAt: -1 }, input),
			// Tab counts ignore the selected status, so every tab shows its own number.
			this.noticeModel.aggregate<{ _id: NoticeStatus; count: number }>([
				{ $match: statusMatch },
				{ $group: { _id: '$noticeStatus', count: { $sum: 1 } } },
			]),
		]);
		return { ...result, statusCounter };
	}

	/** HELPERS **/

	private shapeMatchQuery(match: T, search: NoticesInquiry['search']): void {
		const { noticeCategory, faqGroup, text } = search;
		match.noticeCategory = noticeCategory;
		if (faqGroup) match.faqGroup = faqGroup;
		if (text)
			match.noticeTitle = {
				$regex: new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
			};
	}

	/** FAQ needs a group; the event badge is only for notices. */
	private checkCategoryFields(
		category: NoticeCategory,
		fields: { faqGroup?: unknown; noticeEvent?: boolean },
	): void {
		if (category === NoticeCategory.FAQ && !fields.faqGroup)
			throw new BadRequestException('FAQ group is required');
		if (category === NoticeCategory.NOTICE && fields.faqGroup)
			throw new BadRequestException('Notices have no FAQ group');
		if (category === NoticeCategory.FAQ && fields.noticeEvent)
			throw new BadRequestException('Only notices can be events');
	}

	private async findNotices(
		match: T,
		sort: T,
		input: { page: number; limit: number },
	): Promise<Notices> {
		const result: Notices[] = await this.noticeModel
			.aggregate<Notices>([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							lookupMember,
							{ $unwind: { path: '$memberData', preserveNullAndEmptyArrays: true } },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		return result[0];
	}
}
