import { describe, expect, test } from 'vitest';
import {
	ACTIVE_SHARE_KEY,
	dayShareKey,
	parseShareEntries,
	sessionShareKey,
	shareKeyFromModeAndPayload,
	withLegacyActiveShareEntry
} from './share-entries.js';

describe('share entry helpers', () => {
	test('builds share keys from modes and payloads', () => {
		expect(sessionShareKey('flow-1')).toBe('session:flow-1');
		expect(dayShareKey('2026-06-26')).toBe('day:2026-06-26');
		expect(shareKeyFromModeAndPayload('active-session-live')).toBe(ACTIVE_SHARE_KEY);
		expect(shareKeyFromModeAndPayload('selected-session-snapshot', 'flow-1')).toBe('session:flow-1');
		expect(shareKeyFromModeAndPayload('selected-session-snapshot')).toBeNull();
		expect(shareKeyFromModeAndPayload('selected-day-snapshot', null, '2026-06-26')).toBe('day:2026-06-26');
		expect(shareKeyFromModeAndPayload('selected-day-snapshot')).toBeNull();
	});

	test('parses persisted share entries only when the stored value is object-shaped', () => {
		expect(parseShareEntries('{"active":{"viewToken":"v","ownerToken":"o","mode":"active-session-live"}}')).toEqual({
			active: { viewToken: 'v', ownerToken: 'o', mode: 'active-session-live' }
		});
		expect(parseShareEntries('[]')).toBeNull();
		expect(parseShareEntries('null')).toBeNull();
	});

	test('migrates one legacy active share entry when no active entry exists', () => {
		const migrated = withLegacyActiveShareEntry({}, 'view', 'owner', null);
		expect(migrated.active).toEqual({
			viewToken: 'view',
			ownerToken: 'owner',
			mode: 'active-session-live'
		});
	});

	test('keeps existing entries for non-live legacy modes or existing active entries', () => {
		const existing = {
			active: { viewToken: 'current', ownerToken: 'owner', mode: 'active-session-live' as const }
		};
		expect(withLegacyActiveShareEntry(existing, 'legacy', 'owner', 'active-session-live')).toBe(existing);
		expect(withLegacyActiveShareEntry({}, 'legacy', 'owner', 'selected-day-snapshot')).toEqual({});
	});
});