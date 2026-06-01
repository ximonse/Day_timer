import { describe, expect, test } from 'vitest';
import { allocateBlockMinutes, createCurrentFallbackSession, createSessionStateFromFlow, ensureRenderableBlocks, flowToBlocks, hasRunnableSessionContent, makeFlowFromSession } from './session.js';
import type { Block, Flow } from './state.svelte.js';

function block(patch: Partial<Block> = {}): Block {
	return {
		id: patch.id ?? 'existing',
		title: patch.title ?? 'Lektion',
		minutes: patch.minutes ?? 45,
		note: patch.note ?? '',
		warning: patch.warning ?? true,
		pinned: patch.pinned ?? false
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
		expect(flowToBlocks(flow(), () => `id-${++i}`, {
			pinned: (minutes) => minutes > 15,
			warning: true
		})).toEqual([
			{ id: 'id-1', title: 'A', minutes: 10, note: 'Note A', warning: true, pinned: false },
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
			blocks: [block({ title: 'One', minutes: 30, warning: false }), block({ title: 'Two', minutes: 15, note: 'n' })],
			extraInfo: 'Extra',
			startMin: 480
		}, () => 'new')).toEqual({
			id: 'existing',
			title: 'Pass',
			parts: ['One', 'Two'],
			minutes: [30, 15],
			warnings: [false, true],
			notes: ['', 'n'],
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
});
