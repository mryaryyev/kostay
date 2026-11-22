jest.mock('uuid', () => ({ v4: () => 'id' })); // jest cannot load the ESM build

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { MemberInput } from '../../libs/dto/member/member.input';
import { MemberUpdate } from '../../libs/dto/member/member.update';
import { MemberStatus, MemberType } from '../../libs/enums/member.enum';
import { MemberService } from './member.service';

const signup = (memberType?: MemberType) =>
	plainToInstance(MemberInput, {
		memberNick: 'guest',
		memberPassword: 'pass12',
		memberPhone: '010',
		memberType,
	});

function setup() {
	const create = jest.fn((data: object) => Promise.resolve({ ...data }));
	const update = jest.fn((_filter: object, data: object) => ({
		exec: () => Promise.resolve({ ...data }),
	}));
	const auth = {
		hashPassword: () => Promise.resolve('HASH'),
		createToken: () => Promise.resolve('TOKEN'),
	};
	const none = {} as never;
	const service = new MemberService(
		{ create, findOneAndUpdate: update } as never,
		none,
		auth as never,
		none,
		none,
		none,
	);
	return { service, create, update };
}

describe('member role', () => {
	it('accepts guest and host at signup, refuses admin', async () => {
		expect(await validate(signup(MemberType.USER))).toHaveLength(0);
		expect(await validate(signup(MemberType.HOST))).toHaveLength(0);
		expect(await validate(signup())).toHaveLength(0);
		expect(await validate(signup(MemberType.ADMIN))).not.toHaveLength(0);
	});

	it('never stores admin at signup', async () => {
		const { service, create } = setup();
		await service.signup(signup(MemberType.ADMIN));
		expect(create.mock.calls[0][0]).toMatchObject({ memberType: MemberType.USER });
	});

	it('keeps role and status out of a profile update and hashes the password', async () => {
		const { service, update } = setup();
		const input = {
			memberType: MemberType.ADMIN,
			memberStatus: MemberStatus.DELETE,
			memberDesc: 'hello',
			memberPassword: 'pass12',
		} as MemberUpdate;
		await service.updateMember('id' as never, input);
		expect(update.mock.calls[0][1]).toEqual({
			memberDesc: 'hello',
			memberPassword: 'HASH',
		});
	});
});
