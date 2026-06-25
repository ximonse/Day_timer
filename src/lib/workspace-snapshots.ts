import type { WorkspaceData } from './workspace.js';
import { stripColorDirective } from './title-color.js';
import { parseAgenda } from './parse.js';

export type WorkspaceSnapshotReason = 'manual-save' | 'restore';

export interface WorkspaceSnapshot {
	id: string;
	revision: number;
	createdAt: string;
	reason: WorkspaceSnapshotReason;
	workspace: WorkspaceData;
}

export type WorkspaceSnapshotSummary = Omit<WorkspaceSnapshot, 'workspace'> & { summary: string };

function previewTitles(titles: string[]): string {
	const unique: string[] = [];
	for (const raw of titles) {
		const title = stripColorDirective(raw || '').trim();
		if (title && !unique.includes(title)) unique.push(title);
		if (unique.length >= 2) break;
	}
	return unique.join(', ');
}

export function describeWorkspaceSnapshot(workspace: WorkspaceData): string {
	const sessions = parseAgenda(workspace.agenda.schoolText || '').flatMap(day => day.flows);
	if (sessions.length > 0) {
		const label = sessions.length === 1 ? '1 session' : `${sessions.length} sessioner`;
		const preview = previewTitles(sessions.map(session => session.title));
		return preview ? `${preview} · ${label}` : label;
	}
	const mallar = workspace.flows.length;
	if (mallar === 0) return 'Tomt';
	return mallar === 1 ? '1 mall' : `${mallar} mallar`;
}

export const MAX_WORKSPACE_SNAPSHOTS = 10;

function cloneWorkspace(workspace: WorkspaceData): WorkspaceData {
	return JSON.parse(JSON.stringify(workspace)) as WorkspaceData;
}

export function createWorkspaceSnapshot(
	workspace: WorkspaceData,
	reason: WorkspaceSnapshotReason,
	id: string,
	createdAt: string
): WorkspaceSnapshot {
	return {
		id,
		revision: workspace.revision,
		createdAt,
		reason,
		workspace: cloneWorkspace(workspace)
	};
}

export function appendWorkspaceSnapshot(
	snapshots: WorkspaceSnapshot[],
	snapshot: WorkspaceSnapshot,
	maxSnapshots = MAX_WORKSPACE_SNAPSHOTS
): WorkspaceSnapshot[] {
	return [snapshot, ...snapshots].slice(0, maxSnapshots);
}

export function summarizeWorkspaceSnapshots(snapshots: WorkspaceSnapshot[]): WorkspaceSnapshotSummary[] {
	return snapshots.map(({ id, revision, createdAt, reason, workspace }) => ({
		id,
		revision,
		createdAt,
		reason,
		summary: describeWorkspaceSnapshot(workspace)
	}));
}
