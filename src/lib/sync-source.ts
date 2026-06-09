export type SyncSaveSource = 'manual' | 'auto-panel' | 'auto-effect' | 'conflict-overwrite';

export function normalizeSyncSaveSource(source: unknown): SyncSaveSource {
	return source === 'auto-panel' || source === 'auto-effect' || source === 'conflict-overwrite' ? source : 'manual';
}
