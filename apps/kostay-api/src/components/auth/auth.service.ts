import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Message } from '../../libs/enums/common.enum';
import * as bcrypt from 'bcryptjs';
import { Member } from '../../libs/dto/member/member';
import { T } from '../../libs/types/common';
import { JwtService } from '@nestjs/jwt';
import { shapeIntoMongoObjectId } from '../../libs/config';

@Injectable()
export class AuthService {
	constructor(private JwtService: JwtService) {}
	public async hashPassword(memberPassword: string): Promise<string> {
		const salt = await bcrypt.genSalt();
		return await bcrypt.hash(memberPassword, salt);
	}

	public async comparePassword(
		password: string,
		hashedPassword: string,
	): Promise<boolean> {
		return await bcrypt.compare(password, hashedPassword);
	}

	public async createToken(member: Member): Promise<string> {
		const payload: T = {};
		Object.keys(member['_doc'] ? member['_doc'] : member).map((ele) => {
			payload[`${ele}`] = member[`${ele}`];
		});
		delete payload.memberPassword;
		//console.log('payload:', payload);
		return await this.JwtService.signAsync(payload);
	}

	public async verifyToken(token: string): Promise<Member> {
		// Expired or wrongly signed token => 401, so the frontend can log the user out
		const member = await this.JwtService.verifyAsync<Member>(token).catch(() => {
			throw new UnauthorizedException(Message.TOKEN_INVALID);
		});
		member._id = shapeIntoMongoObjectId(member._id);
		return member;
	}
}
