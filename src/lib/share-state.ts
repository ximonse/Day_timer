import type { AgendaDay } from './parse.js';
import { serializeAgenda } from './parse.js';
import { fmtAgendaDate } from './date.js';
import { createSessionStateFromFlow } from './session.js';
import type { AppState, Block, Flow } from './state.svelte.js';

export type ShareMode = 'active-session-live' | 'selected-session-snapshot' | 'selected-day-snapshot';

export interface SharedUiState {
	palette: AppState['palette'];
	dark: boolean;
	showLeft: boolean;
	showCenterEnd: boolean;
	hollow: boolean;
	textOutside: boolean;
	showMin: boolean;
	showFive: boolean;
	showQuarter: boolean;
	segMinutesMode: AppState['segMinutesMode'];
	showSegNotes: boolean;
	showExtraInfo: boolean;
	showSegLabels: boolean;
}

export interface SelectedAgendaDetails {
	day: AgendaDay;
	flow: Flow;
	startMin: number;
}

export interface LiveShareState extends SharedUiState {
	shareType: 'active-session-live';
	blocks: Block[];
	dayTitle: string;
	extraInfo: string;
	startMin: number;
	endMode: AppState['endMode'];
	clockSpan: AppState['clockSpan'];
	agendaText: string;
	agendaDate: string;
}

export interface SelectedSessionShareState extends SharedUiState {
	shareType: 'selected-session-snapshot';
	blocks: Block[];
	dayTitle: string;
	extraInfo: string;
	startMin: number;
	endMode: 'end';
	clockSpan: 60;
	agendaText: string;
	agendaDate: string;
}

export interface SelectedDayShareState extends SharedUiState {
	shareType: 'selected-day-snapshot';
	blocks: Block[];
	dayTitle: string;
	extraInfo: string;
	startMin: number;
	endMode: 'end';
	clockSpan: 720;
	agendaText: string;
	agendaDate: string;
}

function cloneBlocks(blocks: Block[]): Block[] {
	return blocks.map(block => ({ ...block }));
}

export function sharedUiStateFromState(state: Pick<AppState, keyof SharedUiState>): SharedUiState {
	return {
		palette: state.palette,
		dark: state.dark,
		showLeft: state.showLeft,
		showCenterEnd: state.showCenterEnd,
		hollow: state.hollow,
		textOutside: state.textOutside,
		showMin: state.showMin,
		showFive: state.showFive,
		showQuarter: state.showQuarter,
		segMinutesMode: state.segMinutesMode,
		showSegNotes: state.showSegNotes,
		showExtraInfo: state.showExtraInfo,
		showSegLabels: state.showSegLabels
	};
}

export function buildLiveShareState(state: Pick<AppState, keyof SharedUiState | 'blocks' | 'dayTitle' | 'extraInfo' | 'startMin' | 'endMode' | 'clockSpan' | 'agendaText' | 'agendaDate'>): LiveShareState {
	return {
		shareType: 'active-session-live',
		...sharedUiStateFromState(state),
		blocks: cloneBlocks(state.blocks),
		dayTitle: state.dayTitle,
		extraInfo: state.extraInfo,
		startMin: state.startMin,
		endMode: state.endMode,
		clockSpan: state.clockSpan,
		agendaText: state.agendaText,
		agendaDate: state.agendaDate
	};
}

export function buildSelectedSessionSnapshot(
	details: SelectedAgendaDetails,
	state: Pick<AppState, keyof SharedUiState>,
	createId: () => string
): SelectedSessionShareState {
	const session = createSessionStateFromFlow(details.flow, createId, {
		pinned: true,
		warning: true,
		startMin: details.startMin,
		clockSpan: 60
	});
	return {
		shareType: 'selected-session-snapshot',
		...sharedUiStateFromState(state),
		blocks: session.blocks,
		dayTitle: session.dayTitle,
		extraInfo: session.extraInfo,
		startMin: session.startMin,
		endMode: 'end',
		clockSpan: 60,
		agendaText: serializeAgenda([{ date: details.day.date ?? null, flows: [{ ...details.flow }] }]),
		agendaDate: details.day.date ?? ''
	};
}

export function buildSelectedDaySnapshot(
	selectedDay: AgendaDay | null | undefined,
	selectedAgendaDetails: SelectedAgendaDetails | null,
	agendaDayStart: number,
	state: Pick<AppState, keyof SharedUiState | 'blocks'>,
	createId: () => string
): SelectedDayShareState | null {
	if (!selectedDay?.date) return null;
	const flows = selectedDay.flows.map(flow => ({ ...flow }));
	const first = selectedAgendaDetails?.flow ?? selectedDay.flows[0] ?? null;
	const firstStart = selectedAgendaDetails?.startMin ?? selectedDay.flows[0]?.startMin ?? agendaDayStart;
	const session = first ? createSessionStateFromFlow(first, createId, { pinned: true, warning: true, startMin: firstStart, clockSpan: 720 }) : null;
	return {
		shareType: 'selected-day-snapshot',
		...sharedUiStateFromState(state),
		blocks: session ? session.blocks : cloneBlocks(state.blocks),
		dayTitle: session?.dayTitle ?? first?.title ?? fmtAgendaDate(selectedDay.date),
		extraInfo: session?.extraInfo ?? first?.extraInfo ?? '',
		startMin: session?.startMin ?? firstStart,
		endMode: 'end',
		clockSpan: 720,
		agendaText: serializeAgenda([{ date: selectedDay.date, flows }]),
		agendaDate: selectedDay.date
	};
}

export function applySharedStatePayload(
	state: Pick<AppState,
		'blocks' | 'dayTitle' | 'extraInfo' | 'startMin' | 'endMode' | 'clockSpan' | 'palette' | 'dark' |
		'showLeft' | 'showCenterEnd' | 'hollow' | 'textOutside' | 'showMin' | 'showFive' | 'showQuarter' |
		'segMinutesMode' | 'showSegNotes' | 'showExtraInfo' | 'showSegLabels' | 'agendaText' | 'agendaDate'
	>,
	payload: Partial<LiveShareState | SelectedSessionShareState | SelectedDayShareState> & { shareType?: ShareMode }
): ShareMode {
	const shareMode = payload.shareType ?? 'active-session-live';
	if (payload.blocks) state.blocks = cloneBlocks(payload.blocks);
	if (payload.dayTitle !== undefined) state.dayTitle = payload.dayTitle;
	if (payload.extraInfo !== undefined) state.extraInfo = payload.extraInfo;
	if (payload.startMin !== undefined) state.startMin = payload.startMin;
	if (payload.endMode) state.endMode = payload.endMode;
	if (payload.clockSpan) state.clockSpan = payload.clockSpan;
	if (payload.palette) state.palette = payload.palette;
	if (payload.dark !== undefined) state.dark = payload.dark;
	if (payload.showLeft !== undefined) state.showLeft = payload.showLeft;
	if (payload.showCenterEnd !== undefined) state.showCenterEnd = payload.showCenterEnd;
	if (payload.hollow !== undefined) state.hollow = payload.hollow;
	if (payload.textOutside !== undefined) state.textOutside = payload.textOutside;
	if (payload.showMin !== undefined) state.showMin = payload.showMin;
	if (payload.showFive !== undefined) state.showFive = payload.showFive;
	if (payload.showQuarter !== undefined) state.showQuarter = payload.showQuarter;
	if (payload.segMinutesMode) state.segMinutesMode = payload.segMinutesMode;
	if (payload.showSegNotes !== undefined) state.showSegNotes = payload.showSegNotes;
	if (payload.showExtraInfo !== undefined) state.showExtraInfo = payload.showExtraInfo;
	if (payload.showSegLabels !== undefined) state.showSegLabels = payload.showSegLabels;
	if (payload.agendaText !== undefined) state.agendaText = payload.agendaText;
	if (payload.agendaDate !== undefined) state.agendaDate = payload.agendaDate;
	if (shareMode === 'selected-day-snapshot') state.clockSpan = 720;
	return shareMode;
}
