import type { Flow } from './state.svelte.js';

export interface FlowAgendaItem {
	flow: Pick<Flow, 'title'>;
	startMin: number;
	totalMin: number;
}

export function adjustAgendaItemsForFlowRun<T extends FlowAgendaItem>(
	items: T[],
	active: { title: string; startMin: number },
	plannedTotalMin: number,
	liveEndMin: number
): T[] {
	const currentIndex = items.findIndex(item => item.startMin === active.startMin && item.flow.title === active.title);
	if (currentIndex < 0) return items;
	const plannedEnd = active.startMin + plannedTotalMin;
	const shiftMin = Math.max(0, liveEndMin - plannedEnd);
	if (shiftMin <= 0) return items;
	return items.map((item, index) => {
		if (index === currentIndex) return { ...item, totalMin: item.totalMin + shiftMin };
		if (index > currentIndex) return { ...item, startMin: item.startMin + shiftMin };
		return item;
	});
}
export function nextAgendaItemForFlowRun<T extends FlowAgendaItem>(
	items: T[],
	active: { title: string; startMin: number }
): T | null {
	const currentIndex = items.findIndex(item => item.startMin === active.startMin && item.flow.title === active.title);
	return currentIndex >= 0 ? items[currentIndex + 1] ?? null : null;
}

