import { type Palette } from './theme.js';

export type AppSection = 'now' | 'plan' | 'library' | 'workspace';
export type AgendaFlowSourceKind = 'manual' | 'template' | 'ai' | 'import';

export interface AgendaFlowMeta {
  source: AgendaFlowSourceKind;
  label?: string;
  detail?: string;
}

export interface Block {
  id: string;
  title: string;
  minutes: number;
  note: string;
  warning: boolean;
  pinned: boolean;
}

export interface Flow {
  id: string;
  title: string;
  parts: string[];
  minutes: number[];
  warnings: boolean[];
  notes: string[];
  extraInfo: string;
  startMin?: number;
  lastUsed?: number;
}

export interface ActualTimeEntry {
  id: string;
  date: string;
  agendaDate: string | null;
  title: string;
  subjectCategory: string;
  weekday: number;
  startMin: number;
  endMinActual: number;
  durationActualMin: number;
  dayTextSnapshot: string;
  confirmed: boolean;
  confirmedAt: number | null;
  autoFinalized: boolean;
}

export interface AppState {
  palette: Palette;
  dark: boolean;
  blocks: Block[];
  dayTitle: string;
  extraInfo: string;
  startMin: number;        // minutes since midnight
  endMode: 'end' | 'len';
  syncKey: string;
  clockSpan: 60 | 120 | 720;
  showLeft: boolean;
  showCenterEnd: boolean;
  hollow: boolean;
  textOutside: boolean;
  showMin: boolean;
  showFive: boolean;
  showQuarter: boolean;
  segMinutesMode: 'off' | 'planned' | 'remaining';
  showSegNotes: boolean;
  showExtraInfo: boolean;
  showSegLabels: boolean;
  sbCollapsed: boolean;
  agendaOpen: boolean;
  agendaText: string;
  agendaDate: string;
  agendaText2: string;
  agendaDate2: string;
  agendaView: 'school' | 'school+private' | 'private' | 'private+school';
  agendaMeta: Record<string, AgendaFlowMeta>;
  actualTimeLog: ActualTimeEntry[];
  showControls: boolean;
  showHelpHints: boolean;
  flows: Flow[];
  activeSection: AppSection;
}

export function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function defaultState(): AppState {
  return {
    palette: 'sansad',
    dark: false,
    blocks: [{ id: uid(), title: 'Lektion', minutes: 45, note: '', warning: true, pinned: false }],
    dayTitle: '',
    extraInfo: '',
    startMin: 8 * 60,
    endMode: 'end',
    syncKey: '',
    clockSpan: 60,
    showLeft: true,
    showCenterEnd: true,
    hollow: true,
    textOutside: false,
    showMin: true,
    showFive: true,
    showQuarter: true,
    segMinutesMode: 'planned',
    showSegNotes: true,
    showExtraInfo: true,
    showSegLabels: true,
    sbCollapsed: false,
    agendaOpen: false,
    agendaText: '',
    agendaDate: '',
    agendaText2: '',
    agendaDate2: '',
    agendaView: 'school',
    agendaMeta: {},
    actualTimeLog: [],
    showControls: true,
    showHelpHints: false,
    flows: [],
    activeSection: 'now',
  };
}

const STORAGE_KEY = 'day_timer_v1';

function loadPersisted(): Partial<AppState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    // Migrate from old the_timer format
    if (data.theme !== undefined && data.palette === undefined) {
      const m: Record<string, [Palette, boolean]> = {
        night: ['sansad', true], vivid: ['meadow', false],
        highcontrast: ['bright', false], psychedelic: ['psychedelic', false],
      };
      const [p, d] = m[data.theme] || ['sansad', false];
      data.palette = p; data.dark = d;
      delete data.theme;
    }
    // Migrate from old parts/minutes arrays to blocks
    if (data.parts && !data.blocks) {
      data.blocks = (data.parts as string[]).map((title: string, i: number) => ({
        id: uid(),
        title,
        minutes: (data.minutes as number[])?.[i] ?? 45,
        note: (data.notes as string[])?.[i] ?? '',
        warning: (data.warnings as boolean[])?.[i] ?? false,
        pinned: (data.pinnedMins as boolean[])?.[i] ?? false,
      }));
      delete data.parts; delete data.minutes; delete data.notes;
      delete data.warnings; delete data.pinnedMins;
    }
    if (data.title !== undefined && data.dayTitle === undefined) {
      data.dayTitle = data.title;
      delete data.title;
    }
    return data;
  } catch { return {}; }
}

function createAppState() {
  const def = defaultState();
  const persisted = typeof localStorage !== 'undefined' ? loadPersisted() : {};
  let s = $state<AppState>({ ...def, ...persisted });

  return {
    get value() { return s; },

    update(patch: Partial<AppState>) {
      Object.assign(s, patch);
      persist();
    },

    persist,

    reset() {
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      Object.assign(s, defaultState());
      const d = new Date();
      s.startMin = d.getHours() * 60;
    },
  };

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch { /* ignore */ }
  }
}

export const appState = createAppState();
