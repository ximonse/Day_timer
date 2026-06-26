import { describe, expect, it } from 'vitest';
import {
	activeFlowBlockId,
	completeFlowActivity,
	createFlowExecution,
	finishFlowExecution,
	flowExecutionBlocks,
	pauseFlowExecution,
	rebindFlowExecutionBlocks,
	resumeFlowExecution,
	startFlowRest
} from './flow-execution.js';
import type { Block } from './state.svelte.js';

function block(id: string, minutes: number): Block {
	return { id, title: id.toUpperCase(), minutes, note: '', warning: true, pinned: true };
}

describe('flow execution', () => {
	it('routes saved time to the end buffer, not the next activity', () => {
		const initial = createFlowExecution([block('a', 30), block('b', 30)], 480, 480);
		const result = completeFlowActivity(initial, 'a', 500);

		expect(result.completion).toMatchObject({ actualMinutes: 20, bonusMinutes: 10, delayAfterMin: 0 });
		expect(result.state.allocations).toEqual([30, 30]);
		expect(result.state.bufferMinutes).toBe(10);
		expect(flowExecutionBlocks(result.state, 500).map(item => [item.title, item.minutes])).toEqual([['A', 20], ['B', 30], ['*', 10]]);
		expect(activeFlowBlockId(result.state)).toBe('b');
	});

	it('uses saved time to catch up delay before routing remainder to buffer', () => {
		const initial = createFlowExecution([block('a', 30), block('b', 30)], 480, 490);
		const result = completeFlowActivity(initial, 'a', 500);

		expect(result.completion).toMatchObject({ actualMinutes: 10, bonusMinutes: 10, delayBeforeMin: 10, delayAfterMin: 0 });
		expect(result.state.allocations).toEqual([30, 30]);
		expect(result.state.bufferMinutes).toBe(10);
		expect(flowExecutionBlocks(result.state, 500).map(item => [item.title, item.minutes])).toEqual([['A', 10], ['B', 30], ['*', 10]]);
	});

	it('starts the next activity without bonus while the plan remains behind', () => {
		const initial = createFlowExecution([block('a', 30), block('b', 30)], 480, 495);
		const result = completeFlowActivity(initial, 'a', 515);

		expect(result.completion).toMatchObject({ actualMinutes: 20, bonusMinutes: 0, delayAfterMin: 5 });
		expect(result.state.allocations).toEqual([30, 30]);
		expect(result.state.bufferMinutes).toBe(0);
		expect(activeFlowBlockId(result.state)).toBe('b');
	});

	it('routes bonus to buffer after the final activity', () => {
		const initial = createFlowExecution([block('a', 30)], 480, 480);
		const result = completeFlowActivity(initial, 'a', 500);
		const rendered = flowExecutionBlocks(result.state, 500);

		expect(result.state.status).toBe('complete');
		expect(result.state.bufferMinutes).toBe(10);
		expect(result.state.restMinutes).toBe(0);
		expect(rendered.map(item => [item.title, item.minutes])).toEqual([['A', 20], ['*', 10]]);
	});

	it('accumulates delay when an activity overruns, next activities keep their planned time', () => {
		const initial = createFlowExecution([block('a', 30), block('b', 30), block('c', 30)], 480, 480);
		const result = completeFlowActivity(initial, 'a', 520);

		expect(result.completion).toMatchObject({ actualMinutes: 40, delayAfterMin: 10, bonusMinutes: 0 });
		expect(result.state.bufferMinutes).toBe(0);
		expect(flowExecutionBlocks(result.state, 520).map(item => item.minutes)).toEqual([40, 30, 30]);
	});

	it('keeps the current activity visually active at its planned boundary until checked', () => {
		const initial = createFlowExecution([block('a', 30), block('b', 30)], 480, 480);
		const rendered = flowExecutionBlocks(initial, 510);

		expect(activeFlowBlockId(initial)).toBe('a');
		expect(rendered.map(item => item.minutes)).toEqual([31, 30]);
		expect(rendered[0].runUntilChecked).toBe(true);
	});

	it('keeps visual allocations in whole minutes when started mid-minute', () => {
		const initial = createFlowExecution([block('a', 30)], 480, 480.5);
		const result = completeFlowActivity(initial, 'a', 481.5);

		expect(result.state.delayMin).toBe(0);
		expect(result.state.bufferMinutes).toBe(29);
		expect(result.state.restMinutes).toBe(0);
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

	it('completed block shrinks to actual time, saved time moves to the end buffer', () => {
		const initial = createFlowExecution([block('a', 30)], 480, 480);
		const result = completeFlowActivity(initial, 'a', 500);

		expect(result.completion).toMatchObject({ actualMinutes: 20, bonusMinutes: 10 });
		expect(result.state.status).toBe('complete');
		expect(result.state.bufferMinutes).toBe(10);
		expect(result.state.restMinutes).toBe(0);
		expect(flowExecutionBlocks(result.state, 500).map(item => [item.title, item.minutes])).toEqual([['A', 20], ['*', 10]]);
	});

	it('can start rest from buffer time, clearing the buffer', () => {
		const initial = createFlowExecution([block('a', 30)], 480, 480);
		const completed = completeFlowActivity(initial, 'a', 500).state;
		expect(completed.bufferMinutes).toBe(10);
		const resting = startFlowRest(completed, 10, 500);

		expect(resting.status).toBe('rest');
		expect(resting.restStartedAtMin).toBe(500);
		expect(resting.bufferMinutes).toBe(0);
		expect(flowExecutionBlocks(resting, 500).map(item => [item.title, item.minutes])).toEqual([['A', 20], ['*', 10]]);
	});

	it('finishFlowExecution clears buffer and rest and shows only actual blocks', () => {
		const initial = createFlowExecution([block('a', 30)], 480, 480);
		const completed = completeFlowActivity(initial, 'a', 500).state;
		expect(completed.bufferMinutes).toBe(10);
		const finished = finishFlowExecution(completed);

		expect(finished.status).toBe('complete');
		expect(finished.bufferMinutes).toBe(0);
		expect(finished.restMinutes).toBe(0);
		expect(flowExecutionBlocks(finished, 500).map(item => [item.title, item.minutes])).toEqual([['A', 20]]);
	});

	it('carries the context key on the execution state', () => {
		const initial = createFlowExecution([block('a', 30)], 480, 480, 'mon|agenda|Pass');
		expect(initial.contextKey).toBe('mon|agenda|Pass');
		const completed = completeFlowActivity(initial, 'a', 500).state;
		expect(completed.contextKey).toBe('mon|agenda|Pass');
	});
});
