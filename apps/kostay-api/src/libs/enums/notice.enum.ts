import { registerEnumType } from '@nestjs/graphql';

/** One collection holds both kinds of CS content. */
export enum NoticeCategory {
	NOTICE = 'NOTICE',
	FAQ = 'FAQ',
}
registerEnumType(NoticeCategory, {
	name: 'NoticeCategory',
});

export enum NoticeStatus {
	HOLD = 'HOLD',
	ACTIVE = 'ACTIVE',
	DELETE = 'DELETE',
}
registerEnumType(NoticeStatus, {
	name: 'NoticeStatus',
});

/** FAQ tabs on the CS page. */
export enum FaqGroup {
	STAYS = 'STAYS',
	PAYMENT = 'PAYMENT',
	GUESTS = 'GUESTS',
	HOSTS = 'HOSTS',
	MEMBERSHIP = 'MEMBERSHIP',
	COMMUNITY = 'COMMUNITY',
	OTHER = 'OTHER',
}
registerEnumType(FaqGroup, {
	name: 'FaqGroup',
});
