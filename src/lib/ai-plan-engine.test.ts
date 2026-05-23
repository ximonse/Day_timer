import { describe, expect, test } from 'vitest';
import {
	AI_PLANNING_MODE_LABELS,
	aiPlanMetadataItems,
	hasAiPlanPreview,
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

	test('normalizes structured output wrapped in markdown json fence', () => {
		const parsed = normalizeAiPlanResponse(`\`\`\`json
{
  "text": "Start 5m\\nArbete 10m",
  "assumptions": ["Antog lugn start"],
  "changes": ["Lade till arbete"],
  "warnings": []
}
\`\`\``);

		expect(parsed).toEqual<AiPlanResponse>({
			text: 'Start 5m\nArbete 10m',
			assumptions: ['Antog lugn start'],
			changes: ['Lade till arbete'],
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
			workspaceContext: { mode: 'plan' },
			timeFrame: { totalMin: 60 }
		});

		expect(prompt).toContain('Fast pass');
		expect(prompt).toContain('hall dig inom den givna ramen');
		expect(prompt).toContain('60 minuter');
		expect(prompt).toContain('utan sessionsrubriker');
		expect(prompt).toContain('Returnera BARA JSON');
	});

	test('builds anchored day prompt around fixed anchors', () => {
		const prompt = buildAiPlanSystemPrompt({
			planningMode: 'anchored-day',
			intent: 'create',
			userInput: 'mote 10 och 14',
			workspaceContext: { mode: 'agenda' },
			timeFrame: { date: '2026-05-23' }
		});

		expect(prompt).toContain('Dag med ankare');
		expect(prompt).toContain('fasta ankare');
		expect(prompt).toContain('2026-05-23');
		expect(prompt).toContain('@YYMMDD');
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

	test('detects only non-empty preview text as previewable', () => {
		expect(hasAiPlanPreview({ text: 'Start 5m', changes: [], assumptions: [], warnings: [] })).toBe(true);
		expect(hasAiPlanPreview({ text: '   ', changes: ['Lade till start'], assumptions: [], warnings: [] })).toBe(false);
		expect(hasAiPlanPreview(null)).toBe(false);
	});
});
