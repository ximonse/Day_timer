import { describe, expect, test } from 'vitest';
import { formatFlowSegmentMinutes } from './flow-display.js';
import { completeFlowActivity, createFlowExecution, flowExecutionBlocks } from './flow-execution.js';
import type { Block } from './state.svelte.js';

function block(id: string, minutes: number): Block {
	return { id, title: id.toUpperCase(), minutes, note: '', warning: false, pinned: true };
}

describe('flow display helpers', () => {
	test('shows remaining planned minutes for the active segment', () => {
		expect(formatFlowSegmentMinutes({
			active: true,
			plannedMinutes: 45,
			displayMinutes: 45,
			elapsedMinutes: 11.2
		})).toBe('34m');
	});

	test('shows overrun minutes after the active segment passes its plan', () => {
		expect(formatFlowSegmentMinutes({
			active: true,
			plannedMinutes: 30,
			displayMinutes: 35,
			elapsedMinutes: 34.2
		})).toBe('+4m');
	});

	test('does not count pre-start delay as active work in flow labels', () => {
		const state = createFlowExecution([block('a', 10)], 480, 493);
		const rendered = flowExecutionBlocks(state, 497);
		const elapsedFromDisplayStart = 497 - state.displayStartMin;

		expect(state.displayStartMin).toBe(493);
		expect(formatFlowSegmentMinutes({
			active: true,
			plannedMinutes: state.allocations[0],
			displayMinutes: rendered[0].minutes,
			elapsedMinutes: elapsedFromDisplayStart
		})).toBe('6m');
		expect(completeFlowActivity(state, 'a', 497).completion?.actualMinutes).toBe(4);
	});

	test('keeps non-active segments as plain minute labels', () => {
		expect(formatFlowSegmentMinutes({
			active: false,
			plannedMinutes: 30,
			displayMinutes: 38,
			elapsedMinutes: 0
		})).toBe('38m');
	});
});
