import { describe, expect, test } from 'vitest';
import { parseAgenda, serializeAgenda } from './parse.js';
import {
	addManualAgendaItem,
	deleteAgendaItemAt,
	renameAgendaItemAt,
	saveAgendaDraft
} from './agenda-actions.js';

describe('agenda actions', () => {
	test('saves a selected day draft without removing other days', () => {
		const result = saveAgendaDraft({
			activeText: [
				'@260531',
				'#Morgon 08:00',
				'Start 30m',
				'@260601',
				'#Jobb 09:00',
				'Fokus 45m'
			].join('\n'),
			draftText: ['@260531', '#Ny morgon 08:15', 'Te 20m'].join('\n'),
			targetDate: '2026-05-31',
			source: 'manual',
			agendaMeta: {},
			agendaDayStart: 8 * 60
		});

		expect(result.savedText).toContain('#Ny morgon 08:15');
		expect(result.savedText).toContain('@260601');
		expect(result.savedText).toContain('#Jobb 09:00');
		expect(result.draftText).toContain('#Ny morgon 08:15');
		expect(result.draftDirty).toBe(false);
	});

	test('renames an agenda item and keeps flow identity', () => {
		const days = parseAgenda(['@260531', '#Morgon 08:00 <!--id:abc1234-->', 'Start 30m'].join('\n'));
		const result = renameAgendaItemAt({
			days,
			dayIdx: 0,
			flowIdx: 0,
			title: 'Ny rubrik',
			agendaDayStart: 8 * 60,
			agendaMeta: {}
		});

		expect(result.days[0].flows[0].title).toBe('Ny rubrik');
		expect(result.days[0].flows[0].id).toBe('abc1234');
		expect(result.updatedItem?.startMin).toBe(8 * 60);
		expect(serializeAgenda(result.days)).toContain('#Ny rubrik 08:00 <!--id:abc1234-->');
	});

	test('moves agenda metadata when an item is renamed', () => {
		const days = parseAgenda(['@260531', '#Morgon 08:00 <!--id:abc1234-->', 'Start 30m'].join('\n'));
		const result = renameAgendaItemAt({
			days,
			dayIdx: 0,
			flowIdx: 0,
			title: 'Ny rubrik',
			agendaDayStart: 8 * 60,
			agendaMeta: {
				[JSON.stringify(['2026-05-31', 'Morgon', 480, 30, 1])]: { source: 'manual', label: 'Gammal' }
			}
		});

		expect(result.agendaMeta[JSON.stringify(['2026-05-31', 'Morgon', 480, 30, 1])]).toBeUndefined();
		expect(result.agendaMeta[JSON.stringify(['2026-05-31', 'Ny rubrik', 480, 30, 1])]).toEqual({ source: 'manual', label: 'Gammal' });
	});

	test('deletes an agenda item from the selected day only', () => {
		const days = parseAgenda([
			'@260531',
			'#Morgon 08:00',
			'Start 30m',
			'#Lunch 12:00',
			'Äta 30m',
			'@260601',
			'#Jobb 09:00',
			'Fokus 45m'
		].join('\n'));

		const result = deleteAgendaItemAt(days, 0, 0);

		expect(result[0].flows.map(flow => flow.title)).toEqual(['Lunch']);
		expect(result[1].flows.map(flow => flow.title)).toEqual(['Jobb']);
	});

	test('adds a manual agenda item at the requested placement', () => {
		const days = parseAgenda(['@260531', '#Morgon 08:00', 'Start 30m'].join('\n'));
		const result = addManualAgendaItem({
			days,
			targetDate: '2026-05-31',
			id: 'new1234',
			startMin: 8 * 60 + 30,
			duration: 30
		});

		expect(result.flow.title).toBe('Nytt block');
		expect(result.flow.id).toBe('new1234');
		expect(result.flow.startMin).toBe(8 * 60 + 30);
		expect(result.flow.minutes).toEqual([30]);
		expect(serializeAgenda(result.days)).toContain('#Nytt block 08:30 <!--id:new1234-->');
	});
});
