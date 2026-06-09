import { describe, expect, test } from 'vitest';
import { shouldSkipWorkspaceAutosave } from './autosave.js';

describe('shouldSkipWorkspaceAutosave', () => {
	test('skips non-manual autosave when workspace is already synced', () => {
		expect(shouldSkipWorkspaceAutosave('auto-panel', 'same', 'same', null)).toBe(true);
		expect(shouldSkipWorkspaceAutosave('auto-effect', 'same', 'same', null)).toBe(true);
	});

	test('skips non-manual autosave when same workspace is already in flight', () => {
		expect(shouldSkipWorkspaceAutosave('auto-panel', 'same', null, 'same')).toBe(true);
	});

	test('does not skip changed non-manual autosave', () => {
		expect(shouldSkipWorkspaceAutosave('auto-panel', 'new', 'old', null)).toBe(false);
		expect(shouldSkipWorkspaceAutosave('auto-panel', 'new', null, 'old')).toBe(false);
	});

	test('never skips manual save because it may need a snapshot', () => {
		expect(shouldSkipWorkspaceAutosave('manual', 'same', 'same', 'same')).toBe(false);
	});

	test('never skips conflict overwrite because it must replace the cloud version', () => {
		expect(shouldSkipWorkspaceAutosave('conflict-overwrite', 'same', 'same', 'same')).toBe(false);
	});
});
