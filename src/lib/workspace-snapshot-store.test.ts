import { describe, expect, test } from 'vitest';
import { findWorkspaceSnapshot, readWorkspaceSnapshots, maybeSaveWorkspaceSnapshot, snapshotReasonFromSyncBody } from './workspace-snapshot-store.js';
import { DEFAULT_WORKSPACE_PREFERENCES, workspaceDataFromAppState } from './workspace.js';
import type { AppState } from './state.svelte.js';
import type { WorkspaceSnapshot } from './workspace-snapshots.js';

class MemoryRedis {
	values = new Map<string, unknown>();

	async get(key: string) {
		return this.values.get(key) ?? null;
	}

	async set(key: string, value: unknown) {
		this.values.set(key, value);
	}
}

function workspace(title: string, revision: number) {
	const block = { id: 'block', title, minutes: 45, note: '', warning: true, pinned: false };
	const draft = { dayTitle: title, blocks: [block], extraInfo: '', startMin: 8 * 60 };
	const state: Pick<AppState,
		'flows' | 'agendaText' | 'agendaDate' | 'agendaText2' | 'agendaDate2' | 'agendaMeta' |
		'actualTimeLog' | 'nowDraft' | 'planDraft' | 'palette' | 'dark' | 'clockSpan' | 'endMode' |
		'agendaView' | 'showSegNotes' | 'showExtraInfo' | 'showSegLabels' | 'showLeft' |
		'showCenterEnd' | 'hollow' | 'textOutside' | 'showMin' | 'showFive' | 'showQuarter' |
		'showFutureSegments' | 'segMinutesMode'
	> = {
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
		showFutureSegments: true,
		segMinutesMode: 'planned'
	};
	return workspaceDataFromAppState(state, revision);
}

function emptyWorkspace() {
	const block = { id: 'block', title: 'Lektion', minutes: 45, note: '', warning: true, pinned: false };
	const draft = { dayTitle: '', blocks: [block], extraInfo: '', startMin: 8 * 60 };
	return workspaceDataFromAppState({
		flows: [],
		agendaText: '',
		agendaDate: '',
		agendaText2: '',
		agendaDate2: '',
		agendaMeta: {},
		actualTimeLog: [],
		nowDraft: draft,
		planDraft: draft,
		...DEFAULT_WORKSPACE_PREFERENCES
	}, 0);
}

describe('workspace snapshot store', () => {
	test('accepts only explicit manual save snapshot requests from sync bodies', () => {
		expect(snapshotReasonFromSyncBody({ snapshotReason: 'manual-save' })).toBe('manual-save');
		expect(snapshotReasonFromSyncBody({ snapshotReason: 'auto-effect' })).toBe(null);
		expect(snapshotReasonFromSyncBody({})).toBe(null);
		expect(snapshotReasonFromSyncBody(null)).toBe(null);
	});

	test('stores a snapshot of an existing workspace and trims old entries', async () => {
		const redis = new MemoryRedis();
		const key = 'snapshots';
		const oldSnapshots: WorkspaceSnapshot[] = Array.from({ length: 10 }, (_, i) => ({
			id: `old-${i}`,
			revision: i,
			createdAt: `2026-05-23T12:0${i}:00.000Z`,
			reason: 'manual-save',
			workspace: workspace(`Old ${i}`, i)
		}));
		await redis.set(key, oldSnapshots);

		await maybeSaveWorkspaceSnapshot(redis, key, workspace('Current cloud', 12), 'manual-save', () => 'new-id', () => '2026-05-23T13:00:00.000Z');

		const stored = await redis.get(key) as WorkspaceSnapshot[];
		expect(stored).toHaveLength(10);
		expect(stored[0].id).toBe('new-id');
		expect(stored[0].workspace.drafts.now.dayTitle).toBe('Current cloud');
		expect(stored.map(snapshot => snapshot.id)).not.toContain('old-9');
	});

	test('does not store empty initial workspaces', async () => {
		const redis = new MemoryRedis();
		const key = 'snapshots';

		await maybeSaveWorkspaceSnapshot(redis, key, emptyWorkspace(), 'manual-save', () => 'new-id', () => '2026-05-23T13:00:00.000Z');

		expect(await redis.get(key)).toBe(null);
	});

	test('reads only valid snapshot arrays and finds snapshots by id', async () => {
		const redis = new MemoryRedis();
		const key = 'snapshots';
		const snapshots: WorkspaceSnapshot[] = [
			{
				id: 'snap-1',
				revision: 2,
				createdAt: '2026-05-23T12:00:00.000Z',
				reason: 'manual-save',
				workspace: workspace('Saved', 2)
			}
		];
		await redis.set(key, snapshots);

		expect(await readWorkspaceSnapshots(redis, key)).toEqual(snapshots);
		expect((await findWorkspaceSnapshot(redis, key, 'snap-1'))?.revision).toBe(2);
		expect(await findWorkspaceSnapshot(redis, key, 'missing')).toBe(null);

		await redis.set(key, { bad: true });
		expect(await readWorkspaceSnapshots(redis, key)).toEqual([]);
	});
});
