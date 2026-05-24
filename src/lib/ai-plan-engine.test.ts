import { describe, expect, test } from 'vitest';
import {
	AI_PLANNING_MODE_LABELS,
	aiPlanMetadataItems,
	buildAiPlanSystemPrompt,
	isValidPlanningModeForContext,
	normalizeAiPlanResponse,
	type AiPlanResponse
} from './ai-plan-engine.js';

describe('ai-plan-engine', () => {
	test('normalizes valid structured model output', () => {
		const parsed = normalizeAiPlanResponse(JSON.stringify({
			text: 'Start 5m\nGenomgang 10m',
			assumptions: ['Antog fast pass pa 60 min'],
			changes: ['Lade till start'],
			warnings: ['Planen ar tajt']
		}));

		expect(parsed).toEqual<AiPlanResponse>({
			text: 'Start 5m\nGenomgang 10m',
			assumptions: ['Antog fast pass pa 60 min'],
			changes: ['Lade till start'],
			warnings: ['Planen ar tajt']
		});
	});

	test('normalizes json wrapped in a markdown code fence', () => {
		const parsed = normalizeAiPlanResponse('```json\n{"text":"Start 5m","assumptions":["Antog kort pass"],"changes":["Kortade namn"],"warnings":[]}\n```');

		expect(parsed).toEqual<AiPlanResponse>({
			text: 'Start 5m',
			assumptions: ['Antog kort pass'],
			changes: ['Kortade namn'],
			warnings: []
		});
	});

	test('does not expose malformed json as plan text', () => {
		const parsed = normalizeAiPlanResponse('```json\n{"text":"Start 5m", "warnings": [}\n```');

		expect(parsed.text).toBe('');
		expect(parsed.warnings).toContain('AI-svaret kunde inte läsas som plan.');
	});

	test('falls back to plain text when model output is not json', () => {
		const parsed = normalizeAiPlanResponse('Start 5m\nGenomgang 10m');

		expect(parsed).toEqual<AiPlanResponse>({
			text: 'Start 5m\nGenomgang 10m',
			assumptions: [],
			changes: [],
			warnings: []
		});
	});

	test('keeps public Swedish labels stable', () => {
		expect(AI_PLANNING_MODE_LABELS['fixed-session']).toBe('Fast pass');
		expect(AI_PLANNING_MODE_LABELS['anchored-day']).toBe('Dag med ankare');
		expect(AI_PLANNING_MODE_LABELS['free-day']).toBe('Fri dag');
	});

	test('limits planning modes by ui context', () => {
		expect(isValidPlanningModeForContext('plan', 'fixed-session')).toBe(true);
		expect(isValidPlanningModeForContext('plan', 'anchored-day')).toBe(false);
		expect(isValidPlanningModeForContext('agenda', 'anchored-day')).toBe(true);
		expect(isValidPlanningModeForContext('agenda', 'fixed-session')).toBe(false);
	});

	test('builds fixed session prompt with hard time-frame language', () => {
		const prompt = buildAiPlanSystemPrompt({
			planningMode: 'fixed-session',
			intent: 'create',
			planMode: 'helpful',
			userInput: 'Ak 4 procent',
			workspaceContext: { mode: 'plan' },
			timeFrame: { totalMin: 60 }
		});

		expect(prompt).toContain('Fast pass');
		expect(prompt).toContain('hall dig inom den givna ramen');
		expect(prompt).toContain('60 minuter');
		expect(prompt).toContain('utan sessionsrubriker');
		expect(prompt).toContain('Returnera BARA JSON');
	});

	test('create intent has explicit behavior instructions', () => {
		const prompt = buildAiPlanSystemPrompt({
			planningMode: 'fixed-session',
			intent: 'create',
			planMode: 'helpful',
			userInput: 'lektion',
			workspaceContext: { mode: 'plan' }
		});

		expect(prompt).toContain('Intent: Skapa en ny plan');
	});

	test('future intents are not exposed as bare unexplained tokens', () => {
		const prompt = buildAiPlanSystemPrompt({
			planningMode: 'fixed-session',
			intent: 'compress',
			planMode: 'helpful',
			userInput: 'lektion',
			workspaceContext: { mode: 'plan' }
		});

		expect(prompt).toContain('Intent: Skapa en ny plan');
		expect(prompt).not.toContain('Intent: compress');
	});

	test('fixed session prompt includes concrete activity format examples', () => {
		const prompt = buildAiPlanSystemPrompt({
			planningMode: 'fixed-session',
			intent: 'create',
			planMode: 'helpful',
			userInput: 'ak 4 procent',
			workspaceContext: { mode: 'plan' },
			timeFrame: { totalMin: 60 }
		});

		expect(prompt).toContain('Frukost 20m');
		expect(prompt).toContain('- kolla inte skärm');
		expect(prompt).toContain('& Om');
		expect(prompt).toContain('inga rubriker');
	});

	test('builds anchored day prompt around fixed anchors', () => {
		const prompt = buildAiPlanSystemPrompt({
			planningMode: 'anchored-day',
			intent: 'create',
			planMode: 'helpful',
			userInput: 'mote 10 och 14',
			workspaceContext: { mode: 'agenda' },
			timeFrame: { date: '2026-05-23' }
		});

		expect(prompt).toContain('Dag med ankare');
		expect(prompt).toContain('fasta ankare');
		expect(prompt).toContain('2026-05-23');
		expect(prompt).toContain('@YYMMDD');
	});

	test('agenda prompt includes concrete day plan example', () => {
		const prompt = buildAiPlanSystemPrompt({
			planningMode: 'anchored-day',
			intent: 'create',
			planMode: 'helpful',
			userInput: 'möte kl 10 och 14',
			workspaceContext: { mode: 'agenda' },
			timeFrame: { date: '2026-05-24' }
		});

		expect(prompt).toContain('@260524');
		expect(prompt).toContain('#Morgonrutin 07:00');
		expect(prompt).toContain('Djuparbete 60m');
		expect(prompt).toContain('#Rubrik HH:MM');
	});

	test('builds free day prompt with softer scheduling language', () => {
		const prompt = buildAiPlanSystemPrompt({
			planningMode: 'free-day',
			intent: 'create',
			planMode: 'helpful',
			userInput: 'tvatta och handla'
		});

		expect(prompt).toContain('Fri dag');
		expect(prompt).toContain('startbar');
		expect(prompt).toContain('mindre schema');
	});

	test('returns compact metadata items in priority order', () => {
		const items = aiPlanMetadataItems({
			text: 'Start 5m',
			changes: ['Lade till start', 'Kortade titlar', 'Lade till paus'],
			assumptions: ['Antog 60 min', 'Antog trott grupp'],
			warnings: ['Planen ar tajt']
		});

		expect(items).toEqual([
			'Lade till start',
			'Kortade titlar',
			'Lade till paus',
			'Antog 60 min'
		]);
	});
});
