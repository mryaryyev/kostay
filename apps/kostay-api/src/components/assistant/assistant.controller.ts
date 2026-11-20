import {
	BadRequestException,
	Body,
	Controller,
	HttpCode,
	Post,
	Req,
	Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AskInput } from '../../libs/dto/assistant/assistant.input';
import { AssistantService, LIMITED } from './assistant.service';
import { clientIp } from './rate-limit';
import { formatSse } from './sse';

/**
 * REST, not GraphQL: the answer streams as Server-Sent Events, which a plain HTTP response
 * carries well (GraphQL would need subscriptions over WebSocket). Open to guests.
 */
@Controller('assistant')
export class AssistantController {
	constructor(private readonly assistantService: AssistantService) {}

	@Post('stream')
	@HttpCode(200)
	public async stream(
		@Body() input: AskInput,
		@Req() req: Request,
		@Res() res: Response,
	): Promise<void> {
		const question = input.question.trim();
		if (!question) throw new BadRequestException('question is empty');
		const history = (input.history ?? [])
			.map((earlier) => earlier.trim())
			.filter(Boolean);

		res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
		// no-transform / X-Accel-Buffering: nginx must pass each event on at once
		res.setHeader('Cache-Control', 'no-cache, no-transform');
		res.setHeader('X-Accel-Buffering', 'no');

		const limit = await this.assistantService.limit(clientIp(req.headers, req.ip));
		if (!limit.allowed) {
			res.status(429).end(formatSse('done', LIMITED[limit.reason]));
			return;
		}
		res.flushHeaders();

		const aborted = new AbortController();
		res.on('close', () => aborted.abort()); // the visitor closed the tab or the box
		await this.assistantService.stream(question, res, aborted.signal, history);
		res.end();
	}
}
