import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Member } from '../../libs/dto/member/member';
import { LoginInput, MemberInput } from '../../libs/dto/member/member.input';
import { MemberStatus } from '../../libs/enums/member.enum';
import { Message } from '../../libs/enums/common.enum';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class MemberService {
	constructor(
		@InjectModel('Member') private readonly memberModel: Model<Member>,
		private authService: AuthService,
	) {}

	public async signup(input: MemberInput): Promise<Member> {
		// TODO: Hash password
		input.memberPassword = await this.authService.hashPassword(input.memberPassword);
		try {
			const result = await this.memberModel.create(input);
			// TODO: Authentication via TOKEN
			result.accessToken = await this.authService.createToken(result);
			return result;
		} catch (err) {
			console.log('Error, Service.model:', err instanceof Error ? err.message : err);
			throw new BadRequestException(Message.USED_MEMBER_NICK_OR_PHONE);
		}
	}

	public async login(input: LoginInput): Promise<Member> {
		const { memberNick, memberPassword } = input;
		const response = await this.memberModel.findOne({ memberNick: memberNick }).select('+memberPassword').exec();

		if (!response || response.memberStatus === MemberStatus.DELETE) {
			throw new InternalServerErrorException(Message.NO_MEMBER_NICK);
		} else if (response.memberStatus === MemberStatus.BLOCK) {
			throw new InternalServerErrorException(Message.BLOCKED_USER);
		}

		// TODO: Compare password
		const isMatch = await this.authService.comparePassword(memberPassword, response.memberPassword!);
		if (!isMatch) throw new InternalServerErrorException(Message.WRONG_PASSWORD);

		// TODO: Authentication via TOKEN
		response.accessToken = await this.authService.createToken(response);

		return response;
	}

	public async updateMember(): Promise<string> {
		return await Promise.resolve('updateMember executed');
	}

	public async getMember(): Promise<string> {
		return await Promise.resolve('getMember executed');
	}

	public async getAllMembersByAdmin(): Promise<string> {
		return await Promise.resolve('getAllMembersByAdmin executed');
	}

	public async updateMembersByAdmin(): Promise<string> {
		return await Promise.resolve('updateMembersByAdmin executed');
	}
}
