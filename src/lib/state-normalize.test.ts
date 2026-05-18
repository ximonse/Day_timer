import { describe, expect, test } from 'vitest';
import { normalizePersistedState } from './state-normalize.js';
import type { Block, EditorDraft } from './state.svelte.js';

function block(patch: Partial<Block> = {}): Block {
	return {
		id: patch.id ?? 'block',
		title: patch.title ?? 'Lektion',
		minutes: patch.minutes ?? 45,
		note: patch.note ?? '',
		warning: patch.warning ?? true,
		pinned: patch.pinned ?? false
	};
}

function draft(patch: Partial<EditorDraft> = {}): EditorDraft {
	return {
		dayTitle: patch.dayTitle ?? '',
		blocks: patch.blocks ?? [block()],
		extraInfo: patch.extraInfo ?? '',
		startMin: patch.startMin ?? 8 * 60
	};
}

describe('normalizePersistedState', () => {
	test('keeps renderable persisted blocks', () => {
		const result = normalizePersistedState({ blocks: [block({ id: 'keep', minutes: 20 })] }, () => 'new');

		expect(result.blocks).toEqual([block({ id: 'keep', minutes: 20 })]);
	});

	test('replaces empty or non-renderable persisted blocks', () => {
		const result = normalizePersistedState({ blocks: [block({ minutes: 0 })] }, () => 'fallback');

		expect(result.blocks).toEqual([
			{ id: 'fallback', title: 'Lektion', minutes: 45, note: '', warning: true, pinned: false }
		]);
	});

	test('normalizes now and plan drafts independently', () => {
		const result = normalizePersistedState({
			nowDraft: draft({ blocks: [] }),
			planDraft: draft({ blocks: [block({ minutes: Number.NaN })] })
		}, () => 'draft-id');

		expect(result.nowDraft?.blocks).toEqual([
			{ id: 'draft-id', title: 'Lektion', minutes: 45, note: '', warning: true, pinned: false }
		]);
		expect(result.planDraft?.blocks).toEqual([
			{ id: 'draft-id', title: 'Lektion', minutes: 45, note: '', warning: true, pinned: false }
		]);
	});

	test('drops invalid agenda metadata containers', () => {
		expect(normalizePersistedState({ agendaMeta: null } as never, () => 'new').agendaMeta).toEqual({});
		expect(normalizePersistedState({ agendaMeta: [] } as never, () => 'new').agendaMeta).toEqual({});
	});

	test('keeps valid agenda metadata containers', () => {
		const agendaMeta = { key: { source: 'manual' as const } };

		expect(normalizePersistedState({ agendaMeta }, () => 'new').agendaMeta).toBe(agendaMeta);
	});
});
