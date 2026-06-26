import type { ShareMode } from './share-state.js';

export const ACTIVE_SHARE_KEY = 'active';
export const SHARE_TOKEN_STORAGE = 'daytimer_share_token';
export const SHARE_OWNER_STORAGE = 'daytimer_share_owner_token';
export const SHARE_MODE_STORAGE = 'daytimer_share_mode';
export const SHARE_ENTRIES_STORAGE = 'daytimer_share_entries';

export type ShareEntry = { viewToken: string; ownerToken: string; mode: ShareMode };

export function sessionShareKey(flowId: string): string {
	return `session:${flowId}`;
}

export function dayShareKey(date: string): string {
	return `day:${date}`;
}

export function shareKeyFromModeAndPayload(mode: ShareMode, flowId?: string | null, date?: string | null): string | null {
	if (mode === 'active-session-live') return ACTIVE_SHARE_KEY;
	if (mode === 'selected-session-snapshot') return flowId ? sessionShareKey(flowId) : null;
	if (mode === 'selected-day-snapshot') return date ? dayShareKey(date) : null;
	return null;
}

export function parseShareEntries(raw: string): Record<string, ShareEntry> | null {
	const parsed = JSON.parse(raw);
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
	return parsed as Record<string, ShareEntry>;
}

export function withLegacyActiveShareEntry(
	entries: Record<string, ShareEntry>,
	legacyToken: string | null | undefined,
	legacyOwner: string | null | undefined,
	legacyMode: ShareMode | null | undefined
): Record<string, ShareEntry> {
	if (!legacyToken || !legacyOwner) return entries;
	if ((legacyMode ?? 'active-session-live') !== 'active-session-live') return entries;
	if (entries[ACTIVE_SHARE_KEY]) return entries;
	return {
		...entries,
		[ACTIVE_SHARE_KEY]: {
			viewToken: legacyToken,
			ownerToken: legacyOwner,
			mode: 'active-session-live'
		}
	};
}