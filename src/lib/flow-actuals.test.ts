import { describe, expect, it } from 'vitest';
import { makeFlowActualEntry } from './flow-actuals.js';

describe('makeFlowActualEntry', () => {
	it('keeps planned and actual activity time separate', () => {
		const entry = makeFlowActualEntry({
			date: '2026-06-22',
			agendaDate: '2026-06-22',
			sessionTitle: 'Förmiddag',
			dayTextSnapshot: '',
			confirmedAt: 123,
			completion: {
				blockId: 'writing',
				title: 'Skriva',
				plannedMinutes: 30,
				actualMinutes: 18,
				startedAtMin: 480,
				completedAtMin: 498,
				delayBeforeMin: 0,
				delayAfterMin: 0,
				bonusMinutes: 12
			}
		});

		expect(entry).toMatchObject({
			title: 'Skriva',
			durationActualMin: 18,
			plannedDurationMin: 30,
			entryKind: 'activity',
			executionMode: 'flow',
			sessionTitle: 'Förmiddag',
			confirmed: true,
			confirmedAt: 123
		});
	});
});
