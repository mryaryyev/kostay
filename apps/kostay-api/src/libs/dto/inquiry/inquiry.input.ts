import { Field, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, Length, Min } from 'class-validator';
import { ObjectId } from 'mongoose';
import { InquiryStatus, InquiryTopic } from '../../enums/inquiry.enum';

@InputType()
export class InquiryInput {
	@IsNotEmpty()
	@Field(() => InquiryTopic)
	inquiryTopic: InquiryTopic;

	@IsNotEmpty()
	@Length(3, 100)
	@Field(() => String)
	inquiryTitle: string;

	@IsNotEmpty()
	@Length(10, 2000)
	@Field(() => String)
	inquiryContent: string;

	memberId?: ObjectId;
}

@InputType()
export class AnswerInquiryInput {
	@IsNotEmpty()
	@Field(() => String)
	_id: ObjectId;

	@IsNotEmpty()
	@Length(3, 2000)
	@Field(() => String)
	answerContent: string;
}

@InputType()
export class InquiryUpdate {
	@IsNotEmpty()
	@Field(() => String)
	_id: ObjectId;

	@IsNotEmpty()
	@Field(() => InquiryStatus)
	inquiryStatus: InquiryStatus;
}

@InputType()
export class MyInquiriesInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;
}

@InputType()
class AIISearch {
	@IsOptional()
	@Field(() => InquiryStatus, { nullable: true })
	inquiryStatus?: InquiryStatus;

	@IsOptional()
	@Field(() => InquiryTopic, { nullable: true })
	inquiryTopic?: InquiryTopic;

	@IsOptional()
	@Field(() => String, { nullable: true })
	text?: string;
}

@InputType()
export class AllInquiriesInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;

	@IsNotEmpty()
	@Field(() => AIISearch)
	search: AIISearch;
}
