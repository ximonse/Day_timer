import { describe, expect, test } from 'vitest';
import { parseAgenda, serializeAgenda } from './parse.js';
import { makeAgendaFlowRef } from './agenda.js';
import { prepareAgendaFlowLoad, syncSessionToAgenda } from './session-agenda-binding.js';

describe('session agenda binding', () => {
	test('writes an implicitly bound agenda session back even without explicit plan selection', () => {
		const days = parseAgenda(['@260531', '#Morgon 08:00 <!--id:abc1234-->', 'Start 30m'].join('\n'));
		const ref = makeAgendaFlowRef('2026-05-31', days[0].flows[0], 8 * 60);
		const result = syncSessionToAgenda({
			days,
			activeRef: ref,
			activeSection: 'now',
			source: { kind: 'agenda', date: '2026-05-31', title: 'Morgon', startMin: 8 * 60 },
			forceUpdate: false,
			planSelectionExplicit: false,
			session: {
				title: 'Ändrad',
				blocks: [{ id: 'b1', title: 'Ny', minutes: 20, note: '', warning: true, pinned: false }],
				extraInfo: '',
				startMin: 8 * 60
			},
			agendaMeta: {},
			createId: () => 'newid'
		});

		expect(result).not.toBeNull();
		expect(serializeAgenda(result!.days)).toContain('Ny 20m');
	});

	test('writes an explicit session back to the referenced agenda flow', () => {
		const days = parseAgenda(['@260531', '#Morgon 08:00 <!--id:abc1234-->', 'Start 30m'].join('\n'));
		const ref = makeAgendaFlowRef('2026-05-31', days[0].flows[0], 8 * 60);
		const result = syncSessionToAgenda({
			days,
			activeRef: ref,
			activeSection: 'plan',
			source: { kind: 'agenda', date: '2026-05-31', title: 'Morgon', startMin: 8 * 60 },
			forceUpdate: false,
			planSelectionExplicit: true,
			session: {
				title: 'Ändrad',
				blocks: [{ id: 'b1', title: 'Ny', minutes: 20, note: 'not', warning: true, pinned: false }],
				extraInfo: 'extra',
				startMin: 8 * 60 + 5
			},
			agendaMeta: {
				[JSON.stringify(['2026-05-31', 'Morgon', 480, 30, 1])]: { source: 'manual' }
			},
			createId: () => 'newid'
		});

		expect(result).not.toBeNull();
		expect(serializeAgenda(result!.days)).toContain('#Ändrad 08:05 <!--id:abc1234-->');
		expect(serializeAgenda(result!.days)).toContain('Ny 20m');
		expect(result!.activeRef).toMatchObject({ title: 'Ändrad', startMin: 485, totalMin: 20, partCount: 1 });
		expect(result!.agendaMeta[JSON.stringify(['2026-05-31', 'Morgon', 480, 30, 1])]).toBeUndefined();
		expect(result!.agendaMeta[JSON.stringify(['2026-05-31', 'Ändrad', 485, 20, 1])]).toEqual({ source: 'manual' });
	});

	test('can shift following agenda flows when a run-until-checked session overruns', () => {
		const days = parseAgenda([
			'@260531',
			'#Morgon 08:00 <!--id:abc1234-->',
			'Diskussion %',
			'#Nästa 08:10 <!--id:def5678-->',
			'Start 20m'
		].join('\n'));
		const ref = makeAgendaFlowRef('2026-05-31', days[0].flows[0], 8 * 60);
		const result = syncSessionToAgenda({
			days,
			activeRef: ref,
			activeSection: 'now',
			source: { kind: 'agenda', date: '2026-05-31', title: 'Morgon', startMin: 8 * 60 },
			forceUpdate: true,
			planSelectionExplicit: false,
			session: {
				title: 'Morgon',
				blocks: [{ id: 'b1', title: 'Diskussion', minutes: 17, note: '', warning: true, pinned: false }],
				extraInfo: '',
				startMin: 8 * 60
			},
			shiftFollowingMin: 7,
			agendaMeta: {},
			createId: () => 'newid'
		});

		expect(result).not.toBeNull();
		expect(serializeAgenda(result!.days)).toContain('#Nästa 08:17 <!--id:def5678-->');
	});

	test('prepares agenda flow load without mutating previous agenda state', () => {
		const days = parseAgenda(['@260531', '#Morgon 08:00 <!--id:abc1234-->', 'Start 30m'].join('\n'));
		const result = prepareAgendaFlowLoad({
			date: '2026-05-31',
			flow: days[0].flows[0],
			computedStart: 8 * 60,
			targetSection: 'now',
			markExplicitSelection: false,
			createId: () => 'block1'
		});

		expect(result.session.dayTitle).toBe('Morgon');
		expect(result.session.startMin).toBe(8 * 60);
		expect(result.session.blocks).toEqual([
			{ id: 'block1', title: 'Start', minutes: 30, note: '', warning: true, pinned: true }
		]);
		expect(result.activeRef).toMatchObject({ date: '2026-05-31', title: 'Morgon', startMin: 480 });
		expect(result.planSelectionExplicit).toBe(false);
		expect(result.sessionSource).toEqual({ kind: 'agenda', date: '2026-05-31', title: 'Morgon', startMin: 480 });
	});
});
