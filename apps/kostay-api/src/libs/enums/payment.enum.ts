import { registerEnumType } from '@nestjs/graphql';

export enum PaymentStatus {
	PENDING = 'PENDING',
	SUCCEEDED = 'SUCCEEDED',
	FAILED = 'FAILED',
	REFUNDED = 'REFUNDED',
}
registerEnumType(PaymentStatus, {
	name: 'PaymentStatus',
});
