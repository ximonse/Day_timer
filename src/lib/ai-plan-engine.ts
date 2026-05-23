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

export const AI_PLAN_METADATA_LIMIT = 4;

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

function stripMarkdownJsonFence(raw: string): string {
	const trimmed = raw.trim();
	const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
	return match ? match[1].trim() : trimmed;
}

function markerToClockMinutes(marker: string): number | null {
	if (!/^\d{3,4}$/.test(marker)) return null;
	const padded = marker.padStart(4, '0');
	const hours = Number(padded.slice(0, -2));
	const minutes = Number(padded.slice(-2));
	if (hours > 23 || minutes > 59) return null;
	return hours * 60 + minutes;
}

function markerEntries(lines: string[]): { index: number; marker: string; title: string }[] {
	return lines.flatMap((line, index) => {
		const match = line.trim().match(/^(\d{3,4})\s+(.+)$/);
		return match ? [{ index, marker: match[1], title: match[2].trim() }] : [];
	});
}

function markerDuration(entries: { marker: string }[], index: number): number | null {
	const current = entries[index];
	const next = entries[index + 1];
	if (!current || !next) return null;
	const clockValues = entries.map(entry => markerToClockMinutes(entry.marker));
	const useClock = clockValues.every(value => value !== null);
	const start = useClock ? clockValues[index]! : Number(current.marker);
	const end = useClock ? clockValues[index + 1]! : Number(next.marker);
	const duration = end - start;
	return duration > 0 && duration < 240 ? duration : null;
}

function sanitizeBareTimeMarkers(text: string): string {
	const lines = text.split('\n');
	const entries = markerEntries(lines);
	if (entries.length < 2) return text.trim();
	const entryByLine = new Map(entries.map((entry, index) => [entry.index, { entry, index }]));
	const out: string[] = [];
	for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
		const marker = entryByLine.get(lineIndex);
		if (!marker) {
			out.push(lines[lineIndex]);
			continue;
		}
		const lowerTitle = marker.entry.title.toLowerCase();
		if (lowerTitle === 'slut' || lowerTitle === 'sluttid' || lowerTitle === 'klar') continue;
		const duration = markerDuration(entries, marker.index);
		const title = marker.entry.title.replace(/\s+\d+m$/i, '').trim();
		out.push(duration ? `${title} ${duration}m` : title);
	}
	return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function sanitizePlanText(text: string): string {
	return sanitizeBareTimeMarkers(text);
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

function outputInstruction(context?: AiWorkspaceContext): string {
	if (context?.mode === 'agenda') {
		return 'Output i "text": komplett dagplan med datumrad @YYMMDD, sessionsrubriker som #Rubrik HH:MM och aktiviteter med tid.';
	}
	return 'Output i "text": endast aktivitetsrader for valt pass, utan sessionsrubriker, utan datumrad och utan startklockslag. Varje huvudrad ska antingen ha minuter som "Aktivitet 10m" eller sakna tid helt.';
}

export function buildAiPlanSystemPrompt(request: Pick<AiPlanRequest, 'planningMode' | 'intent' | 'userInput' | 'timeFrame' | 'currentPlan' | 'workspaceContext'>): string {
	const label = AI_PLANNING_MODE_LABELS[request.planningMode];
	const frame = timeFrameText(request.timeFrame);
	const currentPlan = request.currentPlan?.trim() ? request.currentPlan.trim() : 'Ingen befintlig plan.';
	const context = request.workspaceContext ? JSON.stringify(request.workspaceContext) : '{}';
	const output = outputInstruction(request.workspaceContext);

	return `Du ar Day Timers AI Plan Engine.

Lage: ${label}
Intent: ${request.intent}
Tidsram: ${frame}
Kontext: ${context}
Befintlig plan: ${currentPlan}

${modeInstruction(request.planningMode)}

${output}

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
- Skriv aldrig passaktiviteter som "895 Aktivitet", "09:05 Aktivitet" eller andra starttider.
- Underpunkter borja med "-".
- Kommentarer borja med "&".
- Om lage ar Fast pass ska total planerad tid halla ramen sa langt det gar.
- Om lage ar Dag med ankare ska fasta tider respekteras.
- Om lage ar Fri dag ska planen vara mild och startbar, inte overplanerad.`;
}

export function normalizeAiPlanResponse(raw: string): AiPlanResponse {
	const normalizedRaw = stripMarkdownJsonFence(raw);
	const fallback: AiPlanResponse = {
		text: normalizedRaw,
		assumptions: [],
		changes: [],
		warnings: []
	};

	try {
		const parsed = JSON.parse(normalizedRaw) as unknown;
		if (!isRecord(parsed) || typeof parsed.text !== 'string') return fallback;
		return {
			text: sanitizePlanText(parsed.text),
			assumptions: stringArray(parsed.assumptions),
			changes: stringArray(parsed.changes),
			warnings: stringArray(parsed.warnings)
		};
	} catch {
		return fallback;
	}
}

export function aiPlanMetadataItems(response: AiPlanResponse, limit = AI_PLAN_METADATA_LIMIT): string[] {
	return [...response.changes, ...response.assumptions, ...response.warnings].slice(0, limit);
}

export function hasAiPlanPreview(response: AiPlanResponse | null): response is AiPlanResponse {
	return !!response?.text.trim();
}
