import { Schema } from 'mongoose';
import { InquiryStatus, InquiryTopic } from '../libs/enums/inquiry.enum';

const InquirySchema = new Schema(
	{
		inquiryTopic: {
			type: String,
			enum: InquiryTopic,
			required: true,
		},

		inquiryStatus: {
			type: String,
			enum: InquiryStatus,
			default: InquiryStatus.WAITING,
		},

		inquiryTitle: {
			type: String,
			required: true,
		},

		inquiryContent: {
			type: String,
			required: true,
		},

		// Member who asked
		memberId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Member',
		},

		answerContent: {
			type: String,
		},

		// Admin who answered
		answeredBy: {
			type: Schema.Types.ObjectId,
			ref: 'Member',
		},

		answeredAt: {
			type: Date,
		},
	},
	{ timestamps: true, collection: 'inquiries' },
);

// My inquiries (newest first) and the admin status tabs.
InquirySchema.index({ memberId: 1, createdAt: -1 });
InquirySchema.index({ inquiryStatus: 1, createdAt: -1 });

export default InquirySchema;
