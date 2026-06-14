export type AiPlanningMode = 'fixed-session' | 'anchored-day' | 'free-day';
export type AiPlanIntent = 'create';
export type AiBehaviorMode = 'strict' | 'helpful';
export type AiAgendaPromptMode = 'notes' | 'calendar' | 'strict-format' | 'helpful-questions';

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
	planMode?: AiBehaviorMode;
	agendaPromptMode?: AiAgendaPromptMode;
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

export type AiPlanMetadataKind = 'change' | 'assumption' | 'warning';

export interface AiPlanMetadataItem {
	kind: AiPlanMetadataKind;
	text: string;
}

export interface AiPlanReviewContext {
	planningMode: AiPlanningMode;
	contextMode?: AiWorkspaceContext['mode'];
	userInput?: string;
}

export const AI_PLAN_METADATA_LIMIT = 4;

export const AI_PLANNING_MODE_LABELS: Record<AiPlanningMode, string> = {
	'fixed-session': 'Fast pass',
	'anchored-day': 'Dag med ankare',
	'free-day': 'Fri dag'
};

export const AI_SESSION_PLANNING_MODES: AiPlanningMode[] = ['fixed-session', 'free-day'];
export const AI_AGENDA_PLANNING_MODES: AiPlanningMode[] = ['anchored-day', 'free-day'];

export const AI_AGENDA_PROMPT_MODE_LABELS: Record<AiAgendaPromptMode, string> = {
	notes: 'Från anteckningar',
	calendar: 'Från kalender',
	'strict-format': 'Strikt formattering',
	'helpful-questions': 'Hjälpsam dialog'
};

export const AI_AGENDA_PROMPT_MODE_HELP: Record<AiAgendaPromptMode, string> = {
	notes: 'Gör lösa anteckningar till en tydlig dagplan.',
	calendar: 'Konverterar kalendertext till Day Timer-format.',
	'strict-format': 'Rättar formatet utan att hitta på innehåll.',
	'helpful-questions': 'Ställer frågor först om underlaget är för oklart.'
};

export const AI_PLAN_INTENT_LABELS: Record<AiPlanIntent, string> = {
	create: 'Skapa plan'
};

function stringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isValidPlanningModeForContext(context: 'plan' | 'agenda', mode: AiPlanningMode): boolean {
	const options = context === 'agenda' ? AI_AGENDA_PLANNING_MODES : AI_SESSION_PLANNING_MODES;
	return options.includes(mode);
}

function stripMarkdownJsonFence(raw: string): string {
	const trimmed = raw.trim();
	const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
	return match ? match[1].trim() : trimmed;
}

function looksLikeStructuredJson(raw: string): boolean {
	const text = stripMarkdownJsonFence(raw);
	return text.startsWith('{') || text.startsWith('[');
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

function modeInstruction(mode: AiPlanningMode, context?: AiWorkspaceContext): string {
	if (mode === 'fixed-session') {
		return 'Fast pass: start och slut ar normalt givna. Optimera insidan, hall dig inom den givna ramen, skapa progression, overgangar, variation och ett tydligt avslut.';
	}
	if (mode === 'anchored-day') {
		return 'Dag med ankare: respektera fasta ankare som moten, deadlines och hamtning. Bygg realistiska arbetsblock runt dem med buffert och prioritering.';
	}
	return `Fri dag: gor roran startbar med mjuk ordning, sma steg och paminnelser. Skapa mindre schema och mer stod.

Sikta pa 4-6 lugna huvudblock, inte manga smablock. Korta logistiska saker ska helst bli underpunkter i ett storre block.

Optimera inte exakt mot hela tidsramen; lamna hellre buffert och mjukhet.

Om anvandaren namner vakna lugnt, lugn start, ligga kvar eller landa i sangen ska det normalt vara ett eget kort startblock, till exempel:
"Vakna lugnt 10m"
- ligga kvar
- ta tiden pa dig

Kombinera inte vakna lugnt med te eller frukost nar anvandaren verkar mena tid i sangen innan hen gar upp.

Om anvandaren namner bade te och frukost ska de normalt kombineras till ett block, till exempel:
"Frukost & te pa trappen 35m"
- koka vatten
- valj te
- fixa frukost
- sitt ute i lugn

Om anvandaren namner meditation och andning ska blocket normalt heta:
"Meditation & andning 15m"
- hitta en lugn plats
- sitt bekvamt
- folj andningen

Undvik separata 10-minutersblock for ritualer, njutning eller aterhamtning. Ge dem hellre mer tid eller gor dem till del av ett storre block.

Klustra sma logistikmoment som medicin i hygien eller frukost nar det passar.

Undvik formuleringar som "perfekt passform", "tar exakt" eller att planen fyller hela tidsramen.`;
}

function agendaPlanningInstruction(mode: AiPlanningMode, context?: AiWorkspaceContext): string {
	if (context?.mode !== 'agenda' || mode !== 'free-day') return '';
	return `Nar Fri dag anvands i agenda ska du dela upp dagen i flera mjuka #sessioner om aktiviteterna hor hemma i olika delar av dagen.
Anvand 2-5 sessioner som till exempel #Mjuk start, #Hemmaplock, #Arenden och #Kväll.
Ge varje #session en rimlig starttid om anvandaren ger ankare, annars gor forsiktiga antaganden.
Pressa inte in en hel dag som ett enda pass.`;
}

function behaviorInstruction(planMode: AiBehaviorMode): string {
	if (planMode === 'strict') {
		return 'Strikt läge: återge användarens innehåll så nära som möjligt. Lägg inte till aktiviteter, pauser eller råd om det inte krävs för att formatet ska fungera.';
	}
	return 'Hjälpsamt läge: gör planen mer genomförbar med rimliga tider, buffert, övergångar och korta råd när det tydligt hjälper.';
}

function promptModeInstruction(mode: AiAgendaPromptMode | undefined, context?: AiWorkspaceContext): string {
	const isAgenda = context?.mode === 'agenda';
	if (mode === 'calendar') {
		return isAgenda ? `Promptlage: Fran kalender.
Konvertera kalenderhandelser eller inklistrad kalendertext till Day Timer-format.
Bevara fasta tider och rubriker sa langt det gar.
Lagg inte till nya aktiviteter som inte framgar av kalendertexten.
Om en handelse saknar detaljer, gor den till en enkel session med rimlig titel.` : `Promptlage: Fran kalender.
Konvertera kalenderhandelser eller inklistrad kalendertext till aktivitetsrader for ett enda pass.
Returnera inte datumrad eller sessionsrubriker.
Bevara det som faktiskt finns i kalendertexten och lagg inte till nya aktiviteter.`;
	}
	if (mode === 'strict-format') {
		return isAgenda ? `Promptlage: Strikt formattering.
Skriv om anvandarens text till giltigt Day Timer-format utan att fantisera.
Lagg inte till nya aktiviteter, pauser, rad eller antaganden.
Andra bara struktur, radbrytningar, datumrad, sessionsrubriker och tidssyntax nar det kravs for att appen ska kunna lasa texten.
Om tider saknas, behall sa mycket som mojligt utan att hitta pa detaljer.` : `Promptlage: Strikt formattering.
Skriv om anvandarens text till giltiga aktivitetsrader for ett enda pass utan att fantisera.
Lagg inte till nya aktiviteter, pauser, rad eller antaganden.
Returnera inte datumrad eller sessionsrubriker.
Andra bara struktur, radbrytningar, underpunkter och minutformat nar det kravs for att appen ska kunna lasa texten.`;
	}
	if (mode === 'helpful-questions') {
		return `Promptlage: Hjalpsam dialog.
Om underlaget ar for oklart for att skapa en anvandbar dagplan, returnera INTE dagplan.
Returnera da i "text" bara 1-3 korta fragor, en per rad, och varje fraga ska borja med "? ".
Stall bara fragor nar svaret faktiskt skulle andra planen tydligt.
Om underlaget racker, skapa ${isAgenda ? 'en hjalpsam dagplan' : 'ett hjalpsamt pass'} med rimliga block, buffert och overgangen.`;
	}
	return isAgenda ? `Promptlage: Fran anteckningar.
Gor losa anteckningar till en realistisk, tydlig och snall dagplan.
Strukturera dagen, lagg in pauser och foresla bra overgangen nar det hjalper.
Om nagot ar oklart men inte avgorande, gor ett forsiktigt antagande och markera det kort.` : `Promptlage: Fran anteckningar.
Gor losa anteckningar till ett realistiskt, tydligt och snallt pass.
Returnera bara aktivitetsrader, underpunkter och eventuella &&-kommentarer längst ner.
Strukturera passet, lagg in sma overgangen och foresla rimliga steg nar det hjalper.`;
}

function intentInstruction(): string {
	return 'Intent: Skapa en ny plan från användarens text.';
}

function outputInstruction(context?: AiWorkspaceContext): string {
	if (context?.mode === 'agenda') {
		return 'Output i "text": komplett dagplan med datumrad @YYMMDD, sessionsrubriker som #Rubrik HH:MM och aktiviteter med tid.';
	}
	return 'Output i "text": endast aktivitetsrader for valt pass, utan sessionsrubriker och utan datumrad.';
}

function planExample(planMode: AiBehaviorMode): string {
	if (planMode === 'strict') {
		return `Exempel för pass:
Frukost 20m

Promenad 30m
- ta med nycklar

&& Kom ihåg: möte kl 9.`;
	}
	return `Exempel för pass:
Vakna 5m

Toa 5m
- ta med telefonen

Medicin 2m

Frukost 20m
- kolla inte skärm

&& Om du vill hinna i tid kan det vara bra att lägga in 5 min buffert efter frukost.`;
}

function agendaExample(date?: string): string {
	const compactDate = (date ?? new Date().toISOString().slice(0, 10)).replace(/-/g, '').slice(2);
	return `Exempel för dag:
@${compactDate}
#Morgonrutin 07:00
Vakna 5m
Toa 5m
Frukost 20m
- kolla inte skärm
Förberedelse 10m

#Arbetspass 09:00
Planering 10m
Epost 20m
Djuparbete 60m
- stäng av notiser
Paus 10m
Uppföljning 15m

&& Det här upplägget ser hållbart ut, men lägg gärna in en kort paus efter första arbetspasset om dagen blir lång.`;
}

export function buildAiPlanSystemPrompt(request: Pick<AiPlanRequest, 'planningMode' | 'intent' | 'planMode' | 'agendaPromptMode' | 'userInput' | 'timeFrame' | 'currentPlan' | 'workspaceContext'>): string {
	const label = AI_PLANNING_MODE_LABELS[request.planningMode];
	const frame = timeFrameText(request.timeFrame);
	const currentPlan = request.currentPlan?.trim() ? request.currentPlan.trim() : 'Ingen befintlig plan.';
	const context = request.workspaceContext ? JSON.stringify(request.workspaceContext) : '{}';
	const output = outputInstruction(request.workspaceContext);
	const planMode = request.planMode ?? 'helpful';
	const example = request.workspaceContext?.mode === 'agenda' ? agendaExample(request.timeFrame?.date) : planExample(planMode);

	return `Du ar Day Timers AI Plan Engine.

Lage: ${label}
${intentInstruction()}
Tidsram: ${frame}
Kontext: ${context}
Befintlig plan: ${currentPlan}

${modeInstruction(request.planningMode, request.workspaceContext)}

${agendaPlanningInstruction(request.planningMode, request.workspaceContext)}

${behaviorInstruction(planMode)}

${promptModeInstruction(request.agendaPromptMode, request.workspaceContext)}

${output}

${example}

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
- För pass: inga rubriker, ingen inledning, ingen avslutning.
- Underpunkter borja med "-".
- Passkommentarer langst ner borja med "&&".
- Om lage ar Fast pass ska total planerad tid halla ramen sa langt det gar.
- Om lage ar Dag med ankare ska fasta tider respekteras.
- Om lage ar Fri dag ska planen vara mild och startbar, inte overplanerad.
- Ingen aktivitet far vara kortare an 5m.
- Om lage ar Fri dag ska du inte skriva att planen passar perfekt, fyller exakt tid eller optimerar totalramen.`;
}

export function normalizeAiPlanResponse(raw: string): AiPlanResponse {
	const normalizedRaw = stripMarkdownJsonFence(raw);
	const fallback: AiPlanResponse = {
		text: looksLikeStructuredJson(raw) ? '' : normalizedRaw,
		assumptions: [],
		changes: [],
		warnings: looksLikeStructuredJson(raw) ? ['AI-svaret kunde inte läsas som plan.'] : []
	};

	try {
		const parsed = JSON.parse(normalizedRaw) as unknown;
		if (!isRecord(parsed) || typeof parsed.text !== 'string') return fallback;
		return {
			text: parsed.text.trim(),
			assumptions: stringArray(parsed.assumptions),
			changes: stringArray(parsed.changes),
			warnings: stringArray(parsed.warnings)
		};
	} catch {
		const jsonStart = normalizedRaw.indexOf('{');
		const jsonEnd = normalizedRaw.lastIndexOf('}');
		if (jsonStart !== -1 && jsonEnd > jsonStart) {
			try {
				const extracted = JSON.parse(normalizedRaw.slice(jsonStart, jsonEnd + 1)) as unknown;
				if (isRecord(extracted) && typeof extracted.text === 'string') {
					return {
						text: (extracted.text as string).trim(),
						assumptions: stringArray(extracted.assumptions),
						changes: stringArray(extracted.changes),
						warnings: stringArray(extracted.warnings)
					};
				}
			} catch { /* ignore */ }
		}
		return fallback;
	}
}

export function aiPlanMetadataItems(response: AiPlanResponse, limit = AI_PLAN_METADATA_LIMIT): AiPlanMetadataItem[] {
	return [
		...response.warnings.map((text) => ({ kind: 'warning' as const, text })),
		...response.changes.map((text) => ({ kind: 'change' as const, text })),
		...response.assumptions.map((text) => ({ kind: 'assumption' as const, text }))
	].slice(0, limit);
}

interface PlanRow {
	title: string;
	duration: number | null;
	subpoints: number;
}

function planRows(text: string): PlanRow[] {
	const rows: PlanRow[] = [];
	for (const line of text.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('&') || trimmed.startsWith('#') || trimmed.startsWith('@')) continue;
		if (trimmed.startsWith('-')) {
			const last = rows.at(-1);
			if (last) last.subpoints += 1;
			continue;
		}
		const durationMatch = trimmed.match(/\b(\d+)\s*m\b/i);
		rows.push({
			title: trimmed.replace(/\s+\d+\s*m\b/i, '').trim(),
			duration: durationMatch ? Number(durationMatch[1]) : null,
			subpoints: 0
		});
	}
	return rows;
}

function hasActivityStartTime(text: string): boolean {
	return text.split('\n').some((line) => /^\s*(?:[01]?\d|2[0-3])[:.][0-5]\d\s+\S/.test(line));
}

function hasAgendaDateLine(text: string): boolean {
	return text.split('\n').some((line) => /^\s*@\d{6}\s*$/.test(line));
}

function hasAgendaSessionLine(text: string): boolean {
	return text.split('\n').some((line) => /^\s*#\S.*\s(?:[01]?\d|2[0-3])[:.][0-5]\d\s*$/.test(line));
}

function agendaSessionCount(text: string): number {
	return text.split('\n').filter((line) => /^\s*#\S.*\s(?:[01]?\d|2[0-3])[:.][0-5]\d\s*$/.test(line)).length;
}

function isRitualOrRecovery(title: string): boolean {
	return /\b(te|frukost|meditation|andning|vila|återhämtning|aterhamtning)\b/i.test(title);
}

function hasExactFitLanguage(text: string): boolean {
	return /\b(perfekt passform|tar exakt|exakt\s+\d+\s*min|fyller exakt|passar perfekt)\b/i.test(text);
}

function looksLikeMultiSessionInput(text: string): boolean {
	const normalized = text.toLowerCase();
	if (/\b(hela dagen|dagplan|flera pass|flera delar|senare|ikväll|i kväll|efter lunch|middag)\b/.test(normalized)) return true;
	const signals = [
		/\btvätta\b/,
		/\bhandla\b/,
		/\bröja\b|\broja\b/,
		/\bringa\b|\bringer\b/,
		/\bmamma\b/,
		/\blaga\b/,
		/\bmiddag\b/,
		/\bköket\b|\bkoket\b/
	];
	return signals.filter((signal) => signal.test(normalized)).length >= 3;
}

function addWarning(warnings: string[], warning: string) {
	if (!warnings.includes(warning)) warnings.push(warning);
}

export function reviewAiPlanResponse(response: AiPlanResponse, context: AiPlanReviewContext): AiPlanResponse {
	const warnings = [...response.warnings];
	const text = response.text.trim();
	const rows = planRows(text);

	if (!text) addWarning(warnings, 'AI-svaret saknar användbar plantext.');

	if (context.contextMode === 'plan' && hasActivityStartTime(text)) {
		addWarning(warnings, 'Pass ska använda minuter, inte starttider på aktivitetsrader.');
	}
	if (context.contextMode === 'plan' && context.userInput && looksLikeMultiSessionInput(context.userInput)) {
		addWarning(warnings, 'Det här låter som flera pass. Testa Dagplan/Agenda-AI för bättre uppdelning.');
	}
	if (context.contextMode === 'agenda' && text) {
		if (!hasAgendaDateLine(text)) addWarning(warnings, 'Dagplanen saknar datumrad som @YYMMDD.');
		if (!hasAgendaSessionLine(text)) addWarning(warnings, 'Dagplanen behöver minst en #session med starttid.');
		if (context.userInput && looksLikeMultiSessionInput(context.userInput) && agendaSessionCount(text) < 2) {
			addWarning(warnings, 'Dagen låter som flera delar. Dela gärna upp i fler #sessioner.');
		}
	}

	if (context.planningMode === 'free-day') {
		if (rows.length > 6) {
			addWarning(warnings, 'Fri dag kan vara för uppsplittrad. Klustra hellre till färre lugna block.');
		}
		if (rows.some((row) => row.subpoints >= 3 && row.duration !== null && row.duration < 10)) {
			addWarning(warnings, 'Minst ett block verkar för kort för sina underpunkter.');
		}
		if (rows.some((row) => isRitualOrRecovery(row.title) && row.duration !== null && row.duration < 20)) {
			addWarning(warnings, 'Te, frukost, meditation eller vila kan behöva mer tid än planen ger.');
		}
		if (hasExactFitLanguage(text)) {
			addWarning(warnings, 'Fri dag bör lämna buffert, inte beskrivas som perfekt optimerad.');
		}
	}

	return { ...response, warnings };
}
