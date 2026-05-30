import { describe, expect, test } from 'vitest';
import {
	availableGapAfterAgendaItem,
	buildAgendaItemsForDay,
	buildCalendarCells,
	buildSequentialTimeline,
	canInsertAgendaItemAfter,
	computeAgendaDensity,
	deriveAgendaDayStart,
	agendaMetaBadge,
	agendaMetaHelp,
	agendaMetaLabel,
	buildAgendaMetaLookup,
	cloneAgendaDays,
	findAgendaItemForTime,
	findNextAgendaItemAfterTime,
	insertFlowIntoAgendaDate,
	makeAgendaFlowRef,
	makeAgendaMetaKeyForFlow,
	moveAgendaMeta,
	rebuildAgendaMetaForDay,
	replaceAgendaFlowInDays,
	resolveAgendaFlowRef,
	serializeSelectedAgendaDay,
	suggestedStartMinForDate
} from './agenda.js';
import type { AgendaDay } from './parse.js';
import type { Flow } from './state.svelte.js';

function flow(patch: Partial<Flow>): Flow {
	return {
		id: patch.id ?? patch.title ?? 'flow',
		title: patch.title ?? 'Session',
		parts: patch.parts ?? ['Aktivitet'],
		minutes: patch.minutes ?? [30],
		warnings: patch.warnings ?? [true],
		notes: patch.notes ?? [''],
		extraInfo: patch.extraInfo ?? '',
		...(patch.startMin !== undefined ? { startMin: patch.startMin } : {})
	};
}

describe('agenda helpers', () => {
	test('derives day start from the first explicit flow and preceding durations', () => {
		const day: AgendaDay = {
			date: '2026-05-18',
			flows: [
				flow({ title: 'Intro', minutes: [20] }),
				flow({ title: 'Lektion', startMin: 9 * 60, minutes: [45] }),
				flow({ title: 'Exit', minutes: [10] })
			]
		};

		expect(deriveAgendaDayStart(day, 8 * 60)).toBe(8 * 60 + 40);
		expect(buildAgendaItemsForDay(day, 8 * 60).map(item => [item.flow.title, item.startMin, item.totalMin])).toEqual([
			['Intro', 8 * 60 + 40, 20],
			['Lektion', 9 * 60, 45],
			['Exit', 9 * 60 + 45, 10]
		]);
	});

	test('serializes a selected day or returns an empty dated marker', () => {
		const days: AgendaDay[] = [{
			date: '2026-05-18',
			flows: [flow({ title: 'Lektion', startMin: 8 * 60, parts: ['Start'], minutes: [15] })]
		}];

		expect(serializeSelectedAgendaDay('2026-05-18', days)).toContain('@260518');
		expect(serializeSelectedAgendaDay('2026-05-18', days, { includeIds: false })).not.toContain('<!--id:');
		expect(serializeSelectedAgendaDay('2026-05-19', days)).toBe('@260519\n');
		expect(serializeSelectedAgendaDay(null, days)).toBe('');
	});

	test('suggests the next rounded start time without exceeding the day', () => {
		const days: AgendaDay[] = [{
			date: '2026-05-18',
			flows: [
				flow({ title: 'A', startMin: 8 * 60 + 2, minutes: [28] }),
				flow({ title: 'B', minutes: [17] })
			]
		}];

		expect(suggestedStartMinForDate(days, '2026-05-18', 45)).toBe(8 * 60 + 50);
		expect(suggestedStartMinForDate(days, '2026-05-19', 45)).toBe(8 * 60);
		expect(suggestedStartMinForDate(days, '2026-05-18', 23 * 60)).toBe(8 * 60);
	});

	test('calculates whether a block can be inserted after an agenda item', () => {
		const items = [
			{ startMin: 8 * 60, totalMin: 30 },
			{ startMin: 9 * 60, totalMin: 30 }
		];

		expect(availableGapAfterAgendaItem(items, 0)).toBe(30);
		expect(canInsertAgendaItemAfter(items, 0)).toBe(true);
		expect(canInsertAgendaItemAfter([{ startMin: 8 * 60, totalMin: 31 }, { startMin: 9 * 60, totalMin: 30 }], 0)).toBe(false);
		expect(canInsertAgendaItemAfter([{ startMin: 8 * 60, totalMin: 25 }, { startMin: 9 * 60, totalMin: 30 }], 0)).toBe(true);
		expect(canInsertAgendaItemAfter([{ startMin: 23 * 60, totalMin: 20 }], 0)).toBe(true);
	});

	test('finds the agenda item covering a specific time on a date', () => {
		const days: AgendaDay[] = [{
			date: '2026-05-18',
			flows: [
				flow({ title: 'Start', startMin: 8 * 60, minutes: [30] }),
				flow({ title: 'Fortsättning', minutes: [45] })
			]
		}];

		const item = findAgendaItemForTime(days, '2026-05-18', 8 * 60 + 40, 7 * 60);

		expect(item?.flow.title).toBe('Fortsättning');
		expect(item?.startMin).toBe(8 * 60 + 30);
		expect(findAgendaItemForTime(days, '2026-05-18', 10 * 60, 7 * 60)).toBeNull();
		expect(findAgendaItemForTime(days, '2026-05-19', 8 * 60 + 10, 7 * 60)).toBeNull();
	});

	test('finds items before the first explicit flow using derived day start', () => {
		const days: AgendaDay[] = [{
			date: '2026-05-18',
			flows: [
				flow({ title: 'Implicit', minutes: [20] }),
				flow({ title: 'Explicit', startMin: 9 * 60, minutes: [30] })
			]
		}];

		const item = findAgendaItemForTime(days, '2026-05-18', 8 * 60 + 45, 7 * 60);

		expect(item?.flow.title).toBe('Implicit');
		expect(item?.startMin).toBe(8 * 60 + 40);
	});

	test('finds the next agenda item after a specific time on a date', () => {
		const days: AgendaDay[] = [{
			date: '2026-05-18',
			flows: [
				flow({ title: 'Avslutad', startMin: 8 * 60, minutes: [30] }),
				flow({ title: 'Snart', startMin: 9 * 60 + 7, minutes: [45] }),
				flow({ title: 'Senare', startMin: 11 * 60, minutes: [30] })
			]
		}];

		const item = findNextAgendaItemAfterTime(days, '2026-05-18', 9 * 60, 7 * 60);

		expect(item?.flow.title).toBe('Snart');
		expect(item?.startMin).toBe(9 * 60 + 7);
		expect(findNextAgendaItemAfterTime(days, '2026-05-18', 12 * 60, 7 * 60)).toBeNull();
		expect(findNextAgendaItemAfterTime(days, '2026-05-19', 9 * 60, 7 * 60)).toBeNull();
	});

	test('finds the active item by time instead of agenda text order', () => {
		const days: AgendaDay[] = [{
			date: '2026-05-18',
			flows: [
				flow({ title: 'Senare', startMin: 20 * 60, minutes: [45] }),
				flow({ title: 'Nu', startMin: 18 * 60, minutes: [45] }),
				flow({ title: 'Tidigare', startMin: 17 * 60, minutes: [30] })
			]
		}];

		const item = findAgendaItemForTime(days, '2026-05-18', 18 * 60 + 10, 7 * 60);

		expect(item?.flow.title).toBe('Nu');
	});

	test('finds the nearest next item by start time instead of agenda text order', () => {
		const days: AgendaDay[] = [{
			date: '2026-05-18',
			flows: [
				flow({ title: 'Sist', startMin: 21 * 60, minutes: [45] }),
				flow({ title: 'Snart', startMin: 19 * 60, minutes: [45] }),
				flow({ title: 'Senare', startMin: 20 * 60, minutes: [45] })
			]
		}];

		const item = findNextAgendaItemAfterTime(days, '2026-05-18', 18 * 60 + 30, 7 * 60);

		expect(item?.flow.title).toBe('Snart');
	});

	test('prefers the latest started overlapping item as active', () => {
		const days: AgendaDay[] = [{
			date: '2026-05-18',
			flows: [
				flow({ title: 'Långt pass', startMin: 18 * 60, minutes: [90] }),
				flow({ title: 'Nytt pass', startMin: 19 * 60, minutes: [30] })
			]
		}];

		const item = findAgendaItemForTime(days, '2026-05-18', 19 * 60 + 10, 7 * 60);

		expect(item?.flow.title).toBe('Nytt pass');
	});

	test('builds stable agenda meta keys and labels', () => {
		const item = flow({ title: 'Bild', startMin: 10 * 60, parts: ['Skiss', 'Färg'], minutes: [20, 25] });

		expect(makeAgendaMetaKeyForFlow('2026-05-18', item, 10 * 60)).toBe(JSON.stringify(['2026-05-18', 'Bild', 600, 45, 2]));
		expect(agendaMetaLabel({ source: 'template', label: 'Måndag' })).toBe('Mall: Måndag');
		expect(agendaMetaBadge({ source: 'import', label: 'ICS-kalender' })).toBe('ICS');
		expect(agendaMetaHelp({ source: 'manual' })).toBe('Det här blocket är nu ett vanligt dagplansblock utan särskild koppling.');
	});

	test('resolves agenda flow refs by exact match or stable fallback', () => {
		const target = flow({ title: 'Matte', startMin: 9 * 60, parts: ['Tal'], minutes: [35] });
		const days: AgendaDay[] = [{ date: '2026-05-18', flows: [target] }];
		const exactRef = makeAgendaFlowRef('2026-05-18', target, 9 * 60);
		const fallbackRef = { ...exactRef, startMin: 8 * 60 };

		expect(resolveAgendaFlowRef(days, exactRef)?.startMin).toBe(9 * 60);
		expect(resolveAgendaFlowRef(days, fallbackRef)?.flow.title).toBe('Matte');
		expect(resolveAgendaFlowRef(days, { ...exactRef, date: '2026-05-19' })).toBeNull();
	});

	test('builds agenda meta lookup without exposing mutable meta objects', () => {
		const matte = flow({ title: 'Matte', startMin: 9 * 60, parts: ['Tal'], minutes: [35] });
		const key = makeAgendaMetaKeyForFlow('2026-05-18', matte, 9 * 60);
		const meta = { [key]: { source: 'template' as const, label: 'Måndag' } };
		const lookup = buildAgendaMetaLookup(meta, '2026-05-18', { date: '2026-05-18', flows: [matte] }, 8 * 60);

		expect(lookup.exact.get(key)).toEqual({ source: 'template', label: 'Måndag' });
		lookup.exact.get(key)!.label = 'Ändrad';
		expect(meta[key].label).toBe('Måndag');
	});

	test('moves agenda meta by key without mutating the original map', () => {
		const oldKey = 'old';
		const newKey = 'new';
		const meta = {
			[oldKey]: { source: 'manual' as const },
			other: { source: 'ai' as const }
		};

		const next = moveAgendaMeta(meta, oldKey, newKey);

		expect(next).toEqual({
			[newKey]: { source: 'manual' },
			other: { source: 'ai' }
		});
		expect(meta).toHaveProperty(oldKey);
	});

	test('inserts a flow into the correct date without mutating the original days', () => {
		const days: AgendaDay[] = [
			{ date: '2026-05-18', flows: [flow({ title: 'A', startMin: 8 * 60, minutes: [30] })] },
			{ date: '2026-05-20', flows: [flow({ title: 'C', startMin: 10 * 60, minutes: [20] })] }
		];

		const result = insertFlowIntoAgendaDate(days, '2026-05-19', flow({ title: 'B', minutes: [25] }), 9 * 60);

		expect(result.dayIdx).toBe(1);
		expect(result.days.map(day => day.date)).toEqual(['2026-05-18', '2026-05-19', '2026-05-20']);
		expect(result.days[1].flows[0]).toMatchObject({ title: 'B', startMin: 9 * 60 });
		expect(days.map(day => day.date)).toEqual(['2026-05-18', '2026-05-20']);
	});

	test('replaces a flow in agenda days without mutating the original days', () => {
		const days: AgendaDay[] = [
			{ date: '2026-05-18', flows: [flow({ title: 'A', startMin: 8 * 60, minutes: [30] })] }
		];

		const next = replaceAgendaFlowInDays(days, 0, 0, flow({ title: 'B', startMin: 8 * 60 + 5, minutes: [35] }));

		expect(next[0].flows[0]).toMatchObject({ title: 'B', startMin: 8 * 60 + 5 });
		expect(days[0].flows[0].title).toBe('A');
	});

	test('clones agenda days deeply', () => {
		const days: AgendaDay[] = [{ date: '2026-05-18', flows: [flow({ title: 'A', minutes: [15] })] }];
		const clone = cloneAgendaDays(days);

		clone[0].flows[0].title = 'B';
		expect(days[0].flows[0].title).toBe('A');
	});

	test('rebuilds metadata for one day and preserves other days', () => {
		const previousFlow = flow({ title: 'Bild', startMin: 9 * 60, parts: ['Skiss'], minutes: [30] });
		const nextFlow = flow({ title: 'Bild', startMin: 9 * 60, parts: ['Skiss'], minutes: [30], notes: ['ny notering'] });
		const otherFlow = flow({ title: 'Engelska', startMin: 11 * 60, parts: ['Text'], minutes: [20] });
		const staleFlow = flow({ title: 'Slöjd', startMin: 10 * 60, parts: ['Trä'], minutes: [20] });
		const previousKey = makeAgendaMetaKeyForFlow('2026-05-18', previousFlow, 9 * 60);
		const otherKey = makeAgendaMetaKeyForFlow('2026-05-19', otherFlow, 11 * 60);
		const staleKey = makeAgendaMetaKeyForFlow('2026-05-18', staleFlow, 10 * 60);
		const meta = {
			[previousKey]: { source: 'template' as const, label: 'Bildmall' },
			[staleKey]: { source: 'manual' as const },
			[otherKey]: { source: 'ai' as const }
		};

		const next = rebuildAgendaMetaForDay(
			meta,
			'2026-05-18',
			{ date: '2026-05-18', flows: [previousFlow] },
			{ date: '2026-05-18', flows: [nextFlow] },
			8 * 60
		);

		expect(next[makeAgendaMetaKeyForFlow('2026-05-18', nextFlow, 9 * 60)]).toEqual({ source: 'template', label: 'Bildmall' });
		expect(next[staleKey]).toBeUndefined();
		expect(next[otherKey]).toEqual({ source: 'ai' });
	});

	test('rebuilds metadata with overrides and default metadata', () => {
		const imported = flow({ title: 'Kalender', startMin: 13 * 60, parts: ['Möte'], minutes: [45] });
		const manual = flow({ title: 'Plan', startMin: 14 * 60, parts: ['Skriv'], minutes: [30] });
		const overrideKey = makeAgendaMetaKeyForFlow('2026-05-18', imported, 13 * 60);

		const next = rebuildAgendaMetaForDay(
			{},
			'2026-05-18',
			null,
			{ date: '2026-05-18', flows: [imported, manual] },
			8 * 60,
			{
				overridesByKey: new Map([[overrideKey, { source: 'import', label: 'ICS-kalender' }]]),
				defaultMeta: { source: 'manual' }
			}
		);

		expect(next[overrideKey]).toEqual({ source: 'import', label: 'ICS-kalender' });
		expect(next[makeAgendaMetaKeyForFlow('2026-05-18', manual, 14 * 60)]).toEqual({ source: 'manual' });
	});
});

describe('computeAgendaDensity', () => {
	test('counts flows and minutes per dated day, skipping undated', () => {
		const days: AgendaDay[] = [
			{ date: '2026-05-18', flows: [flow({ minutes: [30] }), flow({ minutes: [10, 20] })] },
			{ date: null, flows: [flow({ minutes: [99] })] }
		];
		const density = computeAgendaDensity(days);
		expect(density.get('2026-05-18')).toEqual({ count: 2, minutes: 60 });
		expect(density.size).toBe(1);
	});

	test('returns an empty map for null input', () => {
		expect(computeAgendaDensity(null).size).toBe(0);
	});
});

describe('buildCalendarCells', () => {
	test('produces a 42-cell Monday-first grid with selection and density', () => {
		const density = computeAgendaDensity([
			{ date: '2026-05-18', flows: [flow({}), flow({})] }
		]);
		const cells = buildCalendarCells({
			baseIso: '2026-05-18',
			monthCursor: '2026-05',
			density,
			selectedIso: '2026-05-18'
		});
		expect(cells).toHaveLength(42);
		expect(cells[0].iso).toBe('2026-04-27');
		expect(cells[0].inMonth).toBe(false);
		const selected = cells.find(c => c.iso === '2026-05-18')!;
		expect(selected.isSelected).toBe(true);
		expect(selected.inMonth).toBe(true);
		expect(selected.hasContent).toBe(true);
		expect(selected.density).toBeGreaterThan(0);
	});
});

describe('buildSequentialTimeline', () => {
	test('accumulates start times and honours explicit startMin', () => {
		const items = buildSequentialTimeline([
			flow({ minutes: [30] }),
			flow({ startMin: 600, minutes: [15, 15] }),
			flow({ minutes: [10] })
		], 480);
		expect(items.map(i => [i.startMin, i.totalMin])).toEqual([
			[480, 30],
			[600, 30],
			[630, 10]
		]);
	});
});
