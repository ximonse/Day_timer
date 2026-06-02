import { describe, expect, test } from 'vitest';
import type { AgendaDay } from './parse.js';
import type { Flow } from './state.svelte.js';
import { agendaDayFromDayPlan, dayPlanFromAgendaDay } from './day-plan.js';

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

describe('day plan model', () => {
	test('converts an agenda day into stable sessions and activities', () => {
		const agendaDay: AgendaDay = {
			date: '2026-06-03',
			flows: [
				flow({
					id: 'morning',
					title: 'Morgon',
					startMin: 8 * 60,
					parts: ['Te', 'Planera'],
					minutes: [15, 20],
					notes: ['ute', ''],
					warnings: [true, false],
					extraInfo: 'lugnt'
				})
			]
		};

		const plan = dayPlanFromAgendaDay(agendaDay, 7 * 60, () => 'new-id');

		expect(plan).toEqual({
			date: '2026-06-03',
			sessions: [{
				id: 'morning',
				title: 'Morgon',
				startMin: 8 * 60,
				extraInfo: 'lugnt',
				activities: [
					{ id: 'morning-a0', title: 'Te', minutes: 15, note: 'ute', warning: true },
					{ id: 'morning-a1', title: 'Planera', minutes: 20, note: '', warning: false }
				]
			}]
		});
	});

	test('converts a day plan back to agenda day without losing ids', () => {
		const agendaDay = agendaDayFromDayPlan({
			date: '2026-06-03',
			sessions: [{
				id: 'session-1',
				title: 'Fokus',
				startMin: 9 * 60,
				extraInfo: '',
				activities: [
					{ id: 'a1', title: 'Start', minutes: 10, note: '', warning: true },
					{ id: 'a2', title: 'Jobb', minutes: 35, note: 'djupt', warning: false }
				]
			}]
		});

		expect(agendaDay.flows[0]).toMatchObject({
			id: 'session-1',
			title: 'Fokus',
			startMin: 9 * 60,
			parts: ['Start', 'Jobb'],
			minutes: [10, 35],
			notes: ['', 'djupt'],
			warnings: [true, false]
		});
	});
});
