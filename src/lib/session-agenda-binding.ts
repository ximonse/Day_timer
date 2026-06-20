import type { AgendaFlowMeta, AppSection, Block, Flow } from './state.svelte.js';
import {
	makeAgendaFlowRef,
	makeAgendaMetaKeyForRef,
	moveAgendaMeta,
	rebuildAgendaMetaForDay,
	replaceAgendaFlowInDays,
	resolveAgendaFlowRef,
	shiftAgendaFlowsAfter,
	type AgendaFlowRef
} from './agenda.js';
import type { AgendaDay } from './parse.js';
import { createSessionStateFromFlow, makeFlowFromSession } from './session.js';
import { canWriteActiveSessionBack } from './active-session-binding.js';

export type SessionSource =
	| { kind: 'unscheduled' }
	| { kind: 'template'; templateId: string; title: string }
	| { kind: 'agenda'; date: string | null; title: string; startMin: number };

export interface SessionAgendaState {
	title: string;
	blocks: Block[];
	extraInfo: string;
	startMin: number;
}

export interface SyncSessionToAgendaInput {
	days: AgendaDay[] | null | undefined;
	activeRef: AgendaFlowRef | null;
	activeSection: AppSection;
	source: SessionSource;
	forceUpdate: boolean;
	planSelectionExplicit: boolean;
	session: SessionAgendaState;
	shiftFollowingMin?: number;
	agendaMeta: Record<string, AgendaFlowMeta>;
	createId: () => string;
}

export function syncSessionToAgenda(input: SyncSessionToAgendaInput) {
	if (!canWriteActiveSessionBack({
		source: input.source,
		activeSection: input.activeSection,
		forceUpdate: input.forceUpdate,
		planSelectionExplicit: input.planSelectionExplicit
	})) return null;
	const daysInput = input.days ?? null;
	const active = resolveAgendaFlowRef(daysInput, input.activeRef);
	if (!active || !daysInput || !input.activeRef) return null;
	const oldKey = makeAgendaMetaKeyForRef(input.activeRef);
	const replacedDays = replaceAgendaFlowInDays(daysInput, active.dayIdx, active.flowIdx, makeFlowFromSession({
		id: active.flow.id,
		title: input.session.title,
		blocks: input.session.blocks,
		extraInfo: input.session.extraInfo,
		startMin: input.session.startMin
	}, input.createId));
	const days = input.shiftFollowingMin
		? shiftAgendaFlowsAfter(replacedDays, active.dayIdx, active.flowIdx, input.shiftFollowingMin)
		: replacedDays;
	const previousDay = daysInput[active.dayIdx] ?? null;
	const nextDay = days[active.dayIdx] ?? null;
	const activeRef = {
		...input.activeRef,
		title: input.session.title,
		startMin: input.session.startMin,
		totalMin: input.session.blocks.reduce((sum, block) => sum + block.minutes, 0),
		partCount: input.session.blocks.length
	};
	const movedMeta = moveAgendaMeta(input.agendaMeta, oldKey, makeAgendaMetaKeyForRef(activeRef));
	return {
		days,
		activeRef,
		agendaMeta: input.shiftFollowingMin
			? rebuildAgendaMetaForDay(movedMeta, input.activeRef.date, previousDay, nextDay, input.session.startMin)
			: movedMeta
	};
}

export interface PrepareAgendaFlowLoadInput {
	date: string | null;
	flow: Flow;
	computedStart: number;
	targetSection: AppSection;
	markExplicitSelection: boolean;
	createId: () => string;
}

export function prepareAgendaFlowLoad(input: PrepareAgendaFlowLoadInput) {
	const session = createSessionStateFromFlow(input.flow, input.createId, {
		startMin: input.flow.startMin ?? input.computedStart,
		pinned: minutes => minutes > 0,
		clockSpan: 60
	});
	const activeRef = makeAgendaFlowRef(input.date, input.flow, session.startMin);
	return {
		session,
		activeRef,
		planSelectionExplicit: input.markExplicitSelection && input.targetSection === 'plan',
		sessionSource: { kind: 'agenda', date: input.date, title: input.flow.title, startMin: session.startMin } as SessionSource
	};
}
