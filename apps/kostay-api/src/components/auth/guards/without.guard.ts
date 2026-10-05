import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { GqlExecutionContext } from '@nestjs/graphql';

interface AuthRequest {
	headers: { authorization?: string };
	body: { authMember?: { memberNick?: string } | null };
}

@Injectable()
export class WithoutGuard implements CanActivate {
	constructor(private authService: AuthService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		console.info('--- @guard() Authentication [WithoutGuard] ---');

		if (context.getType<string>() === 'graphql') {
			const request = GqlExecutionContext.create(context).getContext<{
				req: AuthRequest;
			}>().req;
			const bearerToken = request.headers.authorization;

			if (bearerToken) {
				try {
					const token = bearerToken.split(' ')[1],
						authMember = await this.authService.verifyToken(token);
					request.body.authMember = authMember;
				} catch {
					request.body.authMember = null;
				}
			} else request.body.authMember = null;

			console.log(
				'memberNick[without] =>',
				request.body.authMember?.memberNick ?? 'none',
			);
			return true;
		}

		// description => http, rpc, gprs and etc are ignored
		return false;
	}
}
