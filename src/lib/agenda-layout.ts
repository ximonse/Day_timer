export const AGENDA_MINUTE_PX = 1.75;
export const AGENDA_TOP_BREATHING_ROOM_MIN = 30;
export const AGENDA_COMPACT_ITEM_MINUTES = 30;
export const AGENDA_DAY_START = 0;
export const AGENDA_DAY_END = 24 * 60;

export interface AgendaLayoutSourceItem {
	id: string;
	title: string;
	startMin: number;
	totalMin: number;
}

export interface AgendaLayoutWindow {
	start: number;
	end: number;
	minutes: number;
	heightPx: number;
}

export interface AgendaLayoutItem extends AgendaLayoutSourceItem {
	topPx: number;
	heightPx: number;
	topPct: number;
	heightPct: number;
	compact: boolean;
}

export interface AgendaLayout {
	window: AgendaLayoutWindow;
	items: AgendaLayoutItem[];
}

export function buildAgendaLayoutWindow(items: Pick<AgendaLayoutSourceItem, 'startMin' | 'totalMin'>[]): AgendaLayoutWindow {
	if (items.length === 0) {
		return {
			start: AGENDA_DAY_START,
			end: AGENDA_DAY_END,
			minutes: AGENDA_DAY_END - AGENDA_DAY_START,
			heightPx: (AGENDA_DAY_END - AGENDA_DAY_START) * AGENDA_MINUTE_PX
		};
	}
	const firstStart = Math.min(...items.map(item => item.startMin));
	const start = Math.max(AGENDA_DAY_START, firstStart - AGENDA_TOP_BREATHING_ROOM_MIN);
	const end = AGENDA_DAY_END;
	const minutes = Math.max(60, end - start);
	return { start, end, minutes, heightPx: minutes * AGENDA_MINUTE_PX };
}

export function minuteToY(minute: number, window: AgendaLayoutWindow): number {
	return (minute - window.start) * AGENDA_MINUTE_PX;
}

export function yToMinute(y: number, window: AgendaLayoutWindow, roundToMin = 1): number {
	const raw = window.start + y / AGENDA_MINUTE_PX;
	return Math.round(raw / roundToMin) * roundToMin;
}

export function buildAgendaLayout(items: AgendaLayoutSourceItem[]): AgendaLayout {
	const window = buildAgendaLayoutWindow(items);
	return {
		window,
		items: items.map((item) => {
			const topPx = minuteToY(item.startMin, window);
			const heightPx = item.totalMin * AGENDA_MINUTE_PX;
			return {
				...item,
				topPx,
				heightPx,
				topPct: topPx / window.heightPx * 100,
				heightPct: heightPx / window.heightPx * 100,
				compact: item.totalMin < AGENDA_COMPACT_ITEM_MINUTES
			};
		})
	};
}
