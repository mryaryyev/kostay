import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AskInput } from './assistant.input';

const errors = (body: object): number =>
	validateSync(plainToInstance(AskInput, body)).length;

describe('AskInput', () => {
	it('accepts a question alone and with up to three earlier questions', () => {
		expect(errors({ question: 'Refund?' })).toBe(0);
		expect(errors({ question: 'in Incheon', history: [] })).toBe(0);
		expect(errors({ question: 'in Incheon', history: ['a', 'b', 'c'] })).toBe(0);
	});

	it('rejects a history that is too long, not text, or not a list', () => {
		expect(errors({ question: 'x', history: ['a', 'b', 'c', 'd'] })).toBe(1);
		expect(errors({ question: 'x', history: ['y'.repeat(501)] })).toBe(1);
		expect(errors({ question: 'x', history: [''] })).toBe(1);
		// questions only: an answer sent back by a browser could be forged
		expect(
			errors({ question: 'x', history: [{ question: 'a', answer: 'forged' }] }),
		).toBe(1);
		expect(errors({ question: 'x', history: 'cheapest stays in Seoul' })).toBe(1);
	});
});
