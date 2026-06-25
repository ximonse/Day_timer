import type { WorkspaceData } from './workspace.js';
import { stripColorDirective } from './title-color.js';

export type WorkspaceSnapshotReason = 'manual-save' | 'restore';

export interface WorkspaceSnapshot {
	id: string;
	revision: number;
	createdAt: string;
	reason: WorkspaceSnapshotReason;
	workspace: WorkspaceData;
}

export type WorkspaceSnapshotSummary = Omit<WorkspaceSnapshot, 'workspace'> & { summary: string };

export function describeWorkspaceSnapshot(workspace: WorkspaceData): string {
	const count = workspace.flows.length;
	const titles: string[] = [];
	for (const flow of workspace.flows) {
		const title = stripColorDirective(flow.title || '').trim();
		if (title && !titles.includes(title)) titles.push(title);
		if (titles.length >= 2) break;
	}
	if (count === 0) return 'Tomt';
	const label = count === 1 ? '1 pass' : `${count} pass`;
	const preview = titles.join(', ');
	return preview ? `${preview} · ${label}` : label;
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
