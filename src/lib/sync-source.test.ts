import { describe, expect, test } from 'vitest';
import { normalizeSyncSaveSource } from './sync-source.js';

describe('normalizeSyncSaveSource', () => {
	test('treats event-like values from button handlers as manual saves', () => {
		expect(normalizeSyncSaveSource({ type: 'click' })).toBe('manual');
		expect(normalizeSyncSaveSource(undefined)).toBe('manual');
	});

	test('keeps explicit autosave sources', () => {
		expect(normalizeSyncSaveSource('auto-panel')).toBe('auto-panel');
		expect(normalizeSyncSaveSource('auto-effect')).toBe('auto-effect');
	});

	test('keeps conflict overwrite source', () => {
		expect(normalizeSyncSaveSource('conflict-overwrite')).toBe('conflict-overwrite');
	});
});
