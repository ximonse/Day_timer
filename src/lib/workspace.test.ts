import { describe, expect, test } from 'vitest';
import {
	DEFAULT_WORKSPACE_PREFERENCES,
	applyWorkspaceDataToAppState,
	isWorkspaceMeaningfullyEmpty,
	legacySyncPayloadFromWorkspaceData,
	workspaceDataFromAppState,
	workspaceDataFromSyncResponse
} from './workspace.js';
import type { AppState, Block, EditorDraft, Flow } from './state.svelte.js';

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

function syncableState(overrides: Partial<AppState> = {}): Pick<AppState,
	'flows' | 'agendaText' | 'agendaDate' | 'agendaText2' | 'agendaDate2' | 'agendaMeta' |
	'actualTimeLog' | 'nowDraft' | 'planDraft' | 'palette' | 'dark' | 'clockSpan' | 'endMode' |
	'agendaView' | 'showSegNotes' | 'showExtraInfo' | 'showSegLabels' | 'showLeft' |
	'showCenterEnd' | 'hollow' | 'textOutside' | 'showMin' | 'showFive' | 'showQuarter' |
	'segMinutesMode'
> {
	return {
		flows: overrides.flows ?? [flow()],
		agendaText: overrides.agendaText ?? '@260522',
		agendaDate: overrides.agendaDate ?? '2026-05-22',
		agendaText2: overrides.agendaText2 ?? '',
		agendaDate2: overrides.agendaDate2 ?? '',
		agendaMeta: overrides.agendaMeta ?? { a: { source: 'manual' } },
		actualTimeLog: overrides.actualTimeLog ?? [],
		nowDraft: overrides.nowDraft ?? draft({ dayTitle: 'Nu' }),
		planDraft: overrides.planDraft ?? draft({ dayTitle: 'Plan', blocks: [block({ title: 'Plan' })] }),
		palette: overrides.palette ?? 'meadow',
		dark: overrides.dark ?? true,
		clockSpan: overrides.clockSpan ?? 720,
		endMode: overrides.endMode ?? 'len',
		agendaView: overrides.agendaView ?? 'private',
		showSegNotes: overrides.showSegNotes ?? false,
		showExtraInfo: overrides.showExtraInfo ?? false,
		showSegLabels: overrides.showSegLabels ?? false,
		showLeft: overrides.showLeft ?? false,
		showCenterEnd: overrides.showCenterEnd ?? false,
		hollow: overrides.hollow ?? false,
		textOutside: overrides.textOutside ?? true,
		showMin: overrides.showMin ?? false,
		showFive: overrides.showFive ?? false,
		showQuarter: overrides.showQuarter ?? false,
		segMinutesMode: overrides.segMinutesMode ?? 'remaining'
	};
}

describe('workspace helpers', () => {
	test('roundtrips syncable workspace data without sharing references', () => {
		const source = syncableState();
		const workspace = workspaceDataFromAppState(source);
		const target = syncableState({
			flows: [],
			agendaText: '',
			agendaDate: '',
			agendaText2: '',
			agendaDate2: '',
			agendaMeta: {},
			nowDraft: draft(),
			planDraft: draft(),
			palette: 'sansad',
			dark: false,
			clockSpan: 60,
			endMode: 'end',
			agendaView: 'school',
			showSegNotes: true,
			showExtraInfo: true,
			showSegLabels: true,
			showLeft: true,
			showCenterEnd: true,
			hollow: true,
			textOutside: false,
			showMin: true,
			showFive: true,
			showQuarter: true,
			segMinutesMode: 'planned'
		});

		applyWorkspaceDataToAppState(target, workspace);
		target.flows[0].title = 'Muterad';
		target.nowDraft.blocks[0].title = 'Ändrad';

		expect(workspace.flows[0].title).toBe('Flow');
		expect(workspace.drafts.now.blocks[0].title).toBe('Lektion');
		expect(target.agendaView).toBe('private');
		expect(target.segMinutesMode).toBe('remaining');
	});

	test('treats default workspace as empty and custom preferences as meaningful', () => {
		const emptyWorkspace = workspaceDataFromAppState(syncableState({
			flows: [],
			agendaText: '',
			agendaDate: '',
			agendaText2: '',
			agendaDate2: '',
			agendaMeta: {},
			nowDraft: draft(),
			planDraft: draft(),
			palette: DEFAULT_WORKSPACE_PREFERENCES.palette,
			dark: DEFAULT_WORKSPACE_PREFERENCES.dark,
			clockSpan: DEFAULT_WORKSPACE_PREFERENCES.clockSpan,
			endMode: DEFAULT_WORKSPACE_PREFERENCES.endMode,
			agendaView: DEFAULT_WORKSPACE_PREFERENCES.agendaView,
			showSegNotes: DEFAULT_WORKSPACE_PREFERENCES.showSegNotes,
			showExtraInfo: DEFAULT_WORKSPACE_PREFERENCES.showExtraInfo,
			showSegLabels: DEFAULT_WORKSPACE_PREFERENCES.showSegLabels,
			showLeft: DEFAULT_WORKSPACE_PREFERENCES.showLeft,
			showCenterEnd: DEFAULT_WORKSPACE_PREFERENCES.showCenterEnd,
			hollow: DEFAULT_WORKSPACE_PREFERENCES.hollow,
			textOutside: DEFAULT_WORKSPACE_PREFERENCES.textOutside,
			showMin: DEFAULT_WORKSPACE_PREFERENCES.showMin,
			showFive: DEFAULT_WORKSPACE_PREFERENCES.showFive,
			showQuarter: DEFAULT_WORKSPACE_PREFERENCES.showQuarter,
			segMinutesMode: DEFAULT_WORKSPACE_PREFERENCES.segMinutesMode
		}));
		const withPreferenceChange = workspaceDataFromAppState(syncableState({
			flows: [],
			agendaText: '',
			agendaDate: '',
			agendaText2: '',
			agendaDate2: '',
			agendaMeta: {},
			nowDraft: draft(),
			planDraft: draft(),
			palette: 'bright'
		}));

		expect(isWorkspaceMeaningfullyEmpty(emptyWorkspace)).toBe(true);
		expect(isWorkspaceMeaningfullyEmpty(withPreferenceChange)).toBe(false);
	});

	test('reads both legacy sync payloads and workspace envelopes', () => {
		const workspace = workspaceDataFromAppState(syncableState());
		const legacy = legacySyncPayloadFromWorkspaceData(workspace);
		const fromLegacy = workspaceDataFromSyncResponse(legacy, () => 'legacy-id');
		const fromEnvelope = workspaceDataFromSyncResponse({ workspace }, () => 'envelope-id');

		expect(fromLegacy?.agenda.schoolText).toBe('@260522');
		expect(fromLegacy?.preferences.palette).toBe('meadow');
		expect(fromEnvelope?.drafts.plan.dayTitle).toBe('Plan');
		expect(fromEnvelope?.preferences.clockSpan).toBe(720);
	});
});
