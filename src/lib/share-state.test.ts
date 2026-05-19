import { describe, expect, test } from 'vitest';
import {
	applySharedStatePayload,
	buildLiveShareState,
	buildSelectedDaySnapshot,
	buildSelectedSessionSnapshot,
	buildSyncPayload,
	sharedUiStateFromState
} from './share-state.js';
import type { AgendaDay } from './parse.js';
import type { AppState, Block, Flow } from './state.svelte.js';

function block(patch: Partial<Block> = {}): Block {
	return {
		id: patch.id ?? 'id',
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
		parts: patch.parts ?? ['A'],
		minutes: patch.minutes ?? [30],
		warnings: patch.warnings ?? [true],
		notes: patch.notes ?? [''],
		extraInfo: patch.extraInfo ?? '',
		...(patch.startMin !== undefined ? { startMin: patch.startMin } : {})
	};
}

function sharedState(): Pick<AppState, 'palette' | 'dark' | 'showLeft' | 'showCenterEnd' | 'hollow' | 'textOutside' | 'showMin' | 'showFive' | 'showQuarter' | 'segMinutesMode' | 'showSegNotes' | 'showExtraInfo' | 'showSegLabels'> {
	return {
		palette: 'sansad',
		dark: false,
		showLeft: true,
		showCenterEnd: true,
		hollow: true,
		textOutside: false,
		showMin: true,
		showFive: true,
		showQuarter: true,
		segMinutesMode: 'planned',
		showSegNotes: true,
		showExtraInfo: true,
		showSegLabels: true
	};
}

describe('share-state helpers', () => {
	test('builds shared ui state from app state', () => {
		expect(sharedUiStateFromState(sharedState())).toEqual(sharedState());
	});

	test('builds live share state with cloned blocks', () => {
		const state = {
			...sharedState(),
			blocks: [block({ title: 'A' })],
			dayTitle: 'Dag',
			extraInfo: 'Info',
			startMin: 480,
			endMode: 'len' as const,
			clockSpan: 120 as const,
			agendaText: 'text',
			agendaDate: '2026-05-19'
		};
		const live = buildLiveShareState(state);
		live.blocks[0].title = 'B';
		expect(state.blocks[0].title).toBe('A');
		expect(live.shareType).toBe('active-session-live');
		expect(live.clockSpan).toBe(120);
	});

	test('builds selected session snapshot from agenda details', () => {
		const day: AgendaDay = { date: '2026-05-19', flows: [flow({ title: 'Pass', startMin: 9 * 60, parts: ['A', 'B'], minutes: [10, 20] })] };
		const snapshot = buildSelectedSessionSnapshot({ day, flow: day.flows[0], startMin: 9 * 60 }, sharedState(), () => 'id');

		expect(snapshot.shareType).toBe('selected-session-snapshot');
		expect(snapshot.blocks).toHaveLength(2);
		expect(snapshot.agendaText).toContain('@260519');
		expect(snapshot.dayTitle).toBe('Pass');
	});

	test('builds selected day snapshot and falls back to current blocks when no flow is selected', () => {
		const selectedDay: AgendaDay = { date: '2026-05-19', flows: [flow({ title: 'Pass', startMin: 9 * 60 })] };
		const snapshot = buildSelectedDaySnapshot(selectedDay, null, 8 * 60, { ...sharedState(), blocks: [block({ title: 'Fallback' })] }, () => 'id');

		expect(snapshot?.shareType).toBe('selected-day-snapshot');
		expect(snapshot?.dayTitle).toBe('Pass');
		expect(snapshot?.blocks[0].title).toBe('A');
		expect(snapshot?.clockSpan).toBe(720);
	});

	test('builds sync payload and applies shared payload', () => {
		const payload = buildSyncPayload({
			flows: [flow()],
			agendaText: 'a',
			agendaDate: 'b',
			agendaText2: 'c',
			agendaDate2: 'd',
			agendaMeta: {},
			actualTimeLog: []
		});
		expect(payload.flows).toHaveLength(1);
		expect(payload.agendaText2).toBe('c');

		const target = {
			...sharedState(),
			blocks: [block({ title: 'old' })],
			dayTitle: '',
			extraInfo: '',
			startMin: 0,
			endMode: 'end' as const,
			clockSpan: 60 as const,
			agendaText: '',
			agendaDate: ''
		};
		const mode = applySharedStatePayload(target, {
			shareType: 'selected-day-snapshot',
			blocks: [block({ title: 'new' })],
			dayTitle: 'Dag',
			extraInfo: 'Info',
			startMin: 485,
			endMode: 'end',
			clockSpan: 720,
			agendaText: 'x',
			agendaDate: '2026-05-19',
			showFive: false
		});

		expect(mode).toBe('selected-day-snapshot');
		expect(target.blocks[0].title).toBe('new');
		expect(target.clockSpan).toBe(720);
		expect(target.showFive).toBe(false);
	});
});
