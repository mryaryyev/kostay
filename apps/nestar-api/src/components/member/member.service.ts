import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class MemberService {
	constructor(@InjectModel('Member') private readonly memberModel: Model<null>) {}

	public async signup(): Promise<string> {
		return await Promise.resolve('signup executed');
	}

	public async login(): Promise<string> {
		return await Promise.resolve('login executed');
	}

	public async updateMember(): Promise<string> {
		return await Promise.resolve('updateMember executed');
	}

	public async getMember(): Promise<string> {
		return await Promise.resolve('getMember executed');
	}
}
