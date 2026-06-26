import { describe, expect, test } from 'vitest';
import { adjustAgendaItemsForFlowRun } from './flow-agenda.js';

describe('flow agenda timing', () => {
	test('extends the active agenda item and shifts later items when flow run overruns', () => {
		const items = [
			{ flow: { title: 'Före' }, startMin: 8 * 60, totalMin: 30 },
			{ flow: { title: 'Aktiv' }, startMin: 9 * 60, totalMin: 45 },
			{ flow: { title: 'Efter' }, startMin: 10 * 60, totalMin: 30 }
		];

		expect(adjustAgendaItemsForFlowRun(items, { title: 'Aktiv', startMin: 9 * 60 }, 45, 9 * 60 + 49)).toEqual([
			{ flow: { title: 'Före' }, startMin: 8 * 60, totalMin: 30 },
			{ flow: { title: 'Aktiv' }, startMin: 9 * 60, totalMin: 49 },
			{ flow: { title: 'Efter' }, startMin: 10 * 60 + 4, totalMin: 30 }
		]);
	});

	test('keeps agenda items unchanged while the flow run is still within plan', () => {
		const items = [
			{ flow: { title: 'Aktiv' }, startMin: 9 * 60, totalMin: 45 },
			{ flow: { title: 'Efter' }, startMin: 10 * 60, totalMin: 30 }
		];

		expect(adjustAgendaItemsForFlowRun(items, { title: 'Aktiv', startMin: 9 * 60 }, 45, 9 * 60 + 40)).toBe(items);
	});
});
