import {
	BadRequestException,
	CanActivate,
	ExecutionContext,
	Injectable,
	ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';
import { Message } from '../../../libs/enums/common.enum';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Member } from '../../../libs/dto/member/member';

interface AuthRequest {
	headers: { authorization?: string };
	body: { authMember?: Member | null };
}

@Injectable()
export class RolesGuard implements CanActivate {
	constructor(
		private reflector: Reflector,
		private authService: AuthService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const roles = this.reflector.get<string[]>('roles', context.getHandler());
		if (!roles) return true;

		console.info(`--- @guard() Authentication [RolesGuard]: ${roles.join(', ')} ---`);

		if (context.getType<string>() === 'graphql') {
			const request = GqlExecutionContext.create(context).getContext<{
				req: AuthRequest;
			}>().req;
			const bearerToken = request.headers.authorization;
			if (!bearerToken) throw new BadRequestException(Message.TOKEN_NOT_EXIST);

			const token = bearerToken.split(' ')[1],
				authMember = await this.authService.verifyToken(token);

			if (!authMember || !roles.includes(authMember.memberType))
				throw new ForbiddenException(Message.ONLY_SPECIFIC_ROLES_ALLOWED);

			console.log('memberNick[roles] =>', authMember.memberNick);
			request.body.authMember = authMember;
			return true;
		}

		// description => http, rpc, gprs and etc are ignored
		return false;
	}
}
