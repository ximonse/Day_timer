export type SyncSaveSource = 'manual' | 'auto-panel' | 'auto-effect';

export function normalizeSyncSaveSource(source: unknown): SyncSaveSource {
	return source === 'auto-panel' || source === 'auto-effect' ? source : 'manual';
}
