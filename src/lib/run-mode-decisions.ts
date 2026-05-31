import type { AppSection } from './state.svelte.js';
import {
	findAgendaItemForTime,
	findNextAgendaItemAfterTime,
	resolveAgendaFlowRef,
	type AgendaFlowRef,
	type AgendaItem
} from './agenda.js';
import type { AgendaDay } from './parse.js';

export function agendaAutoLoadKey(item: Pick<AgendaItem, 'startMin' | 'totalMin' | 'flow'>): string {
	return `${item.startMin}-${item.totalMin}-${item.flow.title}-${item.flow.parts.length}`;
}

export function decideNowAgendaTarget(days: AgendaDay[] | null | undefined, date: string, nowMin: number, fallbackStart: number) {
	const active = findAgendaItemForTime(days, date, nowMin, fallbackStart);
	if (active) return { kind: 'active' as const, item: active };
	const next = findNextAgendaItemAfterTime(days, date, nowMin, fallbackStart);
	if (next) return { kind: 'next' as const, item: next };
	return null;
}

export interface DecideAutoLoadInput {
	activeSection: AppSection;
	partsDraftDirty: boolean;
	agendaItems: Pick<AgendaItem, 'flow' | 'startMin' | 'totalMin'>[];
	nowMin: number;
	days: AgendaDay[] | null | undefined;
	activeRef: AgendaFlowRef | null;
	lastAutoLoadKey: string;
}

export type AutoLoadDecision =
	| { action: 'skip' }
	| { action: 'mark-current'; key: string }
	| { action: 'load'; key: string; item: Pick<AgendaItem, 'flow' | 'startMin' | 'totalMin'> };

export function decideAutoLoadAgendaItem(input: DecideAutoLoadInput): AutoLoadDecision {
	if (input.activeSection !== 'now' || input.partsDraftDirty) return { action: 'skip' };
	if (!input.agendaItems.length) return { action: 'skip' };
	const current = resolveAgendaFlowRef(input.days ?? null, input.activeRef);
	if (current && input.nowMin >= current.startMin && input.nowMin < current.startMin + current.totalMin) {
		return { action: 'mark-current', key: agendaAutoLoadKey(current) };
	}
	const active = input.agendaItems.find(item =>
		input.nowMin >= item.startMin && input.nowMin < item.startMin + item.totalMin
	);
	if (!active) return { action: 'skip' };
	const key = agendaAutoLoadKey(active);
	if (key === input.lastAutoLoadKey) return { action: 'skip' };
	return { action: 'load', key, item: active };
}
