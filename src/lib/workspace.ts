import { normalizePersistedState } from './state-normalize.js';
import type { AgendaFlowMeta, AppState, ActualTimeEntry, Block, EditorDraft, Flow } from './state.svelte.js';

export interface WorkspacePreferences {
	palette: AppState['palette'];
	dark: boolean;
	clockSpan: AppState['clockSpan'];
	endMode: AppState['endMode'];
	agendaView: AppState['agendaView'];
	showSegNotes: boolean;
	showExtraInfo: boolean;
	showSegLabels: boolean;
	showLeft: boolean;
	showNextSession: boolean;
	showCenterEnd: boolean;
	hollow: boolean;
	textOutside: boolean;
	showMin: boolean;
	showFive: boolean;
	showQuarter: boolean;
	showFutureSegments: boolean;
	segMinutesMode: AppState['segMinutesMode'];
}

export interface WorkspaceData {
	flows: Flow[];
	agenda: {
		schoolText: string;
		schoolDate: string;
		privateText: string;
		privateDate: string;
		meta: Record<string, AgendaFlowMeta>;
	};
	drafts: {
		now: EditorDraft;
		plan: EditorDraft;
	};
	history: {
		actualTimeLog: ActualTimeEntry[];
	};
	preferences: WorkspacePreferences;
	revision: number;
}

export interface WorkspaceEnvelope {
	version: 1;
	workspace: WorkspaceData;
	updatedAt: string;
	revision: number;
}

export interface LegacySyncPayload {
	flows: Flow[];
	agendaText: string;
	agendaDate: string;
	agendaText2: string;
	agendaDate2: string;
	agendaMeta: Record<string, AgendaFlowMeta>;
	actualTimeLog: ActualTimeEntry[];
	nowDraft: EditorDraft;
	planDraft: EditorDraft;
	palette?: AppState['palette'];
	dark?: boolean;
	clockSpan?: AppState['clockSpan'];
	endMode?: AppState['endMode'];
	agendaView?: AppState['agendaView'];
	showSegNotes?: boolean;
	showExtraInfo?: boolean;
	showSegLabels?: boolean;
	showLeft?: boolean;
	showNextSession?: boolean;
	showCenterEnd?: boolean;
	hollow?: boolean;
	textOutside?: boolean;
	showMin?: boolean;
	showFive?: boolean;
	showQuarter?: boolean;
	showFutureSegments?: boolean;
	segMinutesMode?: AppState['segMinutesMode'];
}

type SyncableAppState = Pick<AppState,
	'flows' | 'agendaText' | 'agendaDate' | 'agendaText2' | 'agendaDate2' | 'agendaMeta' |
	'actualTimeLog' | 'nowDraft' | 'planDraft' | 'palette' | 'dark' | 'clockSpan' | 'endMode' |
	'agendaView' | 'showSegNotes' | 'showExtraInfo' | 'showSegLabels' | 'showLeft' |
	'showNextSession' | 'showCenterEnd' | 'hollow' | 'textOutside' | 'showMin' | 'showFive' | 'showQuarter' |
	'showFutureSegments' | 'segMinutesMode'
>;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneBlocks(blocks: Block[]): Block[] {
	return blocks.map((block) => ({ ...block }));
}

function cloneFlow(flow: Flow): Flow {
	return {
		...flow,
		parts: [...flow.parts],
		minutes: [...flow.minutes],
		warnings: [...flow.warnings],
		notes: [...flow.notes]
	};
}

function cloneDraft(draft: EditorDraft): EditorDraft {
	return {
		dayTitle: draft.dayTitle,
		blocks: cloneBlocks(draft.blocks),
		extraInfo: draft.extraInfo,
		startMin: draft.startMin
	};
}

function cloneActualTimeEntry(entry: ActualTimeEntry): ActualTimeEntry {
	return { ...entry };
}

function cloneAgendaMeta(meta: Record<string, AgendaFlowMeta>): Record<string, AgendaFlowMeta> {
	return Object.fromEntries(Object.entries(meta).map(([key, value]) => [key, { ...value }]));
}

function defaultDraft(createId: () => string): EditorDraft {
	return {
		dayTitle: '',
		blocks: [{ id: createId(), title: 'Lektion', minutes: 45, note: '', warning: true, pinned: false }],
		extraInfo: '',
		startMin: 8 * 60
	};
}

export const DEFAULT_WORKSPACE_PREFERENCES: WorkspacePreferences = {
	palette: 'sansad',
	dark: false,
	clockSpan: 60,
	endMode: 'end',
	agendaView: 'school',
	showSegNotes: true,
	showExtraInfo: true,
	showSegLabels: true,
	showLeft: true,
	showNextSession: false,
	showCenterEnd: true,
	hollow: true,
	textOutside: false,
	showMin: true,
	showFive: true,
	showQuarter: true,
	showFutureSegments: true,
	segMinutesMode: 'planned'
};

export function workspaceDataFromAppState(state: SyncableAppState, revision: number = 0): WorkspaceData {
	return {
		flows: (state.flows || []).map(cloneFlow),
		agenda: {
			schoolText: state.agendaText || '',
			schoolDate: state.agendaDate || '',
			privateText: state.agendaText2 || '',
			privateDate: state.agendaDate2 || '',
			meta: cloneAgendaMeta(state.agendaMeta || {})
		},
		drafts: {
			now: cloneDraft(state.nowDraft),
			plan: cloneDraft(state.planDraft)
		},
		history: {
			actualTimeLog: (state.actualTimeLog || []).map(cloneActualTimeEntry)
		},
		preferences: {
			palette: state.palette,
			dark: state.dark,
			clockSpan: state.clockSpan,
			endMode: state.endMode,
			agendaView: state.agendaView,
			showSegNotes: state.showSegNotes,
			showExtraInfo: state.showExtraInfo,
			showSegLabels: state.showSegLabels,
			showLeft: state.showLeft,
			showNextSession: state.showNextSession,
			showCenterEnd: state.showCenterEnd,
			hollow: state.hollow,
			textOutside: state.textOutside,
			showMin: state.showMin,
			showFive: state.showFive,
			showQuarter: state.showQuarter,
			showFutureSegments: state.showFutureSegments,
			segMinutesMode: state.segMinutesMode
		},
		revision
	};
}

export function applyWorkspaceDataToAppState(state: SyncableAppState, workspace: WorkspaceData): void {
	state.flows = workspace.flows.map(cloneFlow);
	state.agendaText = workspace.agenda.schoolText;
	state.agendaDate = workspace.agenda.schoolDate;
	state.agendaText2 = workspace.agenda.privateText;
	state.agendaDate2 = workspace.agenda.privateDate;
	state.agendaMeta = cloneAgendaMeta(workspace.agenda.meta);
	state.actualTimeLog = workspace.history.actualTimeLog.map(cloneActualTimeEntry);
	state.nowDraft = cloneDraft(workspace.drafts.now);
	state.planDraft = cloneDraft(workspace.drafts.plan);
	state.palette = workspace.preferences.palette;
	state.dark = workspace.preferences.dark;
	state.clockSpan = workspace.preferences.clockSpan;
	state.endMode = workspace.preferences.endMode;
	state.agendaView = workspace.preferences.agendaView;
	state.showSegNotes = workspace.preferences.showSegNotes;
	state.showExtraInfo = workspace.preferences.showExtraInfo;
	state.showSegLabels = workspace.preferences.showSegLabels;
	state.showLeft = workspace.preferences.showLeft;
	state.showNextSession = workspace.preferences.showNextSession;
	state.showCenterEnd = workspace.preferences.showCenterEnd;
	state.hollow = workspace.preferences.hollow;
	state.textOutside = workspace.preferences.textOutside;
	state.showMin = workspace.preferences.showMin;
	state.showFive = workspace.preferences.showFive;
	state.showQuarter = workspace.preferences.showQuarter;
	state.showFutureSegments = workspace.preferences.showFutureSegments;
	state.segMinutesMode = workspace.preferences.segMinutesMode;
}

function blockHasContent(block: Block): boolean {
	return block.title.trim() !== 'Lektion'
		|| block.minutes !== 45
		|| block.note.trim() !== ''
		|| block.warning !== true
		|| block.pinned !== false;
}

function draftHasContent(draft: EditorDraft): boolean {
	return draft.dayTitle.trim() !== ''
		|| draft.extraInfo.trim() !== ''
		|| draft.startMin !== 8 * 60
		|| draft.blocks.length !== 1
		|| draft.blocks.some(blockHasContent);
}

function preferencesAreDefault(preferences: WorkspacePreferences): boolean {
	return JSON.stringify(preferences) === JSON.stringify(DEFAULT_WORKSPACE_PREFERENCES);
}

export function isWorkspaceMeaningfullyEmpty(workspace: WorkspaceData): boolean {
	return workspace.flows.length === 0
		&& workspace.agenda.schoolText.trim() === ''
		&& workspace.agenda.privateText.trim() === ''
		&& Object.keys(workspace.agenda.meta).length === 0
		&& workspace.history.actualTimeLog.length === 0
		&& !draftHasContent(workspace.drafts.now)
		&& !draftHasContent(workspace.drafts.plan)
		&& preferencesAreDefault(workspace.preferences);
}

export function legacySyncPayloadFromWorkspaceData(workspace: WorkspaceData): LegacySyncPayload {
	return {
		flows: workspace.flows.map(cloneFlow),
		agendaText: workspace.agenda.schoolText,
		agendaDate: workspace.agenda.schoolDate,
		agendaText2: workspace.agenda.privateText,
		agendaDate2: workspace.agenda.privateDate,
		agendaMeta: cloneAgendaMeta(workspace.agenda.meta),
		actualTimeLog: workspace.history.actualTimeLog.map(cloneActualTimeEntry),
		nowDraft: cloneDraft(workspace.drafts.now),
		planDraft: cloneDraft(workspace.drafts.plan),
		...workspace.preferences
	};
}

export function workspaceEnvelopeFromData(workspace: WorkspaceData): WorkspaceEnvelope {
	return {
		version: 1,
		workspace,
		updatedAt: new Date().toISOString(),
		revision: workspace.revision
	};
}

export function workspaceDataFromSyncResponse(value: unknown, createId: () => string): WorkspaceData | null {
	if (!isPlainRecord(value)) return null;
	const raw = isPlainRecord(value.workspace) ? value.workspace : value;
	const revision = typeof value.revision === 'number' ? value.revision : typeof raw.revision === 'number' ? raw.revision : 0;
	const normalized = normalizePersistedState({
		flows: Array.isArray(raw.flows) ? raw.flows as Flow[] : [],
		agendaText: typeof raw.agendaText === 'string' ? raw.agendaText : typeof raw.schoolText === 'string' ? raw.schoolText : '',
		agendaDate: typeof raw.agendaDate === 'string' ? raw.agendaDate : typeof raw.schoolDate === 'string' ? raw.schoolDate : '',
		agendaText2: typeof raw.agendaText2 === 'string' ? raw.agendaText2 : typeof raw.privateText === 'string' ? raw.privateText : '',
		agendaDate2: typeof raw.agendaDate2 === 'string' ? raw.agendaDate2 : typeof raw.privateDate === 'string' ? raw.privateDate : '',
		agendaMeta: isPlainRecord(raw.agendaMeta) ? raw.agendaMeta as Record<string, AgendaFlowMeta> : isPlainRecord(raw.meta) ? raw.meta as Record<string, AgendaFlowMeta> : {},
		actualTimeLog: Array.isArray(raw.actualTimeLog) ? raw.actualTimeLog as ActualTimeEntry[] : [],
		nowDraft: isPlainRecord(raw.nowDraft) ? raw.nowDraft as unknown as EditorDraft : isPlainRecord(raw.drafts) && isPlainRecord(raw.drafts.now) ? raw.drafts.now as unknown as EditorDraft : defaultDraft(createId),
		planDraft: isPlainRecord(raw.planDraft) ? raw.planDraft as unknown as EditorDraft : isPlainRecord(raw.drafts) && isPlainRecord(raw.drafts.plan) ? raw.drafts.plan as unknown as EditorDraft : defaultDraft(createId)
	}, createId);
	const agenda = isPlainRecord(raw.agenda) ? raw.agenda : null;
	const history = isPlainRecord(raw.history) ? raw.history : null;
	const preferences = isPlainRecord(raw.preferences) ? raw.preferences : null;

	return workspaceDataFromAppState({
		flows: Array.isArray(normalized.flows) ? normalized.flows : [],
		agendaText: agenda && typeof agenda.schoolText === 'string' ? agenda.schoolText : typeof normalized.agendaText === 'string' ? normalized.agendaText : '',
		agendaDate: agenda && typeof agenda.schoolDate === 'string' ? agenda.schoolDate : typeof normalized.agendaDate === 'string' ? normalized.agendaDate : '',
		agendaText2: agenda && typeof agenda.privateText === 'string' ? agenda.privateText : typeof normalized.agendaText2 === 'string' ? normalized.agendaText2 : '',
		agendaDate2: agenda && typeof agenda.privateDate === 'string' ? agenda.privateDate : typeof normalized.agendaDate2 === 'string' ? normalized.agendaDate2 : '',
		agendaMeta: agenda && isPlainRecord(agenda.meta) ? agenda.meta as Record<string, AgendaFlowMeta> : normalized.agendaMeta && isPlainRecord(normalized.agendaMeta) ? normalized.agendaMeta as Record<string, AgendaFlowMeta> : {},
		actualTimeLog: history && Array.isArray(history.actualTimeLog) ? history.actualTimeLog as ActualTimeEntry[] : Array.isArray(normalized.actualTimeLog) ? normalized.actualTimeLog : [],
		nowDraft: normalized.nowDraft ?? defaultDraft(createId),
		planDraft: normalized.planDraft ?? defaultDraft(createId),
		palette: typeof preferences?.palette === 'string' ? preferences.palette as AppState['palette'] : typeof raw.palette === 'string' ? raw.palette as AppState['palette'] : DEFAULT_WORKSPACE_PREFERENCES.palette,
		dark: typeof preferences?.dark === 'boolean' ? preferences.dark : typeof raw.dark === 'boolean' ? raw.dark : DEFAULT_WORKSPACE_PREFERENCES.dark,
		clockSpan: preferences?.clockSpan === 60 || preferences?.clockSpan === 720
			? preferences.clockSpan
			: raw.clockSpan === 60 || raw.clockSpan === 720
				? raw.clockSpan
				: DEFAULT_WORKSPACE_PREFERENCES.clockSpan,
		endMode: preferences?.endMode === 'end' || preferences?.endMode === 'len'
			? preferences.endMode
			: raw.endMode === 'end' || raw.endMode === 'len'
				? raw.endMode
				: DEFAULT_WORKSPACE_PREFERENCES.endMode,
		agendaView: preferences?.agendaView === 'school' || preferences?.agendaView === 'private'
			? preferences.agendaView
			: raw.agendaView === 'school' || raw.agendaView === 'private'
				? raw.agendaView
				: DEFAULT_WORKSPACE_PREFERENCES.agendaView,
		showSegNotes: typeof preferences?.showSegNotes === 'boolean' ? preferences.showSegNotes : typeof raw.showSegNotes === 'boolean' ? raw.showSegNotes : DEFAULT_WORKSPACE_PREFERENCES.showSegNotes,
		showExtraInfo: typeof preferences?.showExtraInfo === 'boolean' ? preferences.showExtraInfo : typeof raw.showExtraInfo === 'boolean' ? raw.showExtraInfo : DEFAULT_WORKSPACE_PREFERENCES.showExtraInfo,
		showSegLabels: typeof preferences?.showSegLabels === 'boolean' ? preferences.showSegLabels : typeof raw.showSegLabels === 'boolean' ? raw.showSegLabels : DEFAULT_WORKSPACE_PREFERENCES.showSegLabels,
		showLeft: typeof preferences?.showLeft === 'boolean' ? preferences.showLeft : typeof raw.showLeft === 'boolean' ? raw.showLeft : DEFAULT_WORKSPACE_PREFERENCES.showLeft,
		showNextSession: typeof preferences?.showNextSession === 'boolean' ? preferences.showNextSession : typeof raw.showNextSession === 'boolean' ? raw.showNextSession : DEFAULT_WORKSPACE_PREFERENCES.showNextSession,
		showCenterEnd: typeof preferences?.showCenterEnd === 'boolean' ? preferences.showCenterEnd : typeof raw.showCenterEnd === 'boolean' ? raw.showCenterEnd : DEFAULT_WORKSPACE_PREFERENCES.showCenterEnd,
		hollow: typeof preferences?.hollow === 'boolean' ? preferences.hollow : typeof raw.hollow === 'boolean' ? raw.hollow : DEFAULT_WORKSPACE_PREFERENCES.hollow,
		textOutside: typeof preferences?.textOutside === 'boolean' ? preferences.textOutside : typeof raw.textOutside === 'boolean' ? raw.textOutside : DEFAULT_WORKSPACE_PREFERENCES.textOutside,
		showMin: typeof preferences?.showMin === 'boolean' ? preferences.showMin : typeof raw.showMin === 'boolean' ? raw.showMin : DEFAULT_WORKSPACE_PREFERENCES.showMin,
		showFive: typeof preferences?.showFive === 'boolean' ? preferences.showFive : typeof raw.showFive === 'boolean' ? raw.showFive : DEFAULT_WORKSPACE_PREFERENCES.showFive,
		showQuarter: typeof preferences?.showQuarter === 'boolean' ? preferences.showQuarter : typeof raw.showQuarter === 'boolean' ? raw.showQuarter : DEFAULT_WORKSPACE_PREFERENCES.showQuarter,
		showFutureSegments: typeof preferences?.showFutureSegments === 'boolean' ? preferences.showFutureSegments : typeof raw.showFutureSegments === 'boolean' ? raw.showFutureSegments : DEFAULT_WORKSPACE_PREFERENCES.showFutureSegments,
		segMinutesMode: preferences?.segMinutesMode === 'off' || preferences?.segMinutesMode === 'planned' || preferences?.segMinutesMode === 'remaining'
			? preferences.segMinutesMode
			: raw.segMinutesMode === 'off' || raw.segMinutesMode === 'planned' || raw.segMinutesMode === 'remaining'
				? raw.segMinutesMode
				: DEFAULT_WORKSPACE_PREFERENCES.segMinutesMode
	}, revision);
}
