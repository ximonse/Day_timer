export type AiPlanningMode = 'fixed-session' | 'anchored-day' | 'free-day';
export type AiPlanIntent = 'create' | 'calm' | 'compress' | 'expand' | 'add-transitions' | 'make-teachable' | 'reduce-switching' | 'prioritize';

export interface AiTimeFrame {
	startMin?: number;
	endMin?: number;
	totalMin?: number;
	date?: string;
}

export interface AiWorkspaceContext {
	mode?: 'now' | 'plan' | 'agenda';
	dayTitle?: string;
	extraInfo?: string;
}

export interface AiPlanRequest {
	planningMode: AiPlanningMode;
	intent: AiPlanIntent;
	userInput: string;
	currentPlan?: string;
	timeFrame?: AiTimeFrame;
	workspaceContext?: AiWorkspaceContext;
}

export interface AiPlanResponse {
	text: string;
	assumptions: string[];
	changes: string[];
	warnings: string[];
}

export const AI_PLANNING_MODE_LABELS: Record<AiPlanningMode, string> = {
	'fixed-session': 'Fast pass',
	'anchored-day': 'Dag med ankare',
	'free-day': 'Fri dag'
};

export const AI_PLAN_INTENT_LABELS: Record<AiPlanIntent, string> = {
	create: 'Skapa plan',
	calm: 'Gor lugnare',
	compress: 'Korta',
	expand: 'Mer detaljerad',
	'add-transitions': 'Lagg till overgangar',
	'make-teachable': 'Mer pedagogisk',
	'reduce-switching': 'Farre vaxlingar',
	prioritize: 'Prioritera'
};

function stringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function timeFrameText(timeFrame?: AiTimeFrame): string {
	if (!timeFrame) return 'Ingen exakt tidsram angiven.';
	const parts: string[] = [];
	if (typeof timeFrame.totalMin === 'number') parts.push(`${timeFrame.totalMin} minuter`);
	if (typeof timeFrame.startMin === 'number') parts.push(`startMin ${timeFrame.startMin}`);
	if (typeof timeFrame.endMin === 'number') parts.push(`endMin ${timeFrame.endMin}`);
	if (timeFrame.date) parts.push(`datum ${timeFrame.date}`);
	return parts.length ? parts.join(', ') : 'Ingen exakt tidsram angiven.';
}

function modeInstruction(mode: AiPlanningMode): string {
	if (mode === 'fixed-session') {
		return 'Fast pass: start och slut ar normalt givna. Optimera insidan, hall dig inom den givna ramen, skapa progression, overgangar, variation och ett tydligt avslut.';
	}
	if (mode === 'anchored-day') {
		return 'Dag med ankare: respektera fasta ankare som moten, deadlines och hamtning. Bygg realistiska arbetsblock runt dem med buffert och prioritering.';
	}
	return 'Fri dag: gor roran startbar med mjuk ordning, sma steg och paminnelser. Skapa mindre schema och mer stod.';
}

export function buildAiPlanSystemPrompt(request: Pick<AiPlanRequest, 'planningMode' | 'intent' | 'userInput' | 'timeFrame' | 'currentPlan' | 'workspaceContext'>): string {
	const label = AI_PLANNING_MODE_LABELS[request.planningMode];
	const frame = timeFrameText(request.timeFrame);
	const currentPlan = request.currentPlan?.trim() ? request.currentPlan.trim() : 'Ingen befintlig plan.';
	const context = request.workspaceContext ? JSON.stringify(request.workspaceContext) : '{}';

	return `Du ar Day Timers AI Plan Engine.

Lage: ${label}
Intent: ${request.intent}
Tidsram: ${frame}
Kontext: ${context}
Befintlig plan: ${currentPlan}

${modeInstruction(request.planningMode)}

Returnera BARA JSON i detta format:
{
  "text": "Day Timer-format",
  "assumptions": ["kort antagande"],
  "changes": ["kort andring"],
  "warnings": ["kort varning"]
}

Regler:
- Texten i "text" ska vara strikt Day Timer-format.
- Aktiviteter ska ha korta svenska namn.
- Underpunkter borja med "-".
- Kommentarer borja med "&".
- Om lage ar Fast pass ska total planerad tid halla ramen sa langt det gar.
- Om lage ar Dag med ankare ska fasta tider respekteras.
- Om lage ar Fri dag ska planen vara mild och startbar, inte overplanerad.`;
}

export function normalizeAiPlanResponse(raw: string): AiPlanResponse {
	const fallback: AiPlanResponse = {
		text: raw.trim(),
		assumptions: [],
		changes: [],
		warnings: []
	};

	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!isRecord(parsed) || typeof parsed.text !== 'string') return fallback;
		return {
			text: parsed.text.trim(),
			assumptions: stringArray(parsed.assumptions),
			changes: stringArray(parsed.changes),
			warnings: stringArray(parsed.warnings)
		};
	} catch {
		return fallback;
	}
}
