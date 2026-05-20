import type { ActualTimeEntry } from './state.svelte.js';
import { toJsonl } from './learning.js';

export function makeActualEntryId(date: string, startMin: number, title: string): string {
	return `${date}|${startMin}|${title.trim().toLowerCase()}`;
}

export function upsertActualEntry(log: ActualTimeEntry[], entry: ActualTimeEntry): ActualTimeEntry[] {
	const idx = log.findIndex((item) => item.id === entry.id);
	if (idx < 0) return [...log, entry];
	const next = log.slice();
	next[idx] = entry;
	return next;
}

export function finalizeUnconfirmedForDate(
	log: ActualTimeEntry[],
	date: string,
	now: number = Date.now()
): { log: ActualTimeEntry[]; changed: boolean } {
	let changed = false;
	const next = log.map((entry) => {
		if (entry.date !== date || entry.confirmed) return entry;
		changed = true;
		return { ...entry, confirmed: true, confirmedAt: now, autoFinalized: true };
	});
	return { log: changed ? next : log, changed };
}

export function confirmActualEntry(
	log: ActualTimeEntry[],
	id: string,
	now: number = Date.now()
): { log: ActualTimeEntry[]; changed: boolean } {
	const hit = log.find((entry) => entry.id === id);
	if (!hit || hit.confirmed) return { log, changed: false };
	return {
		log: upsertActualEntry(log, { ...hit, confirmed: true, confirmedAt: now, autoFinalized: false }),
		changed: true
	};
}

export function deleteActualEntry(
	log: ActualTimeEntry[],
	id: string
): { log: ActualTimeEntry[]; changed: boolean } {
	const next = log.filter((entry) => entry.id !== id);
	return { log: next, changed: next.length !== log.length };
}

export function exportActualHistoryJsonl(log: ActualTimeEntry[]): string {
	return toJsonl(log.filter((entry) => entry.confirmed || entry.autoFinalized));
}
