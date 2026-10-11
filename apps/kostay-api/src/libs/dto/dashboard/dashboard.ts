import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

/** Admin home: platform numbers from MongoDB (members, stays, posts, inquiries) and PostgreSQL (bookings, payments). */
@ObjectType()
export class AdminDashboard {
	@Field(() => Int)
	guests: number;

	@Field(() => Int)
	hosts: number;

	@Field(() => Int)
	activeStays: number;

	@Field(() => Int)
	pausedStays: number;

	@Field(() => Int)
	activeArticles: number;

	@Field(() => Int)
	waitingInquiries: number;

	@Field(() => Int)
	confirmedBookings: number;

	@Field(() => Int)
	completedBookings: number;

	@Field(() => Int)
	cancelledBookings: number;

	// CONFIRMED bookings that check in during the next 7 days (today included)
	@Field(() => Int)
	upcomingCheckIns: number;

	// SUCCEEDED payments (refunded ones are excluded), in KRW
	@Field(() => Float)
	totalRevenue: number;

	@Field(() => Float)
	monthRevenue: number;
}
