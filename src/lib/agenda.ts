import type { AgendaFlowMeta, Flow } from './state.svelte.js';
import { serializeAgenda, totalFlowMinutes, type AgendaDay } from './parse.js';
import { localDateISO, monthKey, parseIsoDate } from './date.js';

export interface AgendaFlowRef {
	date: string | null;
	title: string;
	startMin: number;
	totalMin: number;
	partCount: number;
}

export interface AgendaItem {
	day: AgendaDay;
	flow: Flow;
	flowIdx: number;
	startMin: number;
	totalMin: number;
}

export type AgendaMetaMap = Record<string, AgendaFlowMeta>;

export interface AgendaMetaLookup {
	exact: Map<string, AgendaFlowMeta>;
	signature: Map<string, AgendaFlowMeta>;
}

export interface RebuildAgendaMetaOptions {
	overridesByKey?: Map<string, AgendaFlowMeta>;
	overridesBySignature?: Map<string, AgendaFlowMeta>;
	defaultMeta?: AgendaFlowMeta;
}

export function deriveAgendaDayStart(day: AgendaDay, fallbackStart: number): number {
	const firstExplicitIdx = day.flows.findIndex(flow => flow.startMin !== undefined);
	if (firstExplicitIdx < 0) return fallbackStart;
	let start = day.flows[firstExplicitIdx].startMin!;
	for (let i = firstExplicitIdx - 1; i >= 0; i--) {
		start -= totalFlowMinutes(day.flows[i]);
	}
	return start;
}

export function buildAgendaItemsForDay(day: AgendaDay, fallbackStart: number): AgendaItem[] {
	let cursor = deriveAgendaDayStart(day, fallbackStart);
	return day.flows.map((flow, flowIdx) => {
		if (flow.startMin !== undefined) cursor = flow.startMin;
		const startMin = cursor;
		const totalMin = totalFlowMinutes(flow);
		cursor += totalMin;
		return { day, flow, flowIdx, startMin, totalMin };
	});
}

export interface AgendaDensityEntry {
	count: number;
	minutes: number;
}

export function computeAgendaDensity(days: AgendaDay[] | null): Map<string, AgendaDensityEntry> {
	const map = new Map<string, AgendaDensityEntry>();
	for (const day of days ?? []) {
		if (!day.date) continue;
		const minutes = day.flows.reduce((sum, flow) => sum + totalFlowMinutes(flow), 0);
		map.set(day.date, { count: day.flows.length, minutes });
	}
	return map;
}

export interface CalendarCell {
	iso: string;
	label: number;
	inMonth: boolean;
	isSelected: boolean;
	density: number;
	hasContent: boolean;
}

export function buildCalendarCells(opts: {
	baseIso: string;
	monthCursor: string;
	density: Map<string, AgendaDensityEntry>;
	selectedIso: string;
}): CalendarCell[] {
	const monthIso = opts.monthCursor || monthKey(parseIsoDate(opts.baseIso));
	const [year, month] = monthIso.split('-').map(Number);
	const first = new Date(year, month - 1, 1);
	const startOffset = (first.getDay() - 1 + 7) % 7;
	const gridStart = new Date(year, month - 1, 1 - startOffset);
	const cells: CalendarCell[] = [];
	const densities = [...opts.density.values()].map(entry => entry.count);
	const maxCount = densities.length ? Math.max(...densities) : 1;
	for (let i = 0; i < 42; i++) {
		const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
		const iso = localDateISO(date);
		const densityEntry = opts.density.get(iso);
		cells.push({
			iso,
			label: date.getDate(),
			inMonth: date.getMonth() === first.getMonth(),
			isSelected: iso === opts.selectedIso,
			density: densityEntry ? Math.max(0.2, densityEntry.count / maxCount) : 0,
			hasContent: Boolean(densityEntry)
		});
	}
	return cells;
}

export interface TimelineItem {
	flow: Flow;
	startMin: number;
	totalMin: number;
}

export function buildSequentialTimeline(flows: Flow[], fallbackStart: number): TimelineItem[] {
	let cursor = fallbackStart;
	return flows.map(flow => {
		if (flow.startMin !== undefined) cursor = flow.startMin;
		const startMin = cursor;
		const totalMin = totalFlowMinutes(flow);
		cursor += totalMin;
		return { flow, startMin, totalMin };
	});
}

export function cloneAgendaDay(day: AgendaDay): AgendaDay {
	return {
		date: day.date,
		flows: day.flows.map(flow => ({
			...flow,
			parts: Array.isArray(flow.parts) ? [...flow.parts] : [],
			minutes: Array.isArray(flow.minutes) ? [...flow.minutes] : [],
			warnings: Array.isArray(flow.warnings) ? [...flow.warnings] : [],
			notes: Array.isArray(flow.notes) ? [...flow.notes] : []
		}))
	};
}

export function cloneAgendaDays(days: AgendaDay[] | null | undefined): AgendaDay[] {
	return (days ?? []).map(cloneAgendaDay);
}

export function insertFlowIntoAgendaDate(
	days: AgendaDay[] | null | undefined,
	date: string,
	flow: Flow,
	startMin: number
): { days: AgendaDay[]; dayIdx: number; flow: Flow } {
	const nextDays = cloneAgendaDays(days);
	let dayIdx = nextDays.findIndex(day => day.date === date);
	if (dayIdx < 0) {
		const insertAt = nextDays.findIndex(day => day.date !== null && day.date > date);
		const newDay: AgendaDay = { date, flows: [] };
		if (insertAt < 0) {
			nextDays.push(newDay);
			dayIdx = nextDays.length - 1;
		} else {
			nextDays.splice(insertAt, 0, newDay);
			dayIdx = insertAt;
		}
	}

	const flowToInsert: Flow = { ...flow, startMin };
	const dayFlows = [...nextDays[dayIdx].flows];
	const insertAt = dayFlows.findIndex(item => (item.startMin ?? 0) > startMin);
	if (insertAt < 0) dayFlows.push(flowToInsert);
	else dayFlows.splice(insertAt, 0, flowToInsert);
	nextDays[dayIdx] = { ...nextDays[dayIdx], flows: dayFlows };

	return { days: nextDays, dayIdx, flow: flowToInsert };
}

export function replaceAgendaFlowInDays(
	days: AgendaDay[] | null | undefined,
	dayIdx: number,
	flowIdx: number,
	flow: Flow
): AgendaDay[] {
	const nextDays = cloneAgendaDays(days);
	if (!nextDays[dayIdx]) return nextDays;
	const dayFlows = [...nextDays[dayIdx].flows];
	dayFlows[flowIdx] = { ...flow };
	nextDays[dayIdx] = { ...nextDays[dayIdx], flows: dayFlows };
	return nextDays;
}

export function serializeSelectedAgendaDay(date: string | null, days: AgendaDay[] | null, options: { includeIds?: boolean } = {}): string {
	if (!date) return '';
	const day = days?.find(entry => entry.date === date);
	return day ? serializeAgenda([cloneAgendaDay(day)], options) : `@${date.slice(2, 4)}${date.slice(5, 7)}${date.slice(8, 10)}\n`;
}

export function suggestedStartMinForDate(days: AgendaDay[] | null | undefined, date: string, durationMin: number): number {
	const day = days?.find(entry => entry.date === date) ?? null;
	if (!day || day.flows.length === 0) return 8 * 60;
	const items = buildAgendaItemsForDay(day, 8 * 60);
	const last = items[items.length - 1];
	const roundedEnd = Math.ceil((last.startMin + last.totalMin) / 5) * 5;
	return Math.min(roundedEnd, Math.max(8 * 60, 24 * 60 - durationMin));
}

export function findAgendaItemForTime(days: AgendaDay[] | null | undefined, date: string, minute: number, fallbackStart: number): AgendaItem | null {
	const day = days?.find(entry => entry.date === date) ?? null;
	if (!day) return null;
	return buildAgendaItemsForDay(day, fallbackStart)
		.filter(item => minute >= item.startMin && minute < item.startMin + item.totalMin)
		.sort((a, b) => b.startMin - a.startMin)[0] ?? null;
}

export function findNextAgendaItemAfterTime(days: AgendaDay[] | null | undefined, date: string, minute: number, fallbackStart: number): AgendaItem | null {
	const day = days?.find(entry => entry.date === date) ?? null;
	if (!day) return null;
	return buildAgendaItemsForDay(day, fallbackStart)
		.filter(item => item.startMin > minute)
		.sort((a, b) => a.startMin - b.startMin)[0] ?? null;
}

export function makeAgendaFlowRef(date: string | null, flow: Flow, startMin: number): AgendaFlowRef {
	return {
		date,
		title: flow.title,
		startMin,
		totalMin: totalFlowMinutes(flow),
		partCount: flow.parts.length
	};
}

export function makeAgendaMetaKey(date: string | null, title: string, startMin: number, totalMin: number, partCount: number): string {
	return JSON.stringify([date ?? '', title, startMin, totalMin, partCount]);
}

export function makeAgendaMetaKeyForFlow(date: string | null, flow: Flow, startMin: number): string {
	return makeAgendaMetaKey(date, flow.title, startMin, totalFlowMinutes(flow), flow.parts.length);
}

export function agendaMetaSignature(flow: Flow, startMin: number): string {
	return JSON.stringify([
		startMin,
		flow.title,
		flow.parts,
		flow.minutes,
		flow.extraInfo || ''
	]);
}

export function makeAgendaMetaKeyForRef(ref: AgendaFlowRef): string {
	return makeAgendaMetaKey(ref.date, ref.title, ref.startMin, ref.totalMin, ref.partCount);
}

function cloneAgendaMeta(meta: AgendaFlowMeta): AgendaFlowMeta {
	return { ...meta };
}

export function removeAgendaMetaForDate(meta: AgendaMetaMap, date: string | null): AgendaMetaMap {
	const next: AgendaMetaMap = {};
	for (const [key, value] of Object.entries(meta)) {
		try {
			const [storedDate] = JSON.parse(key);
			if ((storedDate || '') !== (date ?? '')) next[key] = value;
		} catch {
			next[key] = value;
		}
	}
	return next;
}

export function buildAgendaMetaLookup(meta: AgendaMetaMap, date: string | null, day: AgendaDay | null, fallbackStart: number): AgendaMetaLookup {
	const exact = new Map<string, AgendaFlowMeta>();
	const signature = new Map<string, AgendaFlowMeta>();
	if (!day) return { exact, signature };
	for (const item of buildAgendaItemsForDay(day, fallbackStart)) {
		const key = makeAgendaMetaKeyForFlow(date, item.flow, item.startMin);
		const itemMeta = meta[key];
		if (!itemMeta) continue;
		exact.set(key, cloneAgendaMeta(itemMeta));
		signature.set(agendaMetaSignature(item.flow, item.startMin), cloneAgendaMeta(itemMeta));
	}
	return { exact, signature };
}

export function rebuildAgendaMetaForDay(
	meta: AgendaMetaMap,
	date: string | null,
	previousDay: AgendaDay | null,
	nextDay: AgendaDay | null,
	fallbackStart: number,
	options?: RebuildAgendaMetaOptions
): AgendaMetaMap {
	let nextMeta = removeAgendaMetaForDate(meta, date);
	if (!nextDay) return nextMeta;
	const previousLookup = buildAgendaMetaLookup(meta, date, previousDay, fallbackStart);
	const nextFallbackStart = nextDay.flows[0]?.startMin ?? fallbackStart;
	for (const item of buildAgendaItemsForDay(nextDay, nextFallbackStart)) {
		const key = makeAgendaMetaKeyForFlow(date, item.flow, item.startMin);
		const signature = agendaMetaSignature(item.flow, item.startMin);
		const itemMeta =
			options?.overridesByKey?.get(key) ??
			options?.overridesBySignature?.get(signature) ??
			previousLookup.exact.get(key) ??
			previousLookup.signature.get(signature) ??
			options?.defaultMeta;
		if (itemMeta) nextMeta = { ...nextMeta, [key]: cloneAgendaMeta(itemMeta) };
	}
	return nextMeta;
}

export function moveAgendaMeta(meta: AgendaMetaMap, oldKey: string, newKey: string): AgendaMetaMap {
	if (oldKey === newKey) return meta;
	const itemMeta = meta[oldKey];
	if (!itemMeta) return meta;
	const next = { ...meta };
	delete next[oldKey];
	next[newKey] = itemMeta;
	return next;
}

export function agendaMetaLabel(meta: AgendaFlowMeta | null): string {
	if (!meta) return 'Ospecificerad';
	if (meta.source === 'template') return meta.label ? `Mall: ${meta.label}` : 'Mall';
	if (meta.source === 'ai') return 'AI-planerad';
	if (meta.source === 'import') return meta.label ? `Import: ${meta.label}` : 'Importerad';
	return 'Manuellt skapad';
}

export function agendaMetaBadge(meta: AgendaFlowMeta | null): string {
	if (!meta) return '';
	if (meta.source === 'template') return 'Mall';
	if (meta.source === 'ai') return 'AI';
	if (meta.source === 'import') return meta.label === 'ICS-kalender' ? 'ICS' : 'Import';
	return 'Manuell';
}

export function agendaMetaHelp(meta: AgendaFlowMeta | null): string {
	if (!meta || meta.source === 'manual') {
		return 'Det här blocket är nu ett vanligt dagplansblock utan särskild koppling.';
	}
	if (meta.source === 'template') {
		return 'Blocket skapades från en mall. Ändringar här påverkar bara dagplanen, inte originalmallen.';
	}
	if (meta.source === 'ai') {
		return 'Blocket skapades av AI och går nu att finjustera som ett vanligt dagplansblock.';
	}
	const detail = meta.detail ? ` ${meta.detail}` : '';
	return `Blocket kom in via import.${detail} Om du vill behandla det som helt eget kan du göra det manuellt.`;
}

export function resolveAgendaFlowRef(days: AgendaDay[] | null, ref: AgendaFlowRef | null) {
	if (!days || !ref) return null;
	const dayIdx = days.findIndex(day => day.date === ref.date);
	if (dayIdx < 0) return null;
	const day = days[dayIdx];
	const items = buildAgendaItemsForDay(day, ref.startMin);
	const exact = items.find(item => item.startMin === ref.startMin && item.flow.title === ref.title);
	if (exact) return { ...exact, dayIdx };
	const fallback = items.find(item =>
		item.flow.title === ref.title &&
		item.totalMin === ref.totalMin &&
		item.flow.parts.length === ref.partCount
	);
	return fallback ? { ...fallback, dayIdx } : null;
}
