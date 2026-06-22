import { describe, expect, it } from 'vitest';
import {
	activeFlowBlockId,
	completeFlowActivity,
	createFlowExecution,
	flowExecutionBlocks,
	pauseFlowExecution,
	rebindFlowExecutionBlocks,
	resumeFlowExecution
} from './flow-execution.js';
import type { Block } from './state.svelte.js';

function block(id: string, minutes: number): Block {
	return { id, title: id.toUpperCase(), minutes, note: '', warning: true, pinned: true };
}

describe('flow execution', () => {
	it('adds saved time to the next activity when the plan is on time', () => {
		const initial = createFlowExecution([block('a', 30), block('b', 30)], 480, 480);
		const result = completeFlowActivity(initial, 'a', 500);

		expect(result.completion).toMatchObject({ actualMinutes: 20, bonusMinutes: 10, delayAfterMin: 0 });
		expect(result.state.allocations).toEqual([30, 40]);
		expect(flowExecutionBlocks(result.state, 500).map(item => item.minutes)).toEqual([20, 40]);
		expect(activeFlowBlockId(result.state)).toBe('b');
	});

	it('uses saved time to catch up before giving bonus time', () => {
		const initial = createFlowExecution([block('a', 30), block('b', 30)], 480, 490);
		const result = completeFlowActivity(initial, 'a', 500);

		expect(result.completion).toMatchObject({ actualMinutes: 10, bonusMinutes: 10, delayBeforeMin: 10, delayAfterMin: 0 });
		expect(result.state.allocations).toEqual([30, 40]);
		expect(flowExecutionBlocks(result.state, 500).map(item => item.minutes)).toEqual([10, 40]);
	});

	it('starts the next activity without bonus while the plan remains behind', () => {
		const initial = createFlowExecution([block('a', 30), block('b', 30)], 480, 495);
		const result = completeFlowActivity(initial, 'a', 515);

		expect(result.completion).toMatchObject({ actualMinutes: 20, bonusMinutes: 0, delayAfterMin: 5 });
		expect(result.state.allocations).toEqual([30, 30]);
		expect(activeFlowBlockId(result.state)).toBe('b');
	});

	it('creates a rest block after the final activity when bonus remains', () => {
		const initial = createFlowExecution([block('a', 30)], 480, 480);
		const result = completeFlowActivity(initial, 'a', 500);
		const rendered = flowExecutionBlocks(result.state, 500);

		expect(result.state.status).toBe('rest');
		expect(result.state.restMinutes).toBe(10);
		expect(rendered.map(item => [item.title, item.minutes])).toEqual([['A', 20], ['*', 10]]);
	});

	it('pushes the whole remaining plan when an activity overruns', () => {
		const initial = createFlowExecution([block('a', 30), block('b', 30), block('c', 30)], 480, 480);
		const result = completeFlowActivity(initial, 'a', 520);

		expect(result.completion).toMatchObject({ actualMinutes: 40, delayAfterMin: 10, bonusMinutes: 0 });
		expect(flowExecutionBlocks(result.state, 520).map(item => item.minutes)).toEqual([40, 30, 30]);
	});

	it('keeps visual allocations in whole minutes when started mid-minute', () => {
		const initial = createFlowExecution([block('a', 30)], 480, 480.5);
		const result = completeFlowActivity(initial, 'a', 481.5);

		expect(result.state.delayMin).toBe(0);
		expect(result.state.restMinutes).toBe(29);
	});

	it('rebinds temporary block ids after a reload', () => {
		const initial = createFlowExecution([block('a', 30), block('b', 30)], 480, 480, 'today');
		const completed = completeFlowActivity(initial, 'a', 500).state;
		const rebound = rebindFlowExecutionBlocks(completed, [block('new-a', 30), block('new-b', 30)]);

		expect(rebound.completions[0].blockId).toBe('new-a');
		expect(activeFlowBlockId(rebound)).toBe('new-b');
	});

	it('does not count a paused fixed session as active work', () => {
		const initial = createFlowExecution([block('a', 30)], 480, 480);
		const paused = pauseFlowExecution(initial, 490);
		const resumed = resumeFlowExecution(paused, 520);
		const result = completeFlowActivity(resumed, 'a', 530);

		expect(result.completion?.actualMinutes).toBe(20);
	});
});
