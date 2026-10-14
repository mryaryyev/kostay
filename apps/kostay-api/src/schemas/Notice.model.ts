import { Schema } from 'mongoose';
import { FaqGroup, NoticeCategory, NoticeStatus } from '../libs/enums/notice.enum';

const NoticeSchema = new Schema(
	{
		noticeCategory: {
			type: String,
			enum: NoticeCategory,
			required: true,
		},

		noticeStatus: {
			type: String,
			enum: NoticeStatus,
			default: NoticeStatus.ACTIVE,
		},

		// FAQ only: which tab the question belongs to
		faqGroup: {
			type: String,
			enum: FaqGroup,
		},

		// NOTICE only: shown first with an "event" badge
		noticeEvent: {
			type: Boolean,
			default: false,
		},

		noticeTitle: {
			type: String,
			required: true,
		},

		noticeContent: {
			type: String,
			required: true,
		},

		noticeViews: {
			type: Number,
			default: 0,
		},

		memberId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Member',
		},
	},
	{ timestamps: true, collection: 'notices' },
);

NoticeSchema.index({ noticeCategory: 1, noticeStatus: 1, createdAt: -1 });

export default NoticeSchema;
