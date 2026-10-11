import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ObjectId } from 'mongoose';
import { InquiryService } from './inquiry.service';
import { Inquiries, Inquiry } from '../../libs/dto/inquiry/inquiry';
import {
	AllInquiriesInquiry,
	AnswerInquiryInput,
	InquiryInput,
	InquiryUpdate,
	MyInquiriesInquiry,
} from '../../libs/dto/inquiry/inquiry.input';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MemberType } from '../../libs/enums/member.enum';
import { shapeIntoMongoObjectId } from '../../libs/config';

@Resolver()
export class InquiryResolver {
	constructor(private readonly inquiryService: InquiryService) {}

	/** MEMBER **/

	@UseGuards(AuthGuard)
	@Mutation(() => Inquiry)
	public async createInquiry(
		@Args('input') input: InquiryInput,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Inquiry> {
		console.log('Mutation: createInquiry');
		return await this.inquiryService.createInquiry(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Query(() => Inquiries)
	public async getMyInquiries(
		@Args('input') input: MyInquiriesInquiry,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Inquiries> {
		console.log('Query: getMyInquiries');
		return await this.inquiryService.getMyInquiries(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Inquiry)
	public async removeMyInquiry(
		@Args('inquiryId') input: string,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Inquiry> {
		console.log('Mutation: removeMyInquiry');
		return await this.inquiryService.removeMyInquiry(
			memberId,
			shapeIntoMongoObjectId(input),
		);
	}

	/** ADMIN **/

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Query(() => Inquiries)
	public async getAllInquiriesByAdmin(
		@Args('input') input: AllInquiriesInquiry,
	): Promise<Inquiries> {
		console.log('Query: getAllInquiriesByAdmin');
		return await this.inquiryService.getAllInquiriesByAdmin(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Inquiry)
	public async answerInquiry(
		@Args('input') input: AnswerInquiryInput,
		@AuthMember('_id') adminId: ObjectId,
	): Promise<Inquiry> {
		console.log('Mutation: answerInquiry');
		input._id = shapeIntoMongoObjectId(input._id);
		return await this.inquiryService.answerInquiry(adminId, input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Inquiry)
	public async updateInquiryByAdmin(
		@Args('input') input: InquiryUpdate,
	): Promise<Inquiry> {
		console.log('Mutation: updateInquiryByAdmin');
		input._id = shapeIntoMongoObjectId(input._id);
		return await this.inquiryService.updateInquiryByAdmin(input);
	}
}
