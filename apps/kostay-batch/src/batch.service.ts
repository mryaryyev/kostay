import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import moment from 'moment';
import { Model } from 'mongoose';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Booking } from '../../kostay-api/src/database/postgres/entities/booking.entity';
import { BookingStatus } from '../../kostay-api/src/libs/enums/booking.enum';
import { Property } from '../../kostay-api/src/libs/dto/property/property';
import { Member } from '../../kostay-api/src/libs/dto/member/member';
import { PropertyStatus } from '../../kostay-api/src/libs/enums/property.enum';
import { MemberStatus, MemberType } from '../../kostay-api/src/libs/enums/member.enum';

@Injectable()
export class BatchService {
	constructor(
		@InjectModel('Property') private readonly propertyModel: Model<Property>,
		@InjectModel('Member') private readonly memberModel: Model<Member>,
		@InjectRepository(Booking) private readonly bookingRepository: Repository<Booking>,
	) {}

	public async batchRollback(): Promise<void> {
		await this.propertyModel
			.updateMany(
				{
					propertyStatus: PropertyStatus.ACTIVE,
				},
				{ propertyRank: 0 },
			)
			.exec();

		await this.memberModel
			.updateMany(
				{
					memberStatus: MemberStatus.ACTIVE,
					memberType: MemberType.AGENT,
				},
				{ memberRank: 0 },
			)
			.exec();
	}

	public async batchTopProperties(): Promise<void> {
		const properties: Property[] = await this.propertyModel
			.find({
				propertyStatus: PropertyStatus.ACTIVE,
				propertyRank: 0,
			})
			.exec();

		const promisedList = properties.map(async (ele: Property) => {
			const { _id, propertyLikes, propertyViews } = ele;
			const rank = propertyLikes * 2 + propertyViews * 1;
			return await this.propertyModel.findByIdAndUpdate(_id, { propertyRank: rank });
		});
		await Promise.all(promisedList);
	}

	public async batchTopAgents(): Promise<void> {
		const agents: Member[] = await this.memberModel
			.find({
				memberType: MemberType.AGENT,
				memberStatus: MemberStatus.ACTIVE,
				memberRank: 0,
			})
			.exec();

		const promisedList = agents.map(async (ele: Member) => {
			const { _id, memberProperties, memberLikes, memberArticles, memberViews } = ele;
			const rank =
				memberProperties * 5 + memberArticles * 3 + memberLikes * 2 + memberViews * 1;
			return await this.memberModel.findByIdAndUpdate(_id, { memberRank: rank });
		});
		await Promise.all(promisedList);
	}

	/** Checkout is 11:00: CONFIRMED stays whose check-out day has come are COMPLETED (dates are plain YYYY-MM-DD). */
	public async batchCompleteBookings(): Promise<number> {
		const today = moment().format('YYYY-MM-DD');
		const result = await this.bookingRepository.update(
			{ status: BookingStatus.CONFIRMED, checkOut: LessThanOrEqual(today) },
			{ status: BookingStatus.COMPLETED },
		);
		return result.affected ?? 0;
	}

	public getHello(): string {
		return 'Welcome to Kostay BATCH Server!';
	}
}
