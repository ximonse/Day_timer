import type { WorkspaceData } from './workspace.js';

export type WorkspaceSnapshotReason = 'manual-save' | 'restore' | 'conflict-overwrite';

export interface WorkspaceSnapshot {
	id: string;
	revision: number;
	createdAt: string;
	reason: WorkspaceSnapshotReason;
	workspace: WorkspaceData;
}

export type WorkspaceSnapshotSummary = Omit<WorkspaceSnapshot, 'workspace'>;

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
	return snapshots.map(({ id, revision, createdAt, reason }) => ({ id, revision, createdAt, reason }));
}
