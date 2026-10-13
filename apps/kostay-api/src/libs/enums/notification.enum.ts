import { registerEnumType } from '@nestjs/graphql';

export enum NotificationType {
	LIKE = 'LIKE',
	COMMENT = 'COMMENT',
	FOLLOW = 'FOLLOW',
	MESSAGE = 'MESSAGE',
	BOOKING = 'BOOKING',
	INQUIRY = 'INQUIRY',
	LISTING = 'LISTING', // stay submitted / approved / rejected
}
registerEnumType(NotificationType, {
	name: 'NotificationType',
});

export enum NotificationStatus {
	WAIT = 'WAIT',
	READ = 'READ',
}
registerEnumType(NotificationStatus, {
	name: 'NotificationStatus',
});

export enum NotificationGroup {
	MEMBER = 'MEMBER',
	ARTICLE = 'ARTICLE',
	PROPERTY = 'PROPERTY',
	BOOKING = 'BOOKING',
	INQUIRY = 'INQUIRY',
}
registerEnumType(NotificationGroup, {
	name: 'NotificationGroup',
});
