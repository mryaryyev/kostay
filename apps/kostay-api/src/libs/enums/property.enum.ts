import { registerEnumType } from '@nestjs/graphql';

export enum PropertyType {
	APARTMENT = 'APARTMENT',
	VILLA = 'VILLA',
	HOUSE = 'HOUSE',
	HANOK = 'HANOK',
}
registerEnumType(PropertyType, {
	name: 'PropertyType',
});

export enum PropertyStatus {
	PENDING = 'PENDING', // new stay waiting for admin approval
	ACTIVE = 'ACTIVE',
	INACTIVE = 'INACTIVE',
	DELETE = 'DELETE',
}
registerEnumType(PropertyStatus, {
	name: 'PropertyStatus',
});

export enum PropertyLocation {
	SEOUL = 'SEOUL',
	BUSAN = 'BUSAN',
	INCHEON = 'INCHEON',
	DAEGU = 'DAEGU',
	GYEONGJU = 'GYEONGJU',
	GWANGJU = 'GWANGJU',
	CHONJU = 'CHONJU',
	JEJU = 'JEJU',
}
registerEnumType(PropertyLocation, {
	name: 'PropertyLocation',
});
