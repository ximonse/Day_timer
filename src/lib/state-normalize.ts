import { ensureRenderableBlocks } from './session.js';
import type { AppState, EditorDraft } from './state.svelte.js';

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeDraft(draft: unknown, createId: () => string): EditorDraft | undefined {
	if (!isPlainRecord(draft)) return undefined;
	return {
		dayTitle: typeof draft.dayTitle === 'string' ? draft.dayTitle : '',
		blocks: ensureRenderableBlocks(Array.isArray(draft.blocks) ? draft.blocks as EditorDraft['blocks'] : [], createId),
		extraInfo: typeof draft.extraInfo === 'string' ? draft.extraInfo : '',
		startMin: Number.isFinite(draft.startMin) ? draft.startMin as number : 8 * 60
	};
}

export function normalizePersistedState(state: Partial<AppState>, createId: () => string): Partial<AppState> {
	const next: Partial<AppState> = { ...state };
	if (Array.isArray(state.blocks)) {
		next.blocks = ensureRenderableBlocks(state.blocks, createId);
	}
	const nowDraft = normalizeDraft(state.nowDraft, createId);
	if (nowDraft) next.nowDraft = nowDraft;
	const planDraft = normalizeDraft(state.planDraft, createId);
	if (planDraft) next.planDraft = planDraft;
	if ('agendaMeta' in state && !isPlainRecord(state.agendaMeta)) {
		next.agendaMeta = {};
	}
	if (state.clockSpan !== undefined && state.clockSpan !== 60 && state.clockSpan !== 720) {
		next.clockSpan = 60;
	}
	return next;
}
