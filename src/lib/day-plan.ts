import { buildAgendaItemsForDay } from './agenda.js';
import { totalFlowMinutes, type AgendaDay } from './parse.js';
import type { Flow } from './state.svelte.js';

export interface DayPlanActivity {
	id: string;
	title: string;
	minutes: number;
	note: string;
	warning: boolean;
}

export interface DayPlanSession {
	id: string;
	title: string;
	startMin: number;
	extraInfo: string;
	activities: DayPlanActivity[];
}

export interface DayPlan {
	date: string | null;
	sessions: DayPlanSession[];
}

export function dayPlanFromAgendaDay(day: AgendaDay, fallbackStart: number, createId: () => string): DayPlan {
	const items = buildAgendaItemsForDay(day, fallbackStart);
	return {
		date: day.date,
		sessions: items.map((item) => {
			const flow = item.flow;
			const sessionId = flow.id || createId();
			return {
				id: sessionId,
				title: flow.title,
				startMin: item.startMin,
				extraInfo: flow.extraInfo || '',
				activities: flow.parts.map((title, index) => ({
					id: `${sessionId}-a${index}`,
					title,
					minutes: flow.minutes[index] ?? 45,
					note: flow.notes?.[index] ?? '',
					warning: flow.warnings?.[index] ?? true
				}))
			};
		})
	};
}

export function flowFromDayPlanSession(session: DayPlanSession): Flow {
	return {
		id: session.id,
		title: session.title,
		startMin: session.startMin,
		parts: session.activities.map(activity => activity.title),
		minutes: session.activities.map(activity => activity.minutes),
		notes: session.activities.map(activity => activity.note),
		warnings: session.activities.map(activity => activity.warning),
		extraInfo: session.extraInfo
	};
}

export function agendaDayFromDayPlan(plan: DayPlan): AgendaDay {
	return {
		date: plan.date,
		flows: plan.sessions.map(flowFromDayPlanSession)
	};
}

export function totalDayPlanSessionMinutes(session: DayPlanSession): number {
	return session.activities.reduce((sum, activity) => sum + activity.minutes, 0);
}

export function dayPlanSessionFromFlow(flow: Flow, startMin: number): DayPlanSession {
	const sessionId = flow.id || flow.title || 'session';
	const fallbackMinutes = totalFlowMinutes(flow);
	return {
		id: sessionId,
		title: flow.title,
		startMin,
		extraInfo: flow.extraInfo || '',
		activities: flow.parts.map((title, index) => ({
			id: `${sessionId}-a${index}`,
			title,
			minutes: flow.minutes[index] ?? fallbackMinutes,
			note: flow.notes?.[index] ?? '',
			warning: flow.warnings?.[index] ?? true
		}))
	};
}
