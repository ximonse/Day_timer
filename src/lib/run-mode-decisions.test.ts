import { describe, expect, test } from 'vitest';
import { parseAgenda } from './parse.js';
import { buildAgendaItemsForDay, makeAgendaFlowRef } from './agenda.js';
import { decideAutoLoadAgendaItem, decideNowAgendaTarget } from './run-mode-decisions.js';

describe('run mode decisions', () => {
	test('now target prefers active agenda item over upcoming item', () => {
		const days = parseAgenda([
			'@260531',
			'#Aktiv 08:00',
			'A 30m',
			'#Nästa 09:00',
			'B 30m'
		].join('\n'));

		const result = decideNowAgendaTarget(days, '2026-05-31', 8 * 60 + 10, 8 * 60);

		expect(result?.kind).toBe('active');
		expect(result?.item.flow.title).toBe('Aktiv');
	});

	test('now target falls back to next agenda item', () => {
		const days = parseAgenda(['@260531', '#Nästa 09:00', 'B 30m'].join('\n'));

		const result = decideNowAgendaTarget(days, '2026-05-31', 8 * 60 + 10, 8 * 60);

		expect(result?.kind).toBe('next');
		expect(result?.item.flow.title).toBe('Nästa');
	});

	test('now target is null when nothing is active or upcoming', () => {
		const days = parseAgenda(['@260531', '#Tidigare 07:00', 'A 30m'].join('\n'));

		expect(decideNowAgendaTarget(days, '2026-05-31', 8 * 60 + 10, 8 * 60)).toBeNull();
	});

	test('auto-load is skipped outside now mode or while draft is dirty', () => {
		const days = parseAgenda(['@260531', '#Aktiv 08:00', 'A 30m'].join('\n'));
		const items = buildAgendaItemsForDay(days[0], 8 * 60);

		expect(decideAutoLoadAgendaItem({
			activeSection: 'plan',
			partsDraftDirty: false,
			nowMin: 8 * 60 + 10,
			date: '2026-05-31',
			fallbackStart: 8 * 60,
			days,
			activeRef: null,
			lastAutoLoadKey: ''
		})).toEqual({ action: 'skip' });

		expect(decideAutoLoadAgendaItem({
			activeSection: 'now',
			partsDraftDirty: true,
			nowMin: 8 * 60 + 10,
			date: '2026-05-31',
			fallbackStart: 8 * 60,
			days,
			activeRef: null,
			lastAutoLoadKey: ''
		})).toEqual({ action: 'skip' });
	});

	test('auto-load keeps current active agenda ref when time is still inside it', () => {
		const days = parseAgenda(['@260531', '#Aktiv 08:00', 'A 30m'].join('\n'));
		const items = buildAgendaItemsForDay(days[0], 8 * 60);
		const ref = makeAgendaFlowRef('2026-05-31', items[0].flow, items[0].startMin);

		expect(decideAutoLoadAgendaItem({
			activeSection: 'now',
			partsDraftDirty: false,
			nowMin: 8 * 60 + 10,
			date: '2026-05-31',
			fallbackStart: 8 * 60,
			days,
			activeRef: ref,
			lastAutoLoadKey: ''
		})).toEqual({ action: 'mark-current', key: '480-30-Aktiv-1' });
	});

	test('auto-load loads a new active agenda item once', () => {
		const days = parseAgenda(['@260531', '#Aktiv 08:00', 'A 30m'].join('\n'));
		const items = buildAgendaItemsForDay(days[0], 8 * 60);

		const first = decideAutoLoadAgendaItem({
			activeSection: 'now',
			partsDraftDirty: false,
			nowMin: 8 * 60 + 10,
			date: '2026-05-31',
			fallbackStart: 8 * 60,
			days,
			activeRef: null,
			lastAutoLoadKey: ''
		});

		expect(first.action).toBe('load');
		if (first.action === 'load') {
			expect(first.key).toBe('480-30-Aktiv-1');
			expect(first.item.flow.title).toBe('Aktiv');
		}

		expect(decideAutoLoadAgendaItem({
			activeSection: 'now',
			partsDraftDirty: false,
			nowMin: 8 * 60 + 10,
			date: '2026-05-31',
			fallbackStart: 8 * 60,
			days,
			activeRef: null,
			lastAutoLoadKey: '480-30-Aktiv-1'
		})).toEqual({ action: 'skip' });
	});

	test('auto-load ignores agenda items from another selected day', () => {
		const days = parseAgenda([
			'@260531',
			'#Idag 09:00',
			'A 30m',
			'@260601',
			'#Imorgon 08:00',
			'B 30m'
		].join('\n'));
		expect(decideAutoLoadAgendaItem({
			activeSection: 'now',
			partsDraftDirty: false,
			nowMin: 8 * 60 + 10,
			date: '2026-05-31',
			fallbackStart: 8 * 60,
			days,
			activeRef: null,
			lastAutoLoadKey: ''
		})).toEqual({ action: 'skip' });
	});
});
