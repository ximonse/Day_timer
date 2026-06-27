import { describe, expect, test } from 'vitest';
import { allocateBlockMinutes, completeActiveSegment, createCurrentFallbackSession, createSessionStateFromFlow, effectiveRunUntilCheckedBlocks, finalizeRunUntilCheckedSegment, ensureRenderableBlocks, flowToBlocks, hasRunnableSessionContent, makeFlowFromSession, showSegmentDoneControl, undoCompletedSegment, undoFinalizedRunUntilCheckedSegment } from './session.js';
import type { Block, Flow } from './state.svelte.js';

function block(patch: Partial<Block> = {}): Block {
	return {
		id: patch.id ?? 'existing',
		title: patch.title ?? 'Lektion',
		minutes: patch.minutes ?? 45,
		note: patch.note ?? '',
		warning: patch.warning ?? true,
		pinned: patch.pinned ?? false,
		...(patch.runUntilChecked !== undefined ? { runUntilChecked: patch.runUntilChecked } : {})
	};
}

function flow(patch: Partial<Flow> = {}): Flow {
	return {
		id: patch.id ?? 'flow',
		title: patch.title ?? 'Flow',
		parts: patch.parts ?? ['A', 'B'],
		minutes: patch.minutes ?? [10, 20],
		warnings: patch.warnings ?? [false, true],
		notes: patch.notes ?? ['Note A', 'Note B'],
		extraInfo: patch.extraInfo ?? 'Info',
		runUntilChecked: patch.runUntilChecked,
		startMin: patch.startMin
	};
}

describe('session helpers', () => {
	test('keeps existing blocks when a session is renderable', () => {
		const existing = [block({ id: 'keep', title: 'Start' })];

		expect(ensureRenderableBlocks(existing, () => 'new')).toBe(existing);
	});

	test('keeps empty sessions empty', () => {
		expect(ensureRenderableBlocks([], () => 'new-id')).toEqual([]);
	});

	test('drops invalid-duration sessions to empty', () => {
		expect(ensureRenderableBlocks([
			block({ minutes: 0 }),
			block({ id: 'bad', minutes: Number.NaN })
		], () => 'fallback')).toEqual([]);
	});

	test('maps a flow to blocks', () => {
		let i = 0;
		expect(flowToBlocks(flow({ runUntilChecked: [true, false] }), () => `id-${++i}`, {
			pinned: (minutes) => minutes > 15,
			warning: true
		})).toEqual([
			{ id: 'id-1', title: 'A', minutes: 10, note: 'Note A', warning: true, pinned: false, runUntilChecked: true },
			{ id: 'id-2', title: 'B', minutes: 20, note: 'Note B', warning: true, pinned: true }
		]);
	});

	test('builds session state from a flow', () => {
		let i = 0;
		expect(createSessionStateFromFlow(flow(), () => `id-${++i}`, {
			startMin: 540,
			clockSpan: 60,
			pinned: true
		})).toEqual({
			dayTitle: 'Flow',
			blocks: [
				{ id: 'id-1', title: 'A', minutes: 10, note: 'Note A', warning: false, pinned: true },
				{ id: 'id-2', title: 'B', minutes: 20, note: 'Note B', warning: true, pinned: true }
			],
			extraInfo: 'Info',
			startMin: 540,
			clockSpan: 60
		});
	});

	test('makes a flow from the current session', () => {
		expect(makeFlowFromSession({
			id: 'existing',
			title: '  Pass  ',
			blocks: [block({ title: 'One', minutes: 30, warning: false, runUntilChecked: true }), block({ title: 'Two', minutes: 15, note: 'n' })],
			extraInfo: 'Extra',
			startMin: 480
		}, () => 'new')).toEqual({
			id: 'existing',
			title: 'Pass',
			parts: ['One', 'Two'],
			minutes: [30, 15],
			warnings: [false, true],
			notes: ['', 'n'],
			runUntilChecked: [true, false],
			extraInfo: 'Extra',
			startMin: 480
		});
	});

	test('creates a generated flow id when the session has none', () => {
		expect(makeFlowFromSession({
			title: 'Draft',
			blocks: [block({ title: 'Only' })],
			extraInfo: ''
		}, () => 'generated')).toMatchObject({
			id: 'generated',
			title: 'Draft'
		});
	});

	test('creates a fallback session at the nearest 5-minute mark', () => {
		expect(createCurrentFallbackSession(483, () => 'fallback')).toEqual({
			dayTitle: 'Inget pass just nu',
			extraInfo: '',
			startMin: 485,
			blocks: []
		});
	});

	test('does not treat empty placeholder blocks as runnable', () => {
		expect(hasRunnableSessionContent([
			block({ title: '', minutes: 10, note: '' })
		])).toBe(false);
	});

	test('treats named or noted blocks as runnable', () => {
		expect(hasRunnableSessionContent([
			block({ title: 'Start', minutes: 10, note: '' })
		])).toBe(true);
		expect(hasRunnableSessionContent([
			block({ title: '', minutes: 10, note: 'Kom ihåg' })
		])).toBe(true);
	});

	test('distributes a new total evenly across unpinned blocks', () => {
		expect(allocateBlockMinutes([
			block({ minutes: 60, pinned: false }),
			block({ minutes: 2, pinned: false }),
			block({ minutes: 2, pinned: false })
		], 90)).toEqual([30, 30, 30]);
	});

	test('keeps pinned blocks and distributes remaining total across unpinned blocks', () => {
		expect(allocateBlockMinutes([
			block({ minutes: 15, pinned: true }),
			block({ minutes: 20, pinned: false }),
			block({ minutes: 25, pinned: false })
		], 75)).toEqual([15, 30, 30]);
	});

	test('scales all blocks proportionally when every block is pinned', () => {
		expect(allocateBlockMinutes([
			block({ minutes: 10, pinned: true }),
			block({ minutes: 20, pinned: true })
		], 60)).toEqual([20, 40]);
	});

	test('moves an active segment remainder only to the directly following segment', () => {
		expect(completeActiveSegment([20, 10, 15], 0, 6)).toEqual({
			minutes: [6, 24, 15],
			savedMinutes: 14
		});
	});

	test('restores transferred time from the directly following segment', () => {
		expect(undoCompletedSegment([6, 24, 15], 0, 14)).toEqual([20, 10, 15]);
	});

	test('shortens the final active segment without transferring time', () => {
		expect(completeActiveSegment([10, 20], 1, 7)).toEqual({
			minutes: [10, 7],
			savedMinutes: 13
		});
	});

	test('shows completion for the active segment and undo only for the latest completed segment', () => {
		expect(showSegmentDoneControl('active', 'active', ['done-a'])).toBe(true);
		expect(showSegmentDoneControl('done-b', 'active', ['done-a', 'done-b'])).toBe(true);
		expect(showSegmentDoneControl('done-a', 'active', ['done-a', 'done-b'])).toBe(false);
		expect(showSegmentDoneControl('future', 'active', ['done-a'])).toBe(false);
	});

	test('keeps a run-until-checked segment active after its planned end', () => {
		const effective = effectiveRunUntilCheckedBlocks([
			block({ id: 'a', minutes: 10, runUntilChecked: true }),
			block({ id: 'b', minutes: 5 })
		], 14);

		expect(effective.map(item => item.minutes)).toEqual([15, 5]);
		expect(effective[0].runUntilChecked).toBe(true);
	});

	test('keeps a completed static run-until segment at planned duration', () => {
		const blocks = [
			block({ id: 'a', minutes: 10, runUntilChecked: true }),
			block({ id: 'b', minutes: 5 })
		];
		const effective = effectiveRunUntilCheckedBlocks(blocks, 14, ['a']);

		expect(effective.map(item => item.minutes)).toEqual([10, 5]);
		expect(blocks.map(item => item.minutes)).toEqual([10, 5]);
		expect(effective[0].runUntilChecked).toBe(true);
	});
	test('finalizes run-until-checked to elapsed time and clears the flag', () => {
		const result = finalizeRunUntilCheckedSegment([
			block({ id: 'a', minutes: 10, runUntilChecked: true }),
			block({ id: 'b', minutes: 5 })
		], 0, 14);

		expect(result.blocks.map(item => item.minutes)).toEqual([14, 5]);
		expect(result.blocks[0].runUntilChecked).toBeFalsy();
		expect(result.deltaMin).toBe(4);
	});

	test('keeps total duration when run-until-checked finishes early before another segment', () => {
		const result = finalizeRunUntilCheckedSegment([
			block({ id: 'a', minutes: 10, runUntilChecked: true }),
			block({ id: 'b', minutes: 5 })
		], 0, 6);

		expect(result.blocks.map(item => item.minutes)).toEqual([6, 9]);
		expect(result.blocks[0].runUntilChecked).toBeFalsy();
		expect(result.deltaMin).toBe(0);
		expect(result.movedToNextMin).toBe(4);
		expect(result.fillerBlockId).toBeNull();
		expect(result.prevMinutes).toBe(10);
	});

	test('appends a filler block to keep end time when the last run-until-checked segment finishes early', () => {
		const result = finalizeRunUntilCheckedSegment([
			block({ id: 'a', minutes: 5 }),
			block({ id: 'b', minutes: 10, runUntilChecked: true })
		], 1, 6, () => 'filler');

		expect(result.blocks.map(item => item.minutes)).toEqual([5, 6, 4]);
		expect(result.blocks[2]).toMatchObject({ id: 'filler', minutes: 4, title: 'Ställtid' });
		expect(result.fillerBlockId).toBe('filler');
		expect(result.movedToNextMin).toBe(0);
		expect(result.prevMinutes).toBe(10);
	});

	test('restores a finalized run-until-checked segment that moved time to the next block', () => {
		const restored = undoFinalizedRunUntilCheckedSegment([
			block({ id: 'a', minutes: 6 }),
			block({ id: 'b', minutes: 9 })
		], 0, 10, 4, null);

		expect(restored.map(item => item.minutes)).toEqual([10, 5]);
		expect(restored[0].runUntilChecked).toBe(true);
	});

	test('restores a finalized run-until-checked segment by removing its filler block', () => {
		const restored = undoFinalizedRunUntilCheckedSegment([
			block({ id: 'a', minutes: 5 }),
			block({ id: 'b', minutes: 6 }),
			block({ id: 'filler', minutes: 4, title: 'Ställtid' })
		], 1, 10, 0, 'filler');

		expect(restored.map(item => item.id)).toEqual(['a', 'b']);
		expect(restored[1]).toMatchObject({ minutes: 10, runUntilChecked: true });
	});
});
