import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ObjectId } from 'mongoose';
import { FaqGroup, NoticeCategory, NoticeStatus } from '../../enums/notice.enum';
import { Member, TotalCounter } from '../member/member';

@ObjectType()
export class Notice {
	@Field(() => String)
	_id: ObjectId;

	@Field(() => NoticeCategory)
	noticeCategory: NoticeCategory;

	@Field(() => NoticeStatus)
	noticeStatus: NoticeStatus;

	@Field(() => FaqGroup, { nullable: true })
	faqGroup?: FaqGroup;

	@Field(() => Boolean)
	noticeEvent: boolean;

	@Field(() => String)
	noticeTitle: string;

	@Field(() => String)
	noticeContent: string;

	@Field(() => Int)
	noticeViews: number;

	@Field(() => String)
	memberId: ObjectId;

	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;

	/** from aggregation **/

	@Field(() => Member, { nullable: true })
	memberData?: Member;
}

@ObjectType()
export class NoticeStatusCount {
	@Field(() => NoticeStatus)
	_id: NoticeStatus;

	@Field(() => Int)
	count: number;
}

@ObjectType()
export class Notices {
	@Field(() => [Notice])
	list: Notice[];

	@Field(() => [TotalCounter], { nullable: true })
	metaCounter: TotalCounter[];

	// Admin tabs: how many notices of this category are in each status
	@Field(() => [NoticeStatusCount], { nullable: true })
	statusCounter?: NoticeStatusCount[];
}
