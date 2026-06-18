import { type AgendaFlowMeta, type Flow } from './state.svelte.js';
import { mergeAgendaDayData, parseAgenda, serializeAgenda, stripDraftComments, type AgendaDay } from './parse.js';
import {
	buildAgendaItemsForDay,
	cloneAgendaDay,
	insertFlowIntoAgendaDate,
	makeAgendaMetaKeyForFlow,
	moveAgendaMeta,
	rebuildAgendaMetaForDay,
	serializeSelectedAgendaDay,
	type AgendaItem,
	type AgendaMetaMap
} from './agenda.js';

export type AgendaDraftSource = 'manual' | 'ai';

export interface SaveAgendaDraftInput {
	activeText: string;
	draftText: string;
	targetDate: string;
	source: AgendaDraftSource;
	agendaMeta: AgendaMetaMap;
	agendaDayStart: number;
}

export interface SaveAgendaDraftResult {
	days: AgendaDay[];
	savedText: string;
	draftText: string;
	draftDirty: boolean;
	draftSource: 'manual';
	agendaMeta: AgendaMetaMap;
}

export function saveAgendaDraft(input: SaveAgendaDraftInput): SaveAgendaDraftResult {
	const cleanedDraft = stripDraftComments(input.draftText);
	const parsedDraft = cleanedDraft.trim() ? parseAgenda(cleanedDraft) : [];
	const draftDay = parsedDraft.find(day => day.date === input.targetDate)
		?? (parsedDraft[0] ? { ...parsedDraft[0], date: input.targetDate } : { date: input.targetDate, flows: [] });
	const baseDays = input.activeText.trim() ? parseAgenda(input.activeText) : [];
	const previousDay = baseDays.find(day => day.date === input.targetDate) ?? null;
	const previousFlows = previousDay?.flows ?? [];
	const draftDayWithIds = {
		...draftDay,
		flows: draftDay.flows.map((flow, index) => ({
			...flow,
			id: previousFlows[index]?.id ?? flow.id
		}))
	};
	const days = input.source === 'ai'
		? mergeAgendaDayData(input.activeText, draftDayWithIds.flows.length > 0 ? [draftDayWithIds] : [])
		: (() => {
			const preservedDays = baseDays
				.filter(day => day.date !== input.targetDate)
				.map(day => cloneAgendaDay(day));
			return draftDayWithIds.flows.length > 0
				? [...preservedDays, cloneAgendaDay(draftDayWithIds)].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
				: preservedDays.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
		})();
	const savedDay = days.find(day => day.date === input.targetDate) ?? null;
	return {
		days,
		savedText: serializeAgenda(days),
		draftText: serializeSelectedAgendaDay(input.targetDate, days, { includeIds: false }),
		draftDirty: false,
		draftSource: 'manual',
		agendaMeta: rebuildAgendaMetaForDay(
			input.agendaMeta,
			input.targetDate,
			previousDay,
			savedDay,
			input.agendaDayStart,
			{ defaultMeta: { source: input.source === 'ai' ? 'ai' : 'manual' } }
		)
	};
}

export function deleteAgendaItemAt(days: AgendaDay[] | null | undefined, dayIdx: number, flowIdx: number): AgendaDay[] {
	return (days ?? []).map((day, index) =>
		index === dayIdx
			? { ...day, flows: day.flows.filter((_, itemIndex) => itemIndex !== flowIdx) }
			: cloneAgendaDay(day)
	);
}

export interface RenameAgendaItemInput {
	days: AgendaDay[] | null | undefined;
	dayIdx: number;
	flowIdx: number;
	title: string;
	agendaDayStart: number;
	agendaMeta: AgendaMetaMap;
}

export interface RenameAgendaItemResult {
	days: AgendaDay[];
	agendaMeta: AgendaMetaMap;
	updatedItem: AgendaItem | null;
}

export function renameAgendaItemAt(input: RenameAgendaItemInput): RenameAgendaItemResult {
	const nextTitle = input.title.trim() || 'Utan rubrik';
	const originalDay = input.days?.[input.dayIdx] ?? null;
	const originalItems = originalDay ? buildAgendaItemsForDay(originalDay, input.agendaDayStart) : [];
	const originalItem = originalItems[input.flowIdx] ?? null;
	const oldMetaKey = originalDay && originalItem
		? makeAgendaMetaKeyForFlow(originalDay.date ?? null, originalItem.flow, originalItem.startMin)
		: null;
	const days = (input.days ?? []).map((day, dayIndex) =>
		dayIndex === input.dayIdx
			? { ...day, flows: day.flows.map((flow, flowIndex) => flowIndex === input.flowIdx ? { ...flow, title: nextTitle } : { ...flow }) }
			: cloneAgendaDay(day)
	);
	const updatedDay = days[input.dayIdx] ?? null;
	const updatedItems = updatedDay ? buildAgendaItemsForDay(updatedDay, input.agendaDayStart) : [];
	return {
		days,
		agendaMeta: oldMetaKey && updatedDay && updatedItems[input.flowIdx]
			? moveAgendaMeta(input.agendaMeta, oldMetaKey, makeAgendaMetaKeyForFlow(updatedDay.date ?? null, updatedItems[input.flowIdx].flow, updatedItems[input.flowIdx].startMin))
			: input.agendaMeta,
		updatedItem: updatedItems[input.flowIdx] ?? null
	};
}

export interface AddManualAgendaItemInput {
	days: AgendaDay[] | null | undefined;
	targetDate: string;
	id: string;
	startMin: number;
	duration: number;
}

export function addManualAgendaItem(input: AddManualAgendaItemInput) {
	const flow: Flow = {
		id: input.id,
		title: 'Nytt block',
		parts: ['Aktivitet'],
		minutes: [input.duration],
		warnings: [true],
		notes: [''],
		extraInfo: '',
		startMin: input.startMin
	};
	return insertFlowIntoAgendaDate(input.days, input.targetDate, flow, input.startMin);
}
