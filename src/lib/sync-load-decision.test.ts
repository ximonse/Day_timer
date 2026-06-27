import { describe, expect, test } from 'vitest';
import { decideWorkspaceSyncLoad, shouldPauseAutoSyncLoadForFlow } from './sync-load-decision.js';

describe('decideWorkspaceSyncLoad', () => {
	test('auto load uploads local changes when cloud has the same revision but older content', () => {
		expect(decideWorkspaceSyncLoad({
			source: 'auto',
			localRevision: 4,
			cloudRevision: 4,
			localHash: 'local-new',
			cloudHash: 'cloud-old',
			localEmpty: false,
			cloudEmpty: false
		})).toBe('upload-local');
	});

	test('auto load applies cloud when cloud revision is newer than local', () => {
		expect(decideWorkspaceSyncLoad({
			source: 'auto',
			localRevision: 4,
			cloudRevision: 5,
			localHash: 'local-old',
			cloudHash: 'cloud-new',
			localEmpty: false,
			cloudEmpty: false
		})).toBe('apply-cloud');
	});

	test('manual load applies cloud even when local content differs', () => {
		expect(decideWorkspaceSyncLoad({
			source: 'manual',
			localRevision: 4,
			cloudRevision: 4,
			localHash: 'local-new',
			cloudHash: 'cloud-old',
			localEmpty: false,
			cloudEmpty: false
		})).toBe('apply-cloud');
	});

	test('uploads local data when cloud is empty and local workspace has content', () => {
		expect(decideWorkspaceSyncLoad({
			source: 'auto',
			localRevision: 0,
			cloudRevision: 0,
			localHash: 'local',
			cloudHash: 'empty-cloud',
			localEmpty: false,
			cloudEmpty: true
		})).toBe('upload-local');
	});
});

describe('shouldPauseAutoSyncLoadForFlow', () => {
	test('pauses automatic cloud load while a flow run is active', () => {
		expect(shouldPauseAutoSyncLoadForFlow({
			source: 'auto',
			flowModeEnabled: true,
			locked: true,
			miniMenuOpen: false,
			hasFlowExecution: true
		})).toBe(true);
	});

	test('allows manual cloud load even during a flow run', () => {
		expect(shouldPauseAutoSyncLoadForFlow({
			source: 'manual',
			flowModeEnabled: true,
			locked: true,
			miniMenuOpen: false,
			hasFlowExecution: true
		})).toBe(false);
	});

	test('allows automatic cloud load when the run menu is open', () => {
		expect(shouldPauseAutoSyncLoadForFlow({
			source: 'auto',
			flowModeEnabled: true,
			locked: true,
			miniMenuOpen: true,
			hasFlowExecution: true
		})).toBe(false);
	});
});
