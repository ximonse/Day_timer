import { describe, expect, it } from 'vitest';
import { makeFlowActualEntry } from './flow-actuals.js';
import { createFlowExecution, completeFlowActivity } from './flow-execution.js';
import { upsertActualEntry } from './actuals.js';
import type { Block } from './state.svelte.js';

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

	it('pipeline: completing a flow activity upserts a synced activity entry (mirrors toggleSegmentDone)', () => {
		const blocks: Block[] = [
			{ id: 'a', title: 'Genomgång', minutes: 10, note: '', warning: true, pinned: true },
			{ id: 'b', title: 'Eget', minutes: 15, note: '', warning: true, pinned: true }
		];
		const exec = createFlowExecution(blocks, 480, 480, 'ctx');
		const { state, completion } = completeFlowActivity(exec, 'a', 481);
		expect(completion).not.toBeNull();

		const entry = makeFlowActualEntry({
			date: '2026-06-23',
			agendaDate: '2026-06-23',
			sessionTitle: 'Pass',
			dayTextSnapshot: '',
			completion: completion!
		});
		const log = upsertActualEntry([], entry);

		expect(log).toHaveLength(1);
		expect(log[0]).toMatchObject({
			title: 'Genomgång',
			entryKind: 'activity',
			executionMode: 'flow',
			confirmed: true
		});
		expect(state.bufferMinutes).toBeGreaterThan(0);
		expect(state.allocations[1]).toBe(15);
	});
});
