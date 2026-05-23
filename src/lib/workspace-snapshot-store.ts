import { isWorkspaceMeaningfullyEmpty, type WorkspaceData } from './workspace.js';
import {
	appendWorkspaceSnapshot,
	createWorkspaceSnapshot,
	type WorkspaceSnapshot,
	type WorkspaceSnapshotReason
} from './workspace-snapshots.js';

interface SnapshotRedis {
	get(key: string): Promise<unknown>;
	set(key: string, value: unknown): Promise<unknown>;
}

export function workspaceSnapshotsKey(token: string): string {
	return `daytimer:snapshots:${token}`;
}

export function snapshotReasonFromSyncBody(body: unknown): WorkspaceSnapshotReason | null {
	return body && typeof body === 'object' && (body as { snapshotReason?: unknown }).snapshotReason === 'manual-save'
		? 'manual-save'
		: null;
}

export async function readWorkspaceSnapshots(redis: SnapshotRedis, key: string): Promise<WorkspaceSnapshot[]> {
	const raw = await redis.get(key);
	return Array.isArray(raw) ? raw as WorkspaceSnapshot[] : [];
}

export async function findWorkspaceSnapshot(redis: SnapshotRedis, key: string, snapshotId: string): Promise<WorkspaceSnapshot | null> {
	const snapshots = await readWorkspaceSnapshots(redis, key);
	return snapshots.find(snapshot => snapshot.id === snapshotId) ?? null;
}

export async function maybeSaveWorkspaceSnapshot(
	redis: SnapshotRedis,
	key: string,
	workspace: WorkspaceData | null,
	reason: WorkspaceSnapshotReason,
	createId: () => string,
	nowIso: () => string
): Promise<void> {
	if (!workspace || workspace.revision <= 0 || isWorkspaceMeaningfullyEmpty(workspace)) return;
	const existingSnapshots = await readWorkspaceSnapshots(redis, key);
	const snapshot = createWorkspaceSnapshot(workspace, reason, createId(), nowIso());
	await redis.set(key, appendWorkspaceSnapshot(existingSnapshots, snapshot));
}
