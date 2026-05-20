import { describe, expect, it } from 'vitest';
import {
	makeActualEntryId,
	upsertActualEntry,
	finalizeUnconfirmedForDate,
	confirmActualEntry,
	deleteActualEntry,
	exportActualHistoryJsonl
} from './actuals.js';
import type { ActualTimeEntry } from './state.svelte.js';

function entry(overrides: Partial<ActualTimeEntry> = {}): ActualTimeEntry {
	return {
		id: 'e1',
		date: '2026-05-20',
		agendaDate: '2026-05-20',
		title: 'Matte',
		subjectCategory: 'Matematik',
		weekday: 3,
		startMin: 540,
		endMinActual: 580,
		durationActualMin: 40,
		dayTextSnapshot: '',
		confirmed: false,
		confirmedAt: null,
		autoFinalized: false,
		...overrides
	};
}

describe('makeActualEntryId', () => {
	it('combines date, startMin and lowercased trimmed title', () => {
		expect(makeActualEntryId('2026-05-20', 540, '  Matte  ')).toBe('2026-05-20|540|matte');
	});
});

describe('upsertActualEntry', () => {
	it('appends when id is new', () => {
		const result = upsertActualEntry([], entry({ id: 'a' }));
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('a');
	});

	it('replaces existing entry in place', () => {
		const log = [entry({ id: 'a', durationActualMin: 10 })];
		const result = upsertActualEntry(log, entry({ id: 'a', durationActualMin: 25 }));
		expect(result).toHaveLength(1);
		expect(result[0].durationActualMin).toBe(25);
	});

	it('does not mutate input array', () => {
		const log = [entry({ id: 'a' })];
		upsertActualEntry(log, entry({ id: 'b' }));
		expect(log).toHaveLength(1);
	});
});

describe('finalizeUnconfirmedForDate', () => {
	it('marks matching unconfirmed entries as auto-finalized', () => {
		const log = [
			entry({ id: 'a', date: '2026-05-20', confirmed: false }),
			entry({ id: 'b', date: '2026-05-20', confirmed: true }),
			entry({ id: 'c', date: '2026-05-21', confirmed: false })
		];
		const { log: next, changed } = finalizeUnconfirmedForDate(log, '2026-05-20', 1000);
		expect(changed).toBe(true);
		expect(next.find(e => e.id === 'a')).toMatchObject({ confirmed: true, autoFinalized: true, confirmedAt: 1000 });
		expect(next.find(e => e.id === 'b')!.confirmed).toBe(true);
		expect(next.find(e => e.id === 'c')!.confirmed).toBe(false);
	});

	it('returns same reference when nothing changes', () => {
		const log = [entry({ confirmed: true })];
		const { log: next, changed } = finalizeUnconfirmedForDate(log, '2026-05-20');
		expect(changed).toBe(false);
		expect(next).toBe(log);
	});
});

describe('confirmActualEntry', () => {
	it('flips confirmed flag', () => {
		const log = [entry({ id: 'a' })];
		const { log: next, changed } = confirmActualEntry(log, 'a', 555);
		expect(changed).toBe(true);
		expect(next[0]).toMatchObject({ confirmed: true, autoFinalized: false, confirmedAt: 555 });
	});

	it('is a no-op when already confirmed', () => {
		const log = [entry({ id: 'a', confirmed: true })];
		const { changed } = confirmActualEntry(log, 'a');
		expect(changed).toBe(false);
	});

	it('is a no-op when id is missing', () => {
		const { changed } = confirmActualEntry([entry({ id: 'a' })], 'nope');
		expect(changed).toBe(false);
	});
});

describe('deleteActualEntry', () => {
	it('removes matching entry', () => {
		const log = [entry({ id: 'a' }), entry({ id: 'b' })];
		const { log: next, changed } = deleteActualEntry(log, 'a');
		expect(changed).toBe(true);
		expect(next.map(e => e.id)).toEqual(['b']);
	});

	it('is a no-op when id is missing', () => {
		const log = [entry({ id: 'a' })];
		const { changed } = deleteActualEntry(log, 'nope');
		expect(changed).toBe(false);
	});
});

describe('exportActualHistoryJsonl', () => {
	it('includes confirmed and auto-finalized entries, skips drafts', () => {
		const log = [
			entry({ id: 'a', confirmed: true }),
			entry({ id: 'b', autoFinalized: true }),
			entry({ id: 'c', confirmed: false, autoFinalized: false })
		];
		const out = exportActualHistoryJsonl(log);
		const lines = out.trim().split('\n');
		expect(lines).toHaveLength(2);
		expect(out).toContain('"id":"a"');
		expect(out).toContain('"id":"b"');
		expect(out).not.toContain('"id":"c"');
	});

	it('returns empty string when nothing to export', () => {
		expect(exportActualHistoryJsonl([entry({ confirmed: false })])).toBe('');
	});
});
