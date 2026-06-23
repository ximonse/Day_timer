import type { FlowCompletion } from './flow-execution.js';
import type { ActualTimeEntry } from './state.svelte.js';
import { inferSubjectCategory } from './learning.js';

export interface FlowActualEntryInput {
	date: string;
	agendaDate: string | null;
	sessionTitle: string;
	dayTextSnapshot: string;
	completion: FlowCompletion;
	confirmedAt?: number;
}

export function makeFlowActualEntry(input: FlowActualEntryInput): ActualTimeEntry {
	const confirmedAt = input.confirmedAt ?? Date.now();
	return {
		id: `${input.date}|flow|${input.completion.blockId}|${Math.round(input.completion.startedAtMin * 1000)}`,
		date: input.date,
		agendaDate: input.agendaDate,
		title: input.completion.title || 'Aktivitet',
		subjectCategory: inferSubjectCategory(input.completion.title || ''),
		weekday: new Date(`${input.date}T12:00:00`).getDay(),
		startMin: input.completion.startedAtMin,
		endMinActual: input.completion.completedAtMin,
		durationActualMin: input.completion.actualMinutes,
		dayTextSnapshot: input.dayTextSnapshot,
		confirmed: true,
		confirmedAt,
		autoFinalized: false,
		entryKind: 'activity',
		executionMode: 'flow',
		plannedDurationMin: input.completion.plannedMinutes,
		sessionTitle: input.sessionTitle,
		blockId: input.completion.blockId
	};
}
