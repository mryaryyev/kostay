import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Model } from 'mongoose';
import moment from 'moment';
import { DataSource, Repository } from 'typeorm';
import { AdminDashboard } from '../../libs/dto/dashboard/dashboard';
import { Member } from '../../libs/dto/member/member';
import { Property } from '../../libs/dto/property/property';
import { BoardArticle } from '../../libs/dto/board-article/board-article';
import { Inquiry } from '../../libs/dto/inquiry/inquiry';
import { Booking } from '../../database/postgres/entities/booking.entity';
import { Payment } from '../../database/postgres/entities/payment.entity';
import { MemberStatus, MemberType } from '../../libs/enums/member.enum';
import { PropertyStatus } from '../../libs/enums/property.enum';
import { BoardArticleStatus } from '../../libs/enums/board-article.enum';
import { InquiryStatus } from '../../libs/enums/inquiry.enum';
import { BookingStatus } from '../../libs/enums/booking.enum';
import { PaymentStatus } from '../../libs/enums/payment.enum';

@Injectable()
export class DashboardService {
	constructor(
		@InjectModel('Member') private readonly memberModel: Model<Member>,
		@InjectModel('Property') private readonly propertyModel: Model<Property>,
		@InjectModel('BoardArticle') private readonly boardArticleModel: Model<BoardArticle>,
		@InjectModel('Inquiry') private readonly inquiryModel: Model<Inquiry>,
		@InjectRepository(Booking) private readonly bookingRepository: Repository<Booking>,
		private readonly dataSource: DataSource,
	) {}

	/** All counts run in parallel; each database answers its own part. */
	public async getAdminDashboard(): Promise<AdminDashboard> {
		const today = moment().format('YYYY-MM-DD');
		const weekEnd = moment().add(6, 'days').format('YYYY-MM-DD');
		const monthStart = moment().startOf('month').toDate();

		const countMembers = (memberType: MemberType) =>
			this.memberModel
				.countDocuments({ memberType, memberStatus: MemberStatus.ACTIVE })
				.exec();
		const countBookings = (status: BookingStatus) =>
			this.bookingRepository.count({ where: { status } });
		const sumPayments = async (from?: Date) => {
			const query = this.dataSource
				.getRepository(Payment)
				.createQueryBuilder('p')
				.select('COALESCE(SUM(p.amount), 0)', 'total')
				.where('p.status = :status', { status: PaymentStatus.SUCCEEDED });
			if (from) query.andWhere('p.paidAt >= :from', { from });
			const row = await query.getRawOne<{ total: string }>();
			return Number(row?.total ?? 0);
		};

		const [
			guests,
			hosts,
			activeStays,
			pausedStays,
			activeArticles,
			waitingInquiries,
			confirmedBookings,
			completedBookings,
			cancelledBookings,
			upcomingCheckIns,
			totalRevenue,
			monthRevenue,
		] = await Promise.all([
			countMembers(MemberType.USER),
			countMembers(MemberType.AGENT),
			this.propertyModel.countDocuments({ propertyStatus: PropertyStatus.ACTIVE }).exec(),
			this.propertyModel
				.countDocuments({ propertyStatus: PropertyStatus.INACTIVE })
				.exec(),
			this.boardArticleModel
				.countDocuments({ articleStatus: BoardArticleStatus.ACTIVE })
				.exec(),
			this.inquiryModel.countDocuments({ inquiryStatus: InquiryStatus.WAITING }).exec(),
			countBookings(BookingStatus.CONFIRMED),
			countBookings(BookingStatus.COMPLETED),
			countBookings(BookingStatus.CANCELLED),
			this.bookingRepository
				.createQueryBuilder('b')
				.where('b.status = :status', { status: BookingStatus.CONFIRMED })
				.andWhere('b.checkIn BETWEEN :today AND :weekEnd', { today, weekEnd })
				.getCount(),
			sumPayments(),
			sumPayments(monthStart),
		]);

		return {
			guests,
			hosts,
			activeStays,
			pausedStays,
			activeArticles,
			waitingInquiries,
			confirmedBookings,
			completedBookings,
			cancelledBookings,
			upcomingCheckIns,
			totalRevenue,
			monthRevenue,
		};
	}
}
