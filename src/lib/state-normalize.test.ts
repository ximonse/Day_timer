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

	test('keeps non-renderable persisted blocks empty', () => {
		const result = normalizePersistedState({ blocks: [block({ minutes: 0 })] }, () => 'fallback');

		expect(result.blocks).toEqual([]);
	});

	test('normalizes now and plan drafts independently', () => {
		const result = normalizePersistedState({
			nowDraft: draft({ blocks: [] }),
			planDraft: draft({ blocks: [block({ minutes: Number.NaN })] })
		}, () => 'draft-id');

		expect(result.nowDraft?.blocks).toEqual([]);
		expect(result.planDraft?.blocks).toEqual([]);
	});

	test('drops invalid agenda metadata containers', () => {
		expect(normalizePersistedState({ agendaMeta: null } as never, () => 'new').agendaMeta).toEqual({});
		expect(normalizePersistedState({ agendaMeta: [] } as never, () => 'new').agendaMeta).toEqual({});
	});

	test('keeps valid agenda metadata containers', () => {
		const agendaMeta = { key: { source: 'manual' as const } };

		expect(normalizePersistedState({ agendaMeta }, () => 'new').agendaMeta).toBe(agendaMeta);
	});

	test('migrates the removed 2h clock span to 1h', () => {
		expect(normalizePersistedState({ clockSpan: 120 } as never, () => 'new').clockSpan).toBe(60);
	});

	test('keeps supported clock spans untouched', () => {
		expect(normalizePersistedState({ clockSpan: 720 }, () => 'new').clockSpan).toBe(720);
		expect(normalizePersistedState({ clockSpan: 60 }, () => 'new').clockSpan).toBe(60);
	});
});
