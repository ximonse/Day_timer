import { describe, expect, test } from 'vitest';
import {
	AI_PLANNING_MODE_LABELS,
	buildAiPlanSystemPrompt,
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

	test('builds fixed session prompt with hard time-frame language', () => {
		const prompt = buildAiPlanSystemPrompt({
			planningMode: 'fixed-session',
			intent: 'create',
			userInput: 'Ak 4 procent',
			timeFrame: { totalMin: 60 }
		});

		expect(prompt).toContain('Fast pass');
		expect(prompt).toContain('hall dig inom den givna ramen');
		expect(prompt).toContain('60 minuter');
		expect(prompt).toContain('Returnera BARA JSON');
	});

	test('builds anchored day prompt around fixed anchors', () => {
		const prompt = buildAiPlanSystemPrompt({
			planningMode: 'anchored-day',
			intent: 'create',
			userInput: 'mote 10 och 14',
			timeFrame: { date: '2026-05-23' }
		});

		expect(prompt).toContain('Dag med ankare');
		expect(prompt).toContain('fasta ankare');
		expect(prompt).toContain('2026-05-23');
	});

	test('builds free day prompt with softer scheduling language', () => {
		const prompt = buildAiPlanSystemPrompt({
			planningMode: 'free-day',
			intent: 'create',
			userInput: 'tvatta och handla'
		});

		expect(prompt).toContain('Fri dag');
		expect(prompt).toContain('startbar');
		expect(prompt).toContain('mindre schema');
	});
});
