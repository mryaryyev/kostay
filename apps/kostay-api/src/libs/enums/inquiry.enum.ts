import { registerEnumType } from '@nestjs/graphql';

export enum InquiryStatus {
	WAITING = 'WAITING',
	ANSWERED = 'ANSWERED',
	CLOSED = 'CLOSED',
}
registerEnumType(InquiryStatus, {
	name: 'InquiryStatus',
});

export enum InquiryTopic {
	BOOKING = 'BOOKING',
	PAYMENT = 'PAYMENT',
	STAY = 'STAY',
	ACCOUNT = 'ACCOUNT',
	OTHER = 'OTHER',
}
registerEnumType(InquiryTopic, {
	name: 'InquiryTopic',
});
