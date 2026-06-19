import { describe, expect, test } from 'vitest';
import { buildAgendaAiContext, buildAgendaAiDraftText, composeAiConversationInput } from './planner-ai.js';

describe('planner ai helpers', () => {
	test('uses the selected planning date in agenda ai context', () => {
		expect(buildAgendaAiContext('2026-06-24', '@260624\n#Morgon 08:00')).toEqual({
			date: '2026-06-24',
			currentPlan: '@260624\n#Morgon 08:00'
		});
	});

	test('uses the initial request for a new ai conversation', () => {
		expect(composeAiConversationInput({
			input: 'Planera en lektion om bråk',
			fallback: 'Start 5m',
			seed: '',
			questions: ''
		})).toBe('Planera en lektion om bråk');
	});

	test('keeps the original request and questions when sending answers', () => {
		expect(composeAiConversationInput({
			input: 'Eleverna kan grunderna. Fokus på problemlösning.',
			fallback: 'Start 5m',
			seed: 'Planera en lektion om bråk',
			questions: '? Vilka förkunskaper har eleverna?\n? Vad ska lektionen fokusera på?'
		})).toBe([
			'Ursprunglig instruktion:',
			'Planera en lektion om bråk',
			'',
			'AI-frågor:',
			'? Vilka förkunskaper har eleverna?',
			'? Vad ska lektionen fokusera på?',
			'',
			'Användarens svar:',
			'Eleverna kan grunderna. Fokus på problemlösning.'
		].join('\n'));
	});

	test('falls back to the current plan when no separate instruction exists', () => {
		expect(composeAiConversationInput({
			input: '',
			fallback: 'Start 5m\nGenomgång 20m',
			seed: '',
			questions: ''
		})).toBe('Start 5m\nGenomgång 20m');
	});

	test('can block fallback to avoid reusing a stale session as a new instruction', () => {
		expect(composeAiConversationInput({
			input: '',
			fallback: 'Gammal session 45m',
			seed: '',
			questions: '',
			allowFallback: false
		})).toBe('');
	});

	test('builds agenda ai draft from the ai response without carrying old day sessions', () => {
		const draft = buildAgendaAiDraftText('2026-05-31', '#Ny AI-plan 10:00\nNy aktivitet 30m');

		expect(draft).toContain('@260531');
		expect(draft).toContain('#Ny AI-plan 10:00');
		expect(draft).not.toContain('Gammal session');
	});
});
