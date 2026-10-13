import { Logger, Inject } from '@nestjs/common';
import {
	OnGatewayInit,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'ws';
import * as WebSocket from 'ws';
import { AuthService } from '../components/auth/auth.service';
import * as url from 'url';
import { Member } from '../libs/dto/member/member';

import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../database/redis/redis.module';

interface MessagePayload {
	event: string;
	text: string;
	memberData: Member | null;
	createdAt: string;
}

interface InfoPayload {
	event: string;
	totalClients: number;
	memberData: Member | null;
	action: string;
}

/** Redis list holding the chat history, newest first (LPUSH), trimmed to CHAT_LIMIT. */
const CHAT_KEY = 'chat:messages';
const CHAT_LIMIT = 50;

@WebSocketGateway({ transports: ['websocket'], secure: false })
export class SocketGateway implements OnGatewayInit {
	private logger: Logger = new Logger('SocketEventsGateway');
	private summaryClient: number = 0;
	private clientsAuthMap = new Map<WebSocket, Member | null>();
	private messagesList: MessagePayload[] = [];

	constructor(
		private authService: AuthService,
		@Inject(REDIS_CLIENT) private readonly redis: Redis,
	) {}

	@WebSocketServer()
	server: Server;

	public afterInit() {
		this.logger.verbose(`WebSocket Server Initialized & total: [${this.summaryClient}]`);
	}

	/** Last messages, oldest first. Falls back to memory when Redis is down. */
	private async readMessages(): Promise<MessagePayload[]> {
		if (this.redis.status !== 'ready') return this.messagesList;
		const raw = await this.redis.lrange(CHAT_KEY, 0, CHAT_LIMIT - 1);
		return raw.map((item) => JSON.parse(item) as MessagePayload).reverse();
	}

	/** Keeps a memory copy (fallback) and writes to Redis when it is up. */
	private async saveMessage(message: MessagePayload): Promise<void> {
		this.messagesList.push(message);
		if (this.messagesList.length > CHAT_LIMIT)
			this.messagesList.splice(0, this.messagesList.length - CHAT_LIMIT);
		if (this.redis.status !== 'ready') return;
		await this.redis.lpush(CHAT_KEY, JSON.stringify(message));
		await this.redis.ltrim(CHAT_KEY, 0, CHAT_LIMIT - 1);
	}

	private async retrieveAuth(req: any): Promise<Member | null> {
		try {
			const parseUrl = url.parse(req.url, true);
			const { token } = parseUrl.query;
			return await this.authService.verifyToken(token as string);
		} catch (err) {
			//this.logger.warn(`Auth failed: ${(err as Error).message}`);
			return null;
		}
	}

	public async handleConnection(client: WebSocket, req: any) {
		const authMember = await this.retrieveAuth(req);
		this.summaryClient++;
		this.clientsAuthMap.set(client, authMember);

		const clientNick: string = authMember?.memberNick ?? 'Guest';
		this.logger.verbose(`Connected [${clientNick}] & total: [${this.summaryClient}]`);

		const infoMsg: InfoPayload = {
			event: 'info',
			totalClients: this.summaryClient,
			memberData: authMember,
			action: 'joined',
		};
		this.emitMessage(infoMsg);
		client.send(
			JSON.stringify({ event: 'getMessages', list: await this.readMessages() }),
		);
	}

	public handleDisconnect(client: WebSocket) {
		const authMember = this.clientsAuthMap.get(client) ?? null;
		this.summaryClient--;
		this.clientsAuthMap.delete(client);

		const clientNick: string = authMember?.memberNick ?? 'Guest';
		this.logger.verbose(`Disconnected [${clientNick}] & total: [${this.summaryClient}]`);

		const infoMsg: InfoPayload = {
			event: 'info',
			totalClients: this.summaryClient,
			memberData: authMember,
			action: 'left',
		};
		this.broadcastMessage(client, infoMsg);
	}

	@SubscribeMessage('message')
	public async handleMessage(client: WebSocket, payload: string): Promise<void> {
		const authMember = this.clientsAuthMap.get(client) ?? null;
		const newMessage: MessagePayload = {
			event: 'message',
			text: payload,
			memberData: authMember,
			createdAt: new Date().toISOString(),
		};

		const clientNick: string = authMember?.memberNick ?? 'Guest';
		this.logger.verbose(`NEW MESSAGE [${clientNick}]: ${payload}`);

		await this.saveMessage(newMessage);
		this.emitMessage(newMessage);
	}

	private broadcastMessage(sender: WebSocket, message: InfoPayload | MessagePayload) {
		this.server.clients.forEach((client) => {
			if (client !== sender && client.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify(message));
			}
		});
	}

	private emitMessage(message: InfoPayload | MessagePayload) {
		this.server.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify(message));
			}
		});
	}
}

/*
MESSAGE TARGET:
1. Client (only client)
2. Broadcast (except client)
3. Emit (all clients)
*/
