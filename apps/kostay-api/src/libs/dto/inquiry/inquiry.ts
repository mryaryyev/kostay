import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ObjectId } from 'mongoose';
import { InquiryStatus, InquiryTopic } from '../../enums/inquiry.enum';
import { Member, TotalCounter } from '../member/member';

@ObjectType()
export class Inquiry {
	@Field(() => String)
	_id: ObjectId;

	@Field(() => InquiryTopic)
	inquiryTopic: InquiryTopic;

	@Field(() => InquiryStatus)
	inquiryStatus: InquiryStatus;

	@Field(() => String)
	inquiryTitle: string;

	@Field(() => String)
	inquiryContent: string;

	@Field(() => String)
	memberId: ObjectId;

	@Field(() => String, { nullable: true })
	answerContent?: string;

	@Field(() => String, { nullable: true })
	answeredBy?: ObjectId;

	@Field(() => Date, { nullable: true })
	answeredAt?: Date;

	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;

	/** from aggregation **/

	@Field(() => Member, { nullable: true })
	memberData?: Member;
}

@ObjectType()
export class InquiryStatusCount {
	@Field(() => InquiryStatus)
	_id: InquiryStatus;

	@Field(() => Int)
	count: number;
}

@ObjectType()
export class Inquiries {
	@Field(() => [Inquiry])
	list: Inquiry[];

	@Field(() => [TotalCounter], { nullable: true })
	metaCounter: TotalCounter[];

	// Admin tabs: how many inquiries are in each status
	@Field(() => [InquiryStatusCount], { nullable: true })
	statusCounter?: InquiryStatusCount[];
}
