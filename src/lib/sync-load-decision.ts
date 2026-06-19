export type SyncLoadSource = 'manual' | 'auto';
export type WorkspaceSyncLoadAction = 'apply-cloud' | 'upload-local';

export interface WorkspaceSyncLoadDecisionInput {
	source: SyncLoadSource;
	localRevision: number;
	cloudRevision: number;
	localHash: string;
	cloudHash: string;
	localEmpty: boolean;
	cloudEmpty: boolean;
}

export function decideWorkspaceSyncLoad(input: WorkspaceSyncLoadDecisionInput): WorkspaceSyncLoadAction {
	if (input.cloudEmpty && !input.localEmpty) return 'upload-local';
	if (
		input.source === 'auto'
		&& !input.localEmpty
		&& input.localHash !== input.cloudHash
		&& input.localRevision >= input.cloudRevision
	) return 'upload-local';
	return 'apply-cloud';
}
