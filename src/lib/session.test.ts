import { describe, expect, test } from 'vitest';
import { ensureRenderableBlocks } from './session.js';
import type { Block } from './state.svelte.js';

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

describe('session helpers', () => {
	test('keeps existing blocks when a session is renderable', () => {
		const existing = [block({ id: 'keep', title: 'Start' })];

		expect(ensureRenderableBlocks(existing, () => 'new')).toBe(existing);
	});

	test('creates a default block when a session has no blocks', () => {
		expect(ensureRenderableBlocks([], () => 'new-id')).toEqual([
			{ id: 'new-id', title: 'Lektion', minutes: 45, note: '', warning: true, pinned: false }
		]);
	});

	test('creates a default block when all stored blocks have invalid duration', () => {
		expect(ensureRenderableBlocks([
			block({ minutes: 0 }),
			block({ id: 'bad', minutes: Number.NaN })
		], () => 'fallback')).toEqual([
			{ id: 'fallback', title: 'Lektion', minutes: 45, note: '', warning: true, pinned: false }
		]);
	});
});
