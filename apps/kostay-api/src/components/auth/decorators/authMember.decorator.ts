import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

interface AuthRequest {
	headers?: { authorization?: string };
	body: { authMember?: { authorization?: string; [key: string]: unknown } };
}

export const AuthMember = createParamDecorator(
	(data: string | undefined, context: ExecutionContext): unknown => {
		let request: AuthRequest;

		if (context.getType<string>() === 'graphql') {
			request = GqlExecutionContext.create(context).getContext<{ req: AuthRequest }>()
				.req;
			if (request.body.authMember) {
				request.body.authMember.authorization = request.headers?.authorization;
			}
		} else {
			request = context.switchToHttp().getRequest<AuthRequest>();
		}

		const member = request.body.authMember;

		if (member) return data ? member[data] : member;
		return null;
	},
);
