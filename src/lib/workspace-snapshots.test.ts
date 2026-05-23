import { describe, expect, test } from 'vitest';
import { appendWorkspaceSnapshot, createWorkspaceSnapshot, summarizeWorkspaceSnapshots } from './workspace-snapshots.js';
import { workspaceDataFromAppState } from './workspace.js';
import type { AppState } from './state.svelte.js';

function state(title: string): Pick<AppState,
	'flows' | 'agendaText' | 'agendaDate' | 'agendaText2' | 'agendaDate2' | 'agendaMeta' |
	'actualTimeLog' | 'nowDraft' | 'planDraft' | 'palette' | 'dark' | 'clockSpan' | 'endMode' |
	'agendaView' | 'showSegNotes' | 'showExtraInfo' | 'showSegLabels' | 'showLeft' |
	'showCenterEnd' | 'hollow' | 'textOutside' | 'showMin' | 'showFive' | 'showQuarter' |
	'segMinutesMode'
> {
	const block = { id: 'block', title, minutes: 45, note: '', warning: true, pinned: false };
	const draft = { dayTitle: title, blocks: [block], extraInfo: '', startMin: 8 * 60 };
	return {
		flows: [],
		agendaText: '',
		agendaDate: '',
		agendaText2: '',
		agendaDate2: '',
		agendaMeta: {},
		actualTimeLog: [],
		nowDraft: draft,
		planDraft: draft,
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
	};
}

describe('workspace snapshots', () => {
	test('creates immutable snapshot metadata around a workspace revision', () => {
		const workspace = workspaceDataFromAppState(state('Start'), 7);
		const snapshot = createWorkspaceSnapshot(workspace, 'manual-save', 'snap-1', '2026-05-23T12:00:00.000Z');
		workspace.drafts.now.dayTitle = 'Changed';

		expect(snapshot).toEqual({
			id: 'snap-1',
			revision: 7,
			createdAt: '2026-05-23T12:00:00.000Z',
			reason: 'manual-save',
			workspace: expect.objectContaining({
				revision: 7,
				drafts: expect.objectContaining({
					now: expect.objectContaining({ dayTitle: 'Start' })
				})
			})
		});
	});

	test('prepends snapshots and keeps only the newest ten', () => {
		const snapshots = Array.from({ length: 10 }, (_, i) =>
			createWorkspaceSnapshot(workspaceDataFromAppState(state(`Old ${i}`), i), 'manual-save', `old-${i}`, `2026-05-23T12:0${i}:00.000Z`)
		);
		const next = createWorkspaceSnapshot(workspaceDataFromAppState(state('New'), 11), 'restore', 'new', '2026-05-23T13:00:00.000Z');

		const trimmed = appendWorkspaceSnapshot(snapshots, next);

		expect(trimmed).toHaveLength(10);
		expect(trimmed[0].id).toBe('new');
		expect(trimmed.map(snapshot => snapshot.id)).not.toContain('old-9');
	});

	test('summarizes snapshots without returning workspace payloads', () => {
		const snapshot = createWorkspaceSnapshot(workspaceDataFromAppState(state('Start'), 3), 'manual-save', 'snap-1', '2026-05-23T12:00:00.000Z');

		expect(summarizeWorkspaceSnapshots([snapshot])).toEqual([{
			id: 'snap-1',
			revision: 3,
			createdAt: '2026-05-23T12:00:00.000Z',
			reason: 'manual-save'
		}]);
		expect(summarizeWorkspaceSnapshots([snapshot])[0]).not.toHaveProperty('workspace');
	});
});
