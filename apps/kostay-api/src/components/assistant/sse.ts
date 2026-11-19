/** One Server-Sent Event: `event: <name>` and a JSON `data:` line. */
export interface SseEvent {
	event: string;
	data: string;
}

/**
 * Splits a growing SSE text stream into complete events. Events end with a blank line; the
 * unfinished rest stays in the buffer until more bytes arrive (a chunk can end mid-event).
 */
export class SseParser {
	private buffer = '';

	public push(chunk: string): SseEvent[] {
		this.buffer += chunk.replace(/\r\n/g, '\n');
		const events: SseEvent[] = [];
		let end = this.buffer.indexOf('\n\n');
		while (end !== -1) {
			const block = this.buffer.slice(0, end);
			this.buffer = this.buffer.slice(end + 2);
			const event = parseBlock(block);
			if (event) events.push(event);
			end = this.buffer.indexOf('\n\n');
		}
		return events;
	}
}

function parseBlock(block: string): SseEvent | null {
	let event = 'message';
	const data: string[] = [];
	for (const line of block.split('\n')) {
		if (line.startsWith('event:')) event = line.slice(6).trim();
		else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
	}
	return data.length ? { event, data: data.join('\n') } : null;
}

export function formatSse(event: string, data: unknown): string {
	return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
