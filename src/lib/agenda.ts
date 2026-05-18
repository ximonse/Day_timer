import type { AgendaFlowMeta, Flow } from './state.svelte.js';
import { serializeAgenda, totalFlowMinutes, type AgendaDay } from './parse.js';

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

export function cloneAgendaDay(day: AgendaDay): AgendaDay {
	return {
		date: day.date,
		flows: day.flows.map(flow => ({
			...flow,
			parts: [...flow.parts],
			minutes: [...flow.minutes],
			warnings: [...flow.warnings],
			notes: [...flow.notes]
		}))
	};
}

export function serializeSelectedAgendaDay(date: string | null, days: AgendaDay[] | null): string {
	if (!date) return '';
	const day = days?.find(entry => entry.date === date);
	return day ? serializeAgenda([cloneAgendaDay(day)]) : `@${date.slice(2, 4)}${date.slice(5, 7)}${date.slice(8, 10)}\n`;
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
	return buildAgendaItemsForDay(day, fallbackStart).find(item =>
		minute >= item.startMin && minute < item.startMin + item.totalMin
	) ?? null;
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
