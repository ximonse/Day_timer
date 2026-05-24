import { describe, expect, test } from 'vitest';
import {
	AI_PLANNING_MODE_LABELS,
	aiPlanMetadataItems,
	buildAiPlanSystemPrompt,
	isValidPlanningModeForContext,
	normalizeAiPlanResponse,
	reviewAiPlanResponse,
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

	test('agenda free day prompt encourages multiple soft sessions', () => {
		const prompt = buildAiPlanSystemPrompt({
			planningMode: 'free-day',
			intent: 'create',
			planMode: 'helpful',
			userInput: 'låg energi, handla, middag och röja köket',
			workspaceContext: { mode: 'agenda' },
			timeFrame: { date: '2026-05-25' }
		});

		expect(prompt).toContain('flera mjuka #sessioner');
		expect(prompt).toContain('#Mjuk start');
		expect(prompt).toContain('#Hemmaplock');
		expect(prompt).toContain('#Arenden');
		expect(prompt).toContain('Pressa inte in en hel dag som ett enda pass');
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
		expect(prompt).toContain('Sikta pa 4-6 lugna huvudblock');
		expect(prompt).toContain('Vakna lugnt 10m');
		expect(prompt).toContain('Kombinera inte vakna lugnt med te eller frukost');
		expect(prompt).toContain('Frukost & te pa trappen 35m');
		expect(prompt).toContain('Meditation & andning 15m');
		expect(prompt).toContain('Optimera inte exakt mot hela tidsramen');
	});

	test('returns compact metadata items in priority order', () => {
		const items = aiPlanMetadataItems({
			text: 'Start 5m',
			changes: ['Lade till start', 'Kortade titlar', 'Lade till paus'],
			assumptions: ['Antog 60 min', 'Antog trott grupp'],
			warnings: ['Planen ar tajt']
		});

		expect(items).toEqual([
			{ kind: 'warning', text: 'Planen ar tajt' },
			{ kind: 'change', text: 'Lade till start' },
			{ kind: 'change', text: 'Kortade titlar' },
			{ kind: 'change', text: 'Lade till paus' }
		]);
	});

	test('reviews empty ai plan text', () => {
		const reviewed = reviewAiPlanResponse({
			text: '',
			assumptions: [],
			changes: [],
			warnings: []
		}, { planningMode: 'free-day', contextMode: 'plan' });

		expect(reviewed.warnings).toContain('AI-svaret saknar användbar plantext.');
	});

	test('reviews start times in pass output', () => {
		const reviewed = reviewAiPlanResponse({
			text: '09:05 Meditation\nFrukost 20m',
			assumptions: [],
			changes: [],
			warnings: []
		}, { planningMode: 'fixed-session', contextMode: 'plan' });

		expect(reviewed.warnings).toContain('Pass ska använda minuter, inte starttider på aktivitetsrader.');
	});

	test('reviews whole-day input sent to pass planning', () => {
		const reviewed = reviewAiPlanResponse({
			text: 'Tvätta 25m\nHandla 30m\nMiddag 25m',
			assumptions: [],
			changes: [],
			warnings: []
		}, {
			planningMode: 'free-day',
			contextMode: 'plan',
			userInput: 'Jag har låg energi men behöver tvätta, handla, röja köket, ringa mamma och laga enkel middag.'
		});

		expect(reviewed.warnings).toContain('Det här låter som flera pass. Testa Dagplan/Agenda-AI för bättre uppdelning.');
	});

	test('reviews errands and phone call as multi-session input', () => {
		const reviewed = reviewAiPlanResponse({
			text: 'Tvätta 25m\nHandla 30m\nRinga mamma 10m',
			assumptions: [],
			changes: [],
			warnings: []
		}, {
			planningMode: 'free-day',
			contextMode: 'plan',
			userInput: 'Behöver tvätta, handla och ringa mamma.'
		});

		expect(reviewed.warnings).toContain('Det här låter som flera pass. Testa Dagplan/Agenda-AI för bättre uppdelning.');
	});

	test('reviews agenda output format', () => {
		const reviewed = reviewAiPlanResponse({
			text: 'Mjuk start 30m\nHandla 30m',
			assumptions: [],
			changes: [],
			warnings: []
		}, {
			planningMode: 'free-day',
			contextMode: 'agenda',
			userInput: 'Planera en mjuk dag.'
		});

		expect(reviewed.warnings).toContain('Dagplanen saknar datumrad som @YYMMDD.');
		expect(reviewed.warnings).toContain('Dagplanen behöver minst en #session med starttid.');
	});

	test('reviews free day with too many main blocks', () => {
		const reviewed = reviewAiPlanResponse({
			text: 'A 5m\nB 5m\nC 5m\nD 5m\nE 5m\nF 5m\nG 5m',
			assumptions: [],
			changes: [],
			warnings: []
		}, { planningMode: 'free-day', contextMode: 'plan' });

		expect(reviewed.warnings).toContain('Fri dag kan vara för uppsplittrad. Klustra hellre till färre lugna block.');
	});

	test('reviews short free day block with many subpoints', () => {
		const reviewed = reviewAiPlanResponse({
			text: 'Frukost på trappen 8m\n- koka vatten\n- välja te\n- ta med frukost\n- sitta ute',
			assumptions: [],
			changes: [],
			warnings: []
		}, { planningMode: 'free-day', contextMode: 'plan' });

		expect(reviewed.warnings).toContain('Minst ett block verkar för kort för sina underpunkter.');
		expect(reviewed.warnings).toContain('Te, frukost, meditation eller vila kan behöva mer tid än planen ger.');
	});

	test('reviews exact-fit language in free day plans', () => {
		const reviewed = reviewAiPlanResponse({
			text: 'Te 10m\n- i lugn takt\n\n& Planen tar exakt 97 minuter och är perfekt passform.',
			assumptions: [],
			changes: [],
			warnings: []
		}, { planningMode: 'free-day', contextMode: 'plan' });

		expect(reviewed.warnings).toContain('Te, frukost, meditation eller vila kan behöva mer tid än planen ger.');
		expect(reviewed.warnings).toContain('Fri dag bör lämna buffert, inte beskrivas som perfekt optimerad.');
	});

	test('does not duplicate review warnings', () => {
		const reviewed = reviewAiPlanResponse({
			text: '',
			assumptions: [],
			changes: [],
			warnings: ['AI-svaret saknar användbar plantext.']
		}, { planningMode: 'free-day', contextMode: 'plan' });

		expect(reviewed.warnings.filter((warning) => warning === 'AI-svaret saknar användbar plantext.')).toHaveLength(1);
	});
});
