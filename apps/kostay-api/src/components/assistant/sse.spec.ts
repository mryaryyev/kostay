import { SseParser, formatSse } from './sse';

describe('SseParser', () => {
	it('returns only complete events and keeps the rest for the next chunk', () => {
		const parser = new SseParser();
		expect(parser.push('event: start\ndata: {"intent":"help"}\n\nevent: del')).toEqual([
			{ event: 'start', data: '{"intent":"help"}' },
		]);
		expect(parser.push('ta\ndata: {"text":"Yes [1]. "}\n\n')).toEqual([
			{ event: 'delta', data: '{"text":"Yes [1]. "}' },
		]);
	});

	it('handles CRLF line ends and several events in one chunk', () => {
		const parser = new SseParser();
		const events = parser.push('event: a\r\ndata: 1\r\n\r\nevent: b\ndata: 2\n\n');
		expect(events.map((e) => e.event)).toEqual(['a', 'b']);
	});

	it('round-trips with formatSse', () => {
		const parser = new SseParser();
		expect(parser.push(formatSse('done', { status: 'answered' }))).toEqual([
			{ event: 'done', data: '{"status":"answered"}' },
		]);
	});
});
