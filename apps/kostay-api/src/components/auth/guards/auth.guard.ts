import {
	BadRequestException,
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { Message } from '../../../libs/enums/common.enum';
import { GqlExecutionContext } from '@nestjs/graphql';

interface AuthRequest {
	headers: { authorization?: string };
	body: { authMember?: { memberNick?: string } | null };
}

@Injectable()
export class AuthGuard implements CanActivate {
	constructor(private authService: AuthService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		console.info('--- @guard() Authentication [AuthGuard] ---');

		if (context.getType<string>() === 'graphql') {
			const request = GqlExecutionContext.create(context).getContext<{
				req: AuthRequest;
			}>().req;

			const bearerToken = request.headers.authorization;
			if (!bearerToken) throw new BadRequestException(Message.TOKEN_NOT_EXIST);

			//console.log('bearer Token => ', bearerToken); ==> "bearer dfmgndnlgkajkl;"
			const token = bearerToken.split(' ')[1],
				authMember = await this.authService.verifyToken(token);
			if (!authMember) throw new UnauthorizedException(Message.NOT_AUTHENTICATED);

			console.log('memberNick[auth] =>', authMember.memberNick);
			request.body.authMember = authMember;

			return true;
		}

		// description => http, rpc, gprs and etc are ignored
		return false;
	}
}
