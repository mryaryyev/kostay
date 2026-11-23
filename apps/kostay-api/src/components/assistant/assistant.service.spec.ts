import { Readable } from 'stream';
import { Types } from 'mongoose';
import { AssistantDone, AssistantService, UNAVAILABLE } from './assistant.service';
import { formatSse } from './sse';

const STAY_ID = '6acc9ac09b7e8ff5e7aa0355';
const GONE_ID = '6acc9ac09b7e8ff5e7aa0356';

function makeService(opts: {
	baseUrl?: string;
	post?: jest.Mock;
	found?: object[];
	counts?: object[];
	hosts?: object[];
}) {
	const config = { get: (key: string) => (key === 'AI_SEARCH_URL' ? opts.baseUrl : 'k') };
	const http = { axiosRef: { post: opts.post ?? jest.fn() } };
	const query = { select: () => query, lean: () => query, exec: () => opts.found ?? [] };
	const model = {
		find: jest.fn(() => query),
		aggregate: jest.fn(() => ({ exec: () => opts.counts ?? [] })),
	};
	const hostQuery = {
		select: () => hostQuery,
		lean: () => hostQuery,
		exec: () => opts.hosts ?? [],
	};
	const members = { find: jest.fn(() => hostQuery) };
	const service = new AssistantService(
		http as never,
		config as never,
		{ status: 'ready' } as never,
		model as never,
		members as never,
	);
	return { service, model, members };
}

/** Collects what the service writes, like the Express response would. */
function sink() {
	const chunks: string[] = [];
	return { chunks, write: (chunk: string) => chunks.push(chunk) };
}

function upstream(...pieces: string[]) {
	return jest.fn(() => Promise.resolve({ data: Readable.from(pieces) }));
}

describe('AssistantService.stream', () => {
	it('passes start and delta through and ends with the done event', async () => {
		const done = {
			status: 'answered',
			answer: 'Yes [1].',
			citations: [],
			intent: 'help',
			stays: [],
		};
		const event = formatSse('done', done);
		const post = upstream(
			'event: start\ndata: {"intent":"help"}\n\nevent: delta\ndata: {"te',
			'xt":"Yes [1]. "}\n\n',
			event.slice(0, 10),
			event.slice(10),
		);
		const { service } = makeService({ baseUrl: 'http://ai', post });
		const out = sink();
		await service.stream('Refund?', out, new AbortController().signal);
		expect(out.chunks).toEqual([
			'event: start\ndata: {"intent":"help"}\n\n',
			'event: delta\ndata: {"text":"Yes [1]. "}\n\n',
			formatSse('done', done),
		]);
		expect((post.mock.calls[0] as unknown[])[0]).toBe('http://ai/v1/assistant/stream');
		// a first question: no earlier questions
		expect((post.mock.calls[0] as unknown[])[1]).toEqual({
			question: 'Refund?',
			history: [],
		});
	});

	it('sends the earlier questions of the conversation with a follow-up', async () => {
		const done = {
			status: 'stays',
			answer: '',
			citations: [],
			intent: 'stay',
			stays: [],
		};
		const post = upstream(formatSse('done', done));
		const { service } = makeService({ baseUrl: 'http://ai', post });
		await service.stream('in Incheon', sink(), new AbortController().signal, [
			'cheapest stays in Seoul',
		]);
		expect((post.mock.calls[0] as unknown[])[1]).toEqual({
			question: 'in Incheon',
			history: ['cheapest stays in Seoul'],
		});
	});

	it('turns stay ids into cards, keeping order and dropping stays that are gone', async () => {
		const done = {
			status: 'stays',
			answer: 'Here.',
			citations: [],
			intent: 'stay',
			stays: [GONE_ID, STAY_ID, 'not-an-id'],
		};
		const found = [
			{
				_id: { toHexString: () => STAY_ID },
				propertyTitle: 'Wansan Together Hanok',
				propertyType: 'HANOK',
				propertyLocation: 'CHONJU',
				pricePerNight: 120000,
				maxGuests: 4,
				propertyImages: ['uploads/a.jpg', 'uploads/b.jpg'],
			},
		];
		const { service, model } = makeService({
			baseUrl: 'http://ai',
			post: upstream(formatSse('done', done)),
			found,
		});
		const out = sink();
		await service.stream('hanok in Jeonju', out, new AbortController().signal);
		const sent = JSON.parse(out.chunks[0].split('data: ')[1]);
		expect(sent.stays).toEqual([STAY_ID]);
		expect(sent.stayCards).toEqual([
			{
				_id: STAY_ID,
				propertyTitle: 'Wansan Together Hanok',
				propertyType: 'HANOK',
				propertyLocation: 'CHONJU',
				pricePerNight: 120000,
				maxGuests: 4,
				propertyImage: 'uploads/a.jpg',
			},
		]);
		const filter = (model.find.mock.calls[0] as unknown[])[0] as {
			_id: { $in: string[] };
		};
		expect(filter._id.$in).toEqual([GONE_ID, STAY_ID]);
	});

	it('sends a friendly done event when the AI service fails or is not configured', async () => {
		const failing = jest.fn(() => Promise.reject(new Error('ECONNREFUSED')));
		for (const service of [
			makeService({ baseUrl: 'http://ai', post: failing }).service,
			makeService({}).service,
		]) {
			const out = sink();
			await service.stream('q', out, new AbortController().signal);
			expect(out.chunks).toEqual([formatSse('done', UNAVAILABLE)]);
		}
	});

	it('writes nothing more once the visitor has left', async () => {
		const aborted = new AbortController();
		aborted.abort();
		const post = jest.fn(() => Promise.reject(new Error('canceled')));
		const { service } = makeService({ baseUrl: 'http://ai', post });
		const out = sink();
		await service.stream('q', out, aborted.signal);
		expect(out.chunks).toEqual([]);
		expect((post.mock.calls[0] as unknown[])[2]).toMatchObject({
			signal: aborted.signal,
		});
	});

	it('ends with done even if the upstream stream stops early', async () => {
		const post = upstream('event: start\ndata: {"intent":"help"}\n\n');
		const { service } = makeService({ baseUrl: 'http://ai', post });
		const out = sink();
		await service.stream('q', out, new AbortController().signal);
		expect(out.chunks.at(-1)).toBe(formatSse('done', UNAVAILABLE));
	});
});

describe('AssistantService.withHostCards', () => {
	const id = (hex: string) => new Types.ObjectId(hex);
	const A = '6acc9ac09b7e8ff5e7aa0001';
	const B = '6acc9ac09b7e8ff5e7aa0002';
	const C = '6acc9ac09b7e8ff5e7aa0003';
	const D = '6acc9ac09b7e8ff5e7aa0004';
	const done: AssistantDone = {
		status: 'answered',
		answer: 'x',
		citations: [],
		intent: 'travel',
		stays: [],
	};

	it('turns a city into the hosts with the most active stays there, at most three', async () => {
		const { service, model, members } = makeService({
			counts: [
				{ _id: id(B), stays: 4 },
				{ _id: id(A), stays: 2 },
				{ _id: id(C), stays: 1 },
				{ _id: id(D), stays: 1 },
			],
			// C is not an active host any more; the members come back in another order
			hosts: [
				{ _id: id(D), memberNick: 'dana', memberImage: null },
				{ _id: id(A), memberNick: 'ana', memberImage: 'uploads/member/a.webp' },
				{ _id: id(B), memberNick: 'bo' },
			],
		});
		const result = await service.withHostCards({ ...done, hosts_city: 'BUSAN' });
		expect(result.hostCards).toEqual([
			{ _id: B, memberNick: 'bo', memberImage: null, stays: 4 },
			{ _id: A, memberNick: 'ana', memberImage: 'uploads/member/a.webp', stays: 2 },
			{ _id: D, memberNick: 'dana', memberImage: null, stays: 1 },
		]);
		const match = (model.aggregate.mock.calls[0] as unknown[][])[0][0];
		expect(match).toEqual({
			$match: { propertyStatus: 'ACTIVE', propertyLocation: 'BUSAN' },
		});
		expect((members.find.mock.calls[0] as unknown[])[0]).toMatchObject({
			memberType: 'HOST',
			memberStatus: 'ACTIVE',
		});
	});

	it('does nothing without a known city', async () => {
		const { service, model } = makeService({});
		expect(await service.withHostCards(done)).toBe(done);
		const paris = { ...done, hosts_city: 'PARIS' };
		expect(await service.withHostCards(paris)).toBe(paris);
		expect(model.aggregate).not.toHaveBeenCalled();
	});
});
