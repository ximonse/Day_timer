import type { SyncSaveSource } from './sync-source.js';

export function shouldSkipWorkspaceAutosave(
	source: SyncSaveSource,
	workspaceHash: string,
	lastSyncedHash: string | null,
	pendingWorkspaceSaveHash: string | null
) {
	return source !== 'manual' && (workspaceHash === lastSyncedHash || workspaceHash === pendingWorkspaceSaveHash);
}
