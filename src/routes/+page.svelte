<script lang="ts">
  import AgendaPanel from '$lib/components/AgendaPanel.svelte';
  
  import { onMount, untrack } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { appState, uid, type ActualTimeEntry, type AgendaFlowMeta, type AppSection, type Block, type EditorDraft, type Flow } from '$lib/state.svelte.js';
  import { clockTheme, labelColorFor } from '$lib/theme.js';
  import { CX, CY, R, Ri, polar, arcPath, nowMinutes, fmtHM, truncate } from '$lib/clock.js';
  import { localDateISO, parseIsoDate, monthKey, shiftMonth, fmtAgendaDate, monthLabel } from '$lib/date.js';
  import { parseParts, serializeBlocks, parseAgenda, serializeAgenda, stripDraftComments, totalFlowMinutes, mergeAgendaDayData, type AgendaDay } from '$lib/parse.js';
  import { runScheduleImport } from '$lib/schedule-import.js';
  import {
    AGENDA_DAY_WINDOW_END,
    agendaMetaHelp,
    agendaMetaLabel,
    agendaMetaSignature,
    buildAgendaItemsForDay,
    buildCalendarCells,
    buildSequentialTimeline,
    computeAgendaDensity,
    insertFlowIntoAgendaDate,
    makeAgendaFlowRef,
    makeAgendaMetaKeyForFlow,
    rebuildAgendaMetaForDay,
    resolveAgendaFlowRef,
    serializeSelectedAgendaDay,
    suggestedStartMinForDate,
    type AgendaFlowRef,
    type CalendarCell
  } from '$lib/agenda.js';
  import { buildAgendaLayout, yToMinute } from '$lib/agenda-layout.js';
  import { icsEventsToAgendaDays, parseIcsEvents, type IcsEvent } from '$lib/ics.js';
  import { getAiAgendaPrompt, getAiSessionPrompt, requestAiPlan, DEFAULT_AI_CONFIG, loadAiConfig, persistAiConfig, clearStoredAiConfig, type AiProvider, type AiPlanMode, type AiConfig } from '$lib/ai.js';
  import { flexibilityToModes, isValidPlanningModeForContext, type AiAgendaPromptMode, type AiFlexibilityLevel, type AiPlanResponse, type AiPlanningMode } from '$lib/ai-plan-engine.js';
  import { buildAgendaAiContext, buildAgendaAiDraftText, composeAiConversationInput } from '$lib/planner-ai.js';
  import { createVoiceService } from '$lib/voice.js';
  import { detectImportType } from '$lib/unified-import.js';
  import { createShareTokens, deriveSyncToken, validateSyncToken } from '$lib/security.js';
  import { clickOutside } from '$lib/actions.js';
  import { readSessionValue, writeSessionValue, removeSessionValue } from '$lib/storage.js';
  import { applyDayTextHeuristic, computeRecommendation, inferSubjectCategory } from '$lib/learning.js';
  import {
    makeActualEntryId,
    upsertActualEntry,
    finalizeUnconfirmedForDate
  } from '$lib/actuals.js';
  import { allocateBlockMinutes, completeActiveSegment, createCurrentFallbackSession, createSessionStateFromFlow, hasRunnableSessionContent, makeFlowFromSession, undoCompletedSegment, type SessionFromFlowOptions } from '$lib/session.js';
  import {
    addManualAgendaItem,
    deleteAgendaItemAt,
    renameAgendaItemAt,
    saveAgendaDraft
  } from '$lib/agenda-actions.js';
  import {
    prepareAgendaFlowLoad,
    syncSessionToAgenda,
    type SessionSource
  } from '$lib/session-agenda-binding.js';
  import {
    decideAutoLoadAgendaItem,
    decideNowAgendaTarget
  } from '$lib/run-mode-decisions.js';
  import {
    decideRunMenuClose,
    decideRunMenuOpen,
    type RunMenuSnapshot
  } from '$lib/run-menu-decisions.js';
  import {
    applySharedStatePayload,
    buildLiveShareState,
    buildSelectedDaySnapshot,
    buildSelectedSessionSnapshot,
    type ShareMode,
    sharedUiStateFromState
  } from '$lib/share-state.js';
  import {
    applyWorkspaceDataToAppState,
    isWorkspaceMeaningfullyEmpty,
    workspaceDataFromAppState,
    workspaceDataFromSyncResponse
  } from '$lib/workspace.js';
  import { normalizeSyncSaveSource, type SyncSaveSource } from '$lib/sync-source.js';
  import { shouldSkipWorkspaceAutosave } from '$lib/autosave.js';
  import { decideWorkspaceSyncLoad, type SyncLoadSource } from '$lib/sync-load-decision.js';
  import { nextBindingAfterSectionChange } from '$lib/active-session-binding.js';
  import { stripColorDirective } from '$lib/title-color.js';
  import SectionNav from '$lib/components/SectionNav.svelte';
  import SectionHero from '$lib/components/SectionHero.svelte';
  import SessionEditorPanel from '$lib/components/SessionEditorPanel.svelte';
  import LibraryPanel from '$lib/components/LibraryPanel.svelte';
  import WorkspacePanel from '$lib/components/WorkspacePanel.svelte';
  import AgendaImportPanel from '$lib/components/AgendaImportPanel.svelte';
  import Clock from '$lib/components/Clock.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import OptionsMenu from '$lib/components/OptionsMenu.svelte';
  import ThemePicker from '$lib/components/ThemePicker.svelte';
  import OnboardingTour from '$lib/components/OnboardingTour.svelte';
  import AdminPanel from '$lib/components/AdminPanel.svelte';

  const s = appState.value;
  let activeSection = $state<AppSection>(s.activeSection as AppSection);
  const NS = 'http://www.w3.org/2000/svg';

  let svgEl = $state<SVGSVGElement>(null!);
  let appEl = $state<HTMLElement>(null!);
  let sidebarEl = $state<HTMLElement>(null!);
  let flashEl = $state<HTMLElement>(null!);
  let loginName = $state('');
  let loginPass = $state('');
  let loggedInUser = $state('');
  type ShareEntry = { viewToken: string; ownerToken: string; mode: ShareMode };
  let shareEntries = $state<Record<string, ShareEntry>>({});
  let shareCopyText = $state('Kopiera länk');
  let shareCopyTargetKey = $state('');
  let pageOrigin = $state('');
  let isViewMode = $state(false);
  let viewToken = $state('');
  let viewShareMode = $state<ShareMode | null>(null);
  let agendaInputOpen = $state(false);
  let agendaCalendarOpen = $state(true);
  let savedAgendaMsg = $state('');
  let savedFlowMsg = $state('');
  let workspaceAutosaveTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingWorkspaceSaveHash: string | null = null;
  let agendaDragState = $state<{ i: number; dayIdx: number; startY: number; startMinA: number; blockStart: number; blockEnd: number; clampMin: number; clampMax: number; edge: 'top' | 'bottom'; containerH: number; windowMinutes: number } | null>(null);
  let agendaMoveState = $state<{ dayIdx: number; flowIdx: number; startY: number; currentY: number; targetIdx: number; previewStart: number | null; previewValid: boolean; swap: { withIdx: number; neighborNewStart: number } | null } | null>(null);
  let planSelectionExplicit = $state(false);
  let partsDraft = $state('');
  let partsDraftDirty = $state(false);
  let activeAgendaFlowRef = $state<AgendaFlowRef | null>(null);
  let sessionSource = $state<SessionSource>({ kind: 'unscheduled' });
  let agendaDragMoved = $state(false);
  let agendaEl = $state<HTMLElement>(null!);
  let timelineEl = $state<HTMLElement>(null!);
  let agendaDraft = $state('');
  let agendaDraftDate = $state<string | null>(null);
  let agendaDraftDirty = $state(false);
  let agendaDraftSource = $state<'manual' | 'ai'>('manual');
  let icsDraft = $state('');
  let icsImportOpen = $state(false);
  let icsPreviewEvents = $state<IcsEvent[]>([]);
  let icsPreviewSummary = $state('');
  let icsImportError = $state('');
  let scheduleLoading = $state(false);
  let locked = $state(false);
  let titleDraftValue = $state('');
  let agendaDayStart = $state(s.startMin);
  let planLastSavedAt = $state<number | null>(null);
  let lastSeenDate = $state(localDateISO());
  let activeRuntimeEntryId = $state<string | null>(null);
  let calendarMonthCursor = $state('');
  type PanelSaveStatus = 'idle' | 'saving' | 'saved';
  let nowPanelStatus = $state<PanelSaveStatus>('idle');
  let planPanelStatus = $state<PanelSaveStatus>('idle');
  type SessionSnapshot = {
    dayTitle: string;
    extraInfo: string;
    startMin: number;
    endMode: 'end' | 'len';
    blocks: typeof s.blocks;
  };
  let nowPanelBaseline = $state<SessionSnapshot | null>(null);
  let planPanelBaseline = $state<SessionSnapshot | null>(null);


  let nowMinLive = $state(nowMinutes());
  let doneSegments = $state<Record<string, number>>({});
  let lastAutoLoadKey = $state('');
  let mobileTab = $state<AppSection>('now');
  let showAgendaOverlay = $state(typeof window !== 'undefined' ? window.innerWidth > 980 : true);
  let nowText = $state('--:--');
  let leftText = $state('');
  let flowsOpen = $state(false);
  let miniMenuOpen = $state(true);
  let quickStartTitle = $state('');
  let quickStartText = $state('');
  let miniMenuSnapshot = $state<RunMenuSnapshot | null>(null);
  let themePickerOpen = $state(false);
  let optionsMenuOpen = $state(false);
  let helpOpen = $state(false);
  type HelpOverride = 'inherit' | 'show' | 'hide';
  let sessionTitleHelpOpen = $state<HelpOverride>('inherit');
  let sessionPartsHelpOpen = $state<HelpOverride>('inherit');
  let agendaImportHelpOpen = $state<HelpOverride>('inherit');
  let agendaIcsHelpOpen = $state<HelpOverride>('inherit');
  let agendaOverviewHelpOpen = $state<HelpOverride>('inherit');
  let copyBtnText = $state('AI-prompt');
  let nowTemplateSelection = $state('');
  let planTemplateSelection = $state('');
  let syncStatusText = $state('');
  let syncStatusError = $state(false);
  let syncProbeText = $state('');
  let syncProbeState = $state<'idle' | 'queued' | 'loading' | 'saving' | 'ok' | 'error' | 'conflict'>('idle');
  type WorkspaceSnapshotSummary = { id: string; revision: number; createdAt: string; reason: 'manual-save' | 'restore' };
  let workspaceSnapshots = $state<WorkspaceSnapshotSummary[]>([]);
  let workspaceSnapshotsLoading = $state(false);
  let endMode = $state<'end' | 'len'>(s.endMode ?? 'end');

  let aiConfig = $state<AiConfig>({ ...DEFAULT_AI_CONFIG });
  let aiKeyVisible = $state(false);
  let aiPanelOpen = $state(false);
  let aiInput = $state('');
  let aiLoading = $state(false);
  let aiError = $state('');
  let aiQuestionText = $state('');
  let agendaAiInput = $state('');
  let agendaAiLoading = $state(false);
  let agendaAiError = $state('');
  let agendaAiQuestionText = $state('');
  let agendaAiOpen = $state(false);
  let sessionAiPromptMode: AiAgendaPromptMode = $state('notes');
  let agendaAiPromptMode: AiAgendaPromptMode = $state('notes');
  let sessionAiLastResponse: AiPlanResponse | null = $state(null);
  let agendaAiLastResponse: AiPlanResponse | null = $state(null);
  let sessionAiFlexibilityLevel: AiFlexibilityLevel = $state(2);
  let agendaAiFlexibilityLevel: AiFlexibilityLevel = $state(2);
  let sessionAiConversationSeed = $state('');
  let agendaAiConversationSeed = $state('');
  const agendaVoice = createVoiceService();
  let agendaAiRecording = $state(false);

  let adminPassword = $state('');
  let inviteCodeResult = $state('');

  const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
    anthropic: 'Claude (Anthropic)',
    openai: 'GPT (OpenAI)',
    gemini: 'Gemini (Google)',
    custom: 'Anpassad (OpenAI-komp.)'
  };
  const AI_KEY_PLACEHOLDERS: Record<AiProvider, string> = {
    anthropic: 'sk-ant-...',
    openai: 'sk-...',
    gemini: 'AIza...',
    custom: 'API-nyckel'
  };

  const SECTION_LABELS: Record<AppSection, string> = {
    now: 'Nu',
    plan: 'Planera',
    library: 'Bibliotek',
    workspace: 'Konto & AI',
    admin: 'Admin'
  };

  const NAV_LABELS = $derived.by(() => {
    const labels: Partial<Record<AppSection, string>> = {
      plan: SECTION_LABELS.plan,
      library: SECTION_LABELS.library,
      workspace: SECTION_LABELS.workspace
    };
    if (loggedInUser.toLowerCase() === 'admin') labels.admin = SECTION_LABELS.admin;
    return labels;
  });

  function helpVisible(override: HelpOverride) {
    if (override === 'show') return true;
    if (override === 'hide') return false;
    return s.showHelpHints;
  }

  function toggleHelpOverride(current: HelpOverride): HelpOverride {
    if (current === 'inherit') return s.showHelpHints ? 'hide' : 'show';
    return 'inherit';
  }

  const SHARE_TOKEN_STORAGE = 'daytimer_share_token';
  const SHARE_OWNER_STORAGE = 'daytimer_share_owner_token';
  const SHARE_MODE_STORAGE = 'daytimer_share_mode';
  const SHARE_ENTRIES_STORAGE = 'daytimer_share_entries';
  const RUN_MODE_STORAGE = 'daytimer_run_mode';
  const WRITE_MENU_STORAGE = 'daytimer_write_menu_sections_v1';
  type WriteMenuSection = 'agenda' | 'planShare' | 'nowMain' | 'nowQuickStart' | 'nowShare' | 'sessionAi';
  const DEFAULT_WRITE_MENU_SECTIONS: Record<WriteMenuSection, boolean> = {
    agenda: true,
    planShare: true,
    nowMain: true,
    nowQuickStart: true,
    nowShare: true,
    sessionAi: false
  };
  let writeMenuSections = $state<Record<WriteMenuSection, boolean>>({ ...DEFAULT_WRITE_MENU_SECTIONS });

  const ACTIVE_SHARE_KEY = 'active';
  function sessionShareKey(flowId: string): string { return `session:${flowId}`; }
  function dayShareKey(date: string): string { return `day:${date}`; }
  function shareKeyFromModeAndPayload(mode: ShareMode, flowId?: string | null, date?: string | null): string | null {
    if (mode === 'active-session-live') return ACTIVE_SHARE_KEY;
    if (mode === 'selected-session-snapshot') return flowId ? sessionShareKey(flowId) : null;
    if (mode === 'selected-day-snapshot') return date ? dayShareKey(date) : null;
    return null;
  }

  function saveAiConfig() {
    persistAiConfig(aiConfig);
  }
  function clearAiConfig() {
    aiConfig = { ...DEFAULT_AI_CONFIG };
    clearStoredAiConfig();
  }

  // derived shorthand used in templates
  const aiApiKey = $derived(aiConfig.apiKey);
  const effectiveUserLevel = $derived(loggedInUser.toLowerCase() === 'admin' ? Math.max(s.userLevel, 2) : s.userLevel);

  const pad = (n: number) => String(Math.floor(n)).padStart(2, '0');
  const totalMin = () => s.blocks.reduce((a, b) => a + b.minutes, 0);

  const sectorColors = $derived(clockTheme(s.palette, s.dark).colors);

  function setAgendaMeta(key: string, meta: AgendaFlowMeta) {
    s.agendaMeta = { ...s.agendaMeta, [key]: meta };
  }

  function sessionAgendaMeta(): AgendaFlowMeta {
    if (sessionSource.kind === 'template') {
      return { source: 'template', label: sessionSource.title };
    }
    return { source: 'manual' };
  }

  function flowFromCurrentSession(): Flow {
    return makeFlowFromSession({
      id: uid(),
      title: s.dayTitle || 'Session',
      blocks: s.blocks,
      extraInfo: s.extraInfo,
      startMin: s.startMin
    }, uid);
  }

  function schoolPrimary() { return s.agendaView === 'school'; }
  function activeAgendaText(): string { return schoolPrimary() ? s.agendaText : s.agendaText2; }
  function activeAgendaDate(): string { return schoolPrimary() ? s.agendaDate : s.agendaDate2; }
  function setActiveAgendaText(v: string) { if (schoolPrimary()) s.agendaText = v; else s.agendaText2 = v; }
  function setActiveAgendaDate(v: string) { if (schoolPrimary()) s.agendaDate = v; else s.agendaDate2 = v; }
  function setAgendaView(view: 'school' | 'private') {
    s.agendaView = view;
    if (!activeAgendaDate()) setActiveAgendaDate(localDateISO());
    syncAgendaDraftFromState(true);
  }
  function hasOverlay() { return false; }

  function loadWriteMenuSections() {
    try {
      const raw = localStorage.getItem(WRITE_MENU_STORAGE);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Record<WriteMenuSection, boolean>>;
        writeMenuSections = { ...DEFAULT_WRITE_MENU_SECTIONS, ...parsed };
      }
    } catch {}
    agendaInputOpen = writeMenuSections.agenda || shouldOpenAgendaInputInPlan();
    aiPanelOpen = writeMenuSections.sessionAi;
  }

  function persistWriteMenuSections() {
    try {
      localStorage.setItem(WRITE_MENU_STORAGE, JSON.stringify(writeMenuSections));
    } catch {}
  }

  function setWriteMenuSection(section: WriteMenuSection, open: boolean) {
    writeMenuSections = { ...writeMenuSections, [section]: open };
    if (section === 'agenda') agendaInputOpen = open;
    if (section === 'sessionAi') aiPanelOpen = open;
    persistWriteMenuSections();
  }

  const agendaDays = $derived.by<AgendaDay[] | null>(() => {
    const stored = activeAgendaText();
    return stored.trim() ? parseAgenda(stored) : null;
  });

  const selectedDay = $derived.by<AgendaDay | null>(() => {
    const date = activeAgendaDate();
    if (!agendaDays?.length) {
      return date ? { date, flows: [] } : null;
    }
    if (date) {
      const hit = agendaDays.find(d => d.date === date);
      if (hit) return hit;
      return { date, flows: [] };
    }
    const today = localDateISO();
    return agendaDays.find(d => d.date === today)
      ?? agendaDays.find(d => d.date === null)
      ?? agendaDays[0];
  });

  const overlayDays = $derived.by<AgendaDay[] | null>(() => {
    if (!hasOverlay()) return null;
    const otherText = schoolPrimary() ? s.agendaText2 : s.agendaText;
    return otherText.trim() ? parseAgenda(otherText) : null;
  });

  const selectedDayIdx = $derived.by(() =>
    agendaDays && selectedDay ? agendaDays.findIndex(day => day.date === selectedDay.date) : -1
  );

  const selectedAgendaDetails = $derived.by(() => resolveAgendaFlowRef(agendaDays, activeAgendaFlowRef));

  const currentSessionShareKey = $derived(selectedAgendaDetails ? sessionShareKey(selectedAgendaDetails.flow.id) : null);
  const currentDayShareKey = $derived(selectedDay?.date ? dayShareKey(selectedDay.date) : null);
  const activeShareEntry = $derived(shareEntries[ACTIVE_SHARE_KEY] ?? null);
  const sessionShareEntry = $derived(currentSessionShareKey ? (shareEntries[currentSessionShareKey] ?? null) : null);
  const dayShareEntry = $derived(currentDayShareKey ? (shareEntries[currentDayShareKey] ?? null) : null);
  const activeShareUrl = $derived(activeShareEntry && pageOrigin ? `${pageOrigin}/?view=${activeShareEntry.viewToken}` : '');
  const sessionShareUrl = $derived(sessionShareEntry && pageOrigin ? `${pageOrigin}/?view=${sessionShareEntry.viewToken}` : '');
  const dayShareUrl = $derived(dayShareEntry && pageOrigin ? `${pageOrigin}/?view=${dayShareEntry.viewToken}` : '');
  const selectedAgendaMeta = $derived.by(() => {
    if (!selectedAgendaDetails) return null;
    return s.agendaMeta[makeAgendaMetaKeyForFlow(selectedAgendaDetails.day.date ?? null, selectedAgendaDetails.flow, selectedAgendaDetails.startMin)] ?? null;
  });
  const selectedAgendaSourceLabel = $derived.by(() => agendaMetaLabel(selectedAgendaMeta));
  const selectedAgendaSourceHelp = $derived.by(() => agendaMetaHelp(selectedAgendaMeta));
  const icsCanImport = $derived.by(() => icsPreviewEvents.some(event => !event.allDay));
  const icsPreviewLines = $derived.by(() =>
    icsPreviewEvents.slice(0, 6).map(event => {
      const timeLabel = event.allDay ? 'Heldag' : `${fmtHM(event.startMin)}–${fmtHM(event.endMin)}`;
      const locationLabel = event.location ? ` • ${event.location}` : '';
      return `${event.date} • ${timeLabel} • ${event.title}${locationLabel}`;
    })
  );

  const planSaveLabel = $derived.by(() => {
    if (!selectedAgendaDetails) return 'Inget block valt. Spara skapar ett nytt block på vald dag.';
    if (planLastSavedAt === null) return 'Inte sparat an i dagplanen.';
    const savedAt = new Date(planLastSavedAt).toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit'
    });
    return `Sparat i dagplanen ${savedAt}`;
  });
  const pendingActualEntries = $derived.by(() => {
    const today = localDateISO();
    return s.actualTimeLog
      .filter((entry) => entry.date === today && !entry.confirmed)
      .sort((a, b) => a.startMin - b.startMin);
  });
  const currentSubjectCategory = $derived.by(() => inferSubjectCategory(s.dayTitle || ''));
  const suggestedDuration = $derived.by(() => {
    const weekday = new Date().getDay();
    const rec = computeRecommendation(s.actualTimeLog, s.dayTitle || '', currentSubjectCategory, weekday);
    if (!rec) return null;
    const dayText = serializeSelectedAgendaDay(selectedDay?.date ?? null, agendaDays ?? null);
    return {
      ...rec,
      minutes: applyDayTextHeuristic(rec.minutes, dayText),
    };
  });
  const confirmedActualCount = $derived.by(() =>
    s.actualTimeLog.filter((entry) => entry.confirmed || entry.autoFinalized).length
  );
  const reliabilityPercent = $derived.by(() => Math.min(100, Math.round((confirmedActualCount / 40) * 100)));
  const reliabilityLevel = $derived.by(() => {
    if (confirmedActualCount >= 40) return 'Hög';
    if (confirmedActualCount >= 15) return 'Medel';
    return 'Låg';
  });
  const reliabilityHint = $derived.by(() => {
    if (confirmedActualCount >= 40) return 'Bra underlag för stabila rekommendationer.';
    if (confirmedActualCount >= 15) return 'Helt okej underlag, men fler bekräftade pass förbättrar träffsäkerheten.';
    return 'Få datapunkter än så länge. Bekräfta fler pass för bättre förslag.';
  });
  const agendaDraftStatus = $derived.by(() => {
    if (savedAgendaMsg) return savedAgendaMsg;
    if (agendaDraftSource === 'ai' && agendaDraftDirty) return 'AI-förslag – granska och spara';
    return agendaDraftDirty ? 'Ej sparat. Klicka Spara dagplan när du vill uppdatera.' : 'Synkat med vald dag';
  });

  const sectionCopy = $derived.by(() => {
    if (activeSection === 'now') return 'Kör det som händer nu utan planeringsbrus.';
    if (activeSection === 'plan') return '';
    if (activeSection === 'library') return 'Spara och återanvänd mallar utan att blanda ihop dem med dagens plan.';
    if (activeSection === 'admin') return 'Hantera inbjudningar och systemnivåer.';
    return 'Hantera konto, synk och AI-stöd.';
  });
  const sortedFlowOptions = $derived.by(() =>
    [...s.flows].sort((a, b) => {
      const lastUsedDiff = (b.lastUsed ?? 0) - (a.lastUsed ?? 0);
      return lastUsedDiff !== 0 ? lastUsedDiff : a.title.localeCompare(b.title, 'sv');
    })
  );

  const partsFieldValue = $derived(partsDraft);
  const partsFeedbackText = $derived(`${s.blocks.length}${s.blocks.length === 1 ? ' del' : ' delar'}`);
  const timeFeedbackText = $derived(`${totalMin()} min → slutar ${fmtHM(s.startMin + totalMin())}`);
  const activePanelStatus = $derived(activeSection === 'plan' ? planPanelStatus : nowPanelStatus);
  const activePanelStatusLabel = $derived.by(() => {
    const directEdit = activeSection === 'plan' && selectedAgendaDetails && planSelectionExplicit;
    if (activePanelStatus === 'saving') return directEdit ? 'Sparar ändring...' : 'Sparar utkast...';
    if (activePanelStatus === 'saved') {
      if (directEdit) return 'Ändring sparad direkt';
      return activeSection === 'plan' ? 'Utkast sparat lokalt — inte tillagt' : 'Sparat';
    }
    if (directEdit) {
      return 'Ändringar skrivs direkt till det valda blocket.';
    }
    return activeSection === 'plan' ? 'Inte tillagd i dagplanen än.' : 'Autospar på i den här sessionen.';
  });
  const canRevertPanel = $derived(
    (activeSection === 'plan' ? planPanelBaseline : nowPanelBaseline) !== null
  );
  const planActionHint = $derived.by(() =>
    activeSection === 'plan'
      ? selectedAgendaDetails && planSelectionExplicit
        ? 'Bekräftar redigeringen av det valda blocket.'
        : 'Lägger till passet på den dag som är vald i kalendern.'
      : 'Sätter starttiden till nu och lägger in sessionen i dagplanen.'
  );
  const targetDateLabel = $derived.by(() => {
    const explicit = selectedDay?.date ?? activeAgendaDate() ?? '';
    return explicit ? fmtAgendaDate(explicit) : 'Ingen dag vald';
  });
  const agendaDensityByDay = $derived.by(() => computeAgendaDensity(agendaDays));

  const calendarCells = $derived.by<CalendarCell[]>(() => buildCalendarCells({
    baseIso: selectedDay?.date ?? localDateISO(),
    monthCursor: calendarMonthCursor,
    density: agendaDensityByDay,
    selectedIso: selectedDay?.date ?? ''
  }));

  const agendaItems = $derived.by(() => {
    const flows = selectedDay?.flows ?? (agendaDays ? [] : s.flows);
    const fromText = agendaDays !== null;
    const timeline = selectedDay
      ? buildAgendaItemsForDay(selectedDay, agendaDayStart)
      : buildSequentialTimeline(flows, s.startMin);
    return timeline.map(({ flow, startMin, totalMin }) => ({ flow, startMin, totalMin, fromText }));
  });
  const agendaLayout = $derived(buildAgendaLayout(agendaItems.map((item, index) => ({
    id: item.flow.id ?? `${item.startMin}-${item.flow.title}-${index}`,
    title: item.flow.title || '(utan rubrik)',
    startMin: item.startMin,
    totalMin: item.totalMin
  }))));

  const nextVisibleSessionTitle = $derived.by(() => {
    if (!s.showNextSession || !agendaItems.length) return '';
    const nowMin = nowMinLive;
    const next = agendaItems.find(item => item.startMin > nowMin)
      ?? agendaItems.find(item => item.startMin + item.totalMin > nowMin && item.startMin > s.startMin)
      ?? null;
    return next ? stripColorDirective(next.flow.title || 'Nästa pass') : '';
  });

  const overlayItems = $derived.by(() => {
   if (!showAgendaOverlay) return [];
   if (!overlayDays) return [];

    const activeDate = activeAgendaDate();
    const today = localDateISO();
    const target = activeDate || today;
    const day = overlayDays.find(d => d.date === target)
      ?? overlayDays.find(d => d.date === today)
      ?? overlayDays.find(d => d.date === null)
      ?? overlayDays[0]
      ?? null;
    if (!day) return [];
    return buildSequentialTimeline(day.flows, s.startMin);
  });

  function describeFlow(flow: Flow): string {
    const partCount = flow.parts.length;
    return `${partCount} ${partCount === 1 ? 'del' : 'delar'} • ${totalFlowMinutes(flow)} min`;
  }

  function formatLastUsed(timestamp?: number): string {
    if (!timestamp) return 'Inte använd nyligen';
    const diffMin = Math.round((Date.now() - timestamp) / 60000);
    if (diffMin < 1) return 'Nyss använd';
    if (diffMin < 60) return `Använd för ${diffMin} min sedan`;
    const diffHours = Math.round(diffMin / 60);
    if (diffHours < 24) return `Använd för ${diffHours} h sedan`;
    const diffDays = Math.round(diffHours / 24);
    return `Använd för ${diffDays} d sedan`;
  }

  function prevDay() {
    if (!agendaDays || selectedDayIdx <= 0) return;
    selectAgendaDate(agendaDays[selectedDayIdx - 1].date ?? '');
  }
  function nextDay() {
    if (!agendaDays || selectedDayIdx >= agendaDays.length - 1) return;
    selectAgendaDate(agendaDays[selectedDayIdx + 1].date ?? '');
  }

  function setActiveSection(section: AppSection) {
    const oldSection = activeSection;
    if (oldSection === section) return;
    flushWorkspaceAutosave();
    const bindingChange = nextBindingAfterSectionChange({
      oldSection,
      nextSection: section,
      planSelectionExplicit,
      source: sessionSource
    });

    if (oldSection === 'now') {
      s.nowDraft = currentEditorDraft();
    } else if (oldSection === 'plan') {
      s.planDraft = currentEditorDraft();
    }

    s.activeSection = section;
    activeSection = section;

    if (section === 'now') {
      applyEditorDraft(s.nowDraft);
    } else if (section === 'plan') {
      if (bindingChange.activeAgendaFlowRef === null) {
        activeAgendaFlowRef = null;
      }
      sessionSource = bindingChange.source;
      planSelectionExplicit = bindingChange.planSelectionExplicit;
      if (bindingChange.resetPlanDraft) {
        s.planDraft = createEmptyPlanDraft();
      }
      preparePlanDraftForEntry();
      applyEditorDraft(s.planDraft);
      s.agendaOpen = true;
      agendaInputOpen = writeMenuSections.agenda || shouldOpenAgendaInputInPlan();
    }

    partsDraftDirty = false;
    syncPartsDraftFromState(true);

    s.showControls = true;
    miniMenuOpen = true;
    if (typeof window !== 'undefined' && window.innerWidth <= 800) {
      mobileTab = section;
      syncBodyClasses();
      scrollMobileViewportTop();
    }
    updateTimeFeedback();

    appState.persist();
  }

  function scrollMobileViewportTop() {
    if (typeof window === 'undefined' || window.innerWidth > 800) return;
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      appEl?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  }

  function closeTransientMenus() {
    optionsMenuOpen = false;
    themePickerOpen = false;
    agendaAiOpen = false;
    icsImportOpen = false;
    flowsOpen = false;
  }

  function collapseActiveWorkMenus() {
    closeTransientMenus();
    agendaInputOpen = false;
    agendaCalendarOpen = false;
  }

  function persistRunModePreference(active: boolean) {
    try {
      localStorage.setItem(RUN_MODE_STORAGE, active ? '1' : '0');
    } catch {}
  }

  function restoreRunModePreference() {
    let active = false;
    try {
      active = localStorage.getItem(RUN_MODE_STORAGE) === '1';
    } catch {}
    if (!active) return;
    closeTransientMenus();
    s.activeSection = 'now';
    activeSection = 'now';
    mobileTab = 'now';
    agendaInputOpen = false;
    agendaCalendarOpen = false;
    locked = true;
    miniMenuOpen = false;
    s.showControls = false;
  }

  function toggleMiniMenu() {
    if (isViewMode) return;
    flushWorkspaceAutosave();
    if (miniMenuOpen) {
      const sectionBeforeRun = s.activeSection as AppSection;
      const hasRunnableSession = partsDraftDirty ? hasRunnableSessionContent(s.blocks) : goToTimerNow();
      const decision = decideRunMenuClose({
        currentSection: sectionBeforeRun,
        locked,
        agendaOpen: s.agendaOpen,
        agendaInputOpen,
        agendaCalendarOpen,
        hasRunnableSession
      });
      miniMenuSnapshot = decision.snapshot;
      locked = decision.locked;
      miniMenuOpen = decision.miniMenuOpen;
      s.showControls = decision.showControls;
      if (decision.action === 'stay-open') mobileTab = decision.mobileTab;
      else collapseActiveWorkMenus();
      persistRunModePreference(decision.persistRunMode);
      appState.persist();
      return;
    }
    closeTransientMenus();
    const decision = decideRunMenuOpen({
      currentSection: s.activeSection as AppSection,
      sessionSourceKind: sessionSource.kind,
      snapshot: miniMenuSnapshot
    });
    if (decision.sectionToRestore) setActiveSection(decision.sectionToRestore);
    if (decision.snapshotToRestore) {
      locked = decision.snapshotToRestore.locked;
      s.agendaOpen = decision.snapshotToRestore.agendaOpen;
      agendaInputOpen = decision.snapshotToRestore.agendaInputOpen;
      agendaCalendarOpen = decision.snapshotToRestore.agendaCalendarOpen;
    }
    if (decision.clearSnapshot) {
      miniMenuSnapshot = null;
    }
    locked = decision.locked;
    miniMenuOpen = decision.miniMenuOpen;
    s.showControls = decision.showControls;
    persistRunModePreference(decision.persistRunMode);
    if (decision.keepInspectedAgendaBlock) {
      s.agendaOpen = decision.agendaOpen;
      agendaInputOpen = decision.agendaInputOpen;
      planSelectionExplicit = decision.planSelectionExplicit;
    }
    appState.persist();
  }

  function loadNowTemplate(id: string) {
    if (!id) return;
    loadFlow(id, 'now');
    nowTemplateSelection = '';
  }

  function loadPlanTemplate(id: string) {
    if (!id) return;
    loadFlow(id, 'plan');
    planTemplateSelection = '';
  }

  function cloneBlocks(blocks: typeof s.blocks) {
    return blocks.map(block => ({ ...block }));
  }

  function cloneDraft(draft: EditorDraft): EditorDraft {
    return {
      dayTitle: draft.dayTitle,
      blocks: cloneBlocks(draft.blocks),
      extraInfo: draft.extraInfo,
      startMin: draft.startMin
    };
  }

  function draftMatchesTemplate(draft: EditorDraft) {
    return s.flows.some(flow => draft.dayTitle === flow.title
      && draft.extraInfo === (flow.extraInfo || '')
      && draft.blocks.length === flow.parts.length
      && draft.blocks.every((block, index) => block.title === flow.parts[index]
        && block.minutes === (flow.minutes[index] ?? 45)
        && block.note === (flow.notes?.[index] ?? '')
        && block.warning === (flow.warnings?.[index] ?? false)
        && block.pinned === true));
  }

  function createEmptyPlanDraft(): EditorDraft {
    const targetDate = selectedDay?.date ?? activeAgendaDate() ?? localDateISO();
    return {
      dayTitle: '',
      blocks: [],
      extraInfo: '',
      startMin: suggestedStartMinForDate(agendaDays, targetDate, 45)
    };
  }

  function preparePlanDraftForEntry() {
    if (sessionSource.kind === 'template') return;
    if (planSelectionExplicit) return;
    if (!draftMatchesTemplate(s.planDraft)) return;
    s.planDraft = createEmptyPlanDraft();
  }

  function shouldOpenAgendaInputInPlan() {
    if (agendaDraftDirty) return true;
    const day = selectedDay;
    return !day || day.flows.length === 0;
  }

  function agendaPlanningModeForPromptMode(mode: AiAgendaPromptMode): AiPlanningMode {
    if (mode === 'notes' || mode === 'helpful-questions') return 'free-day';
    return 'anchored-day';
  }

  function agendaPlanModeForPromptMode(mode: AiAgendaPromptMode): AiPlanMode {
    return mode === 'strict-format' || mode === 'calendar' ? 'strict' : 'helpful';
  }

  function sessionPlanningModeForPromptMode(mode: AiAgendaPromptMode): AiPlanningMode {
    return mode === 'notes' || mode === 'helpful-questions' ? 'free-day' : 'fixed-session';
  }

  function isAiQuestionResponse(text: string) {
    const lines = text.trim().split('\n').map(line => line.trim()).filter(Boolean);
    return lines.length > 0 && lines.every(line => line.startsWith('?'));
  }

  function currentEditorDraft(): EditorDraft {
    return {
      dayTitle: s.dayTitle,
      blocks: cloneBlocks(s.blocks),
      extraInfo: s.extraInfo,
      startMin: s.startMin
    };
  }

  function currentWorkspaceData() {
    const activeDraft = currentEditorDraft();
    return workspaceDataFromAppState({
      ...s,
      nowDraft: s.activeSection === 'now' ? activeDraft : s.nowDraft,
      planDraft: s.activeSection === 'plan' ? activeDraft : s.planDraft
    }, s.currentRevision);
  }

  function hasSyncSession() {
    return validateSyncToken(s.syncKey || '');
  }

  function probeLabel(source: 'manual' | 'auto-panel' | 'auto-effect') {
    return source === 'manual' ? 'manuell' : 'auto';
  }

  function probeTime() {
    return new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function syncActiveDraftFromEditor() {
    if (s.activeSection === 'now') {
      s.nowDraft = currentEditorDraft();
    } else if (s.activeSection === 'plan') {
      s.planDraft = currentEditorDraft();
    }
  }

  function applyEditorDraft(draft: EditorDraft) {
    s.dayTitle = draft.dayTitle;
    s.blocks = cloneBlocks(draft.blocks);
    s.extraInfo = draft.extraInfo;
    s.startMin = draft.startMin;
    warnedSet.clear();
    updateTimeFeedback();
  }

  function restoreCurrentEditorFromDraft() {
    if (s.activeSection === 'now') {
      applyEditorDraft(s.nowDraft);
    } else if (s.activeSection === 'plan') {
      preparePlanDraftForEntry();
      applyEditorDraft(s.planDraft);
      s.agendaOpen = true;
      agendaInputOpen = writeMenuSections.agenda || shouldOpenAgendaInputInPlan();
    }
    partsDraftDirty = false;
    syncPartsDraftFromState(true);
  }

  function currentSnapshot(): SessionSnapshot {
    return {
      dayTitle: s.dayTitle,
      extraInfo: s.extraInfo,
      startMin: s.startMin,
      endMode,
      blocks: cloneBlocks(s.blocks)
    };
  }

  function capturePanelBaseline(target: 'now' | 'plan') {
    const snapshot = currentSnapshot();
    if (target === 'now') nowPanelBaseline = snapshot;
    else planPanelBaseline = snapshot;
  }

  function restoreSnapshot(snapshot: SessionSnapshot) {
    s.dayTitle = snapshot.dayTitle;
    s.extraInfo = snapshot.extraInfo;
    s.startMin = snapshot.startMin;
    s.blocks = cloneBlocks(snapshot.blocks);
    endMode = snapshot.endMode;
    s.endMode = snapshot.endMode;
    warnedSet.clear();
    
    updateTimeFeedback();
    syncTimerToAgenda();
    appState.persist();
  }

  function pulsePanelStatus(target: 'now' | 'plan') {
    if (target === 'now') nowPanelStatus = 'saving';
    else planPanelStatus = 'saving';
    queueMicrotask(() => {
      if (target === 'now') nowPanelStatus = 'saved';
      else planPanelStatus = 'saved';
    });
  }

  function notifyPanelMutation(target: 'now' | 'plan') {
    pulsePanelStatus(target);
    if (target === 'plan') markPlanSaved();
    queueWorkspaceAutosave();
  }

  function queueWorkspaceAutosave(delay = 1500) {
    if (isViewMode || loadingFromCloud || !hasSyncSession()) return;
    syncProbeState = 'queued';
    syncProbeText = 'Väntar...';
    if (workspaceAutosaveTimer) clearTimeout(workspaceAutosaveTimer);
    workspaceAutosaveTimer = setTimeout(() => {
      workspaceAutosaveTimer = null;
      void syncSave('auto-panel');
    }, delay);
  }

  function flushWorkspaceAutosave() {
    if (!workspaceAutosaveTimer) return;
    clearTimeout(workspaceAutosaveTimer);
    workspaceAutosaveTimer = null;
    void syncSave('auto-panel');
  }

  function revertActivePanel() {
    const baseline = s.activeSection === 'plan' ? planPanelBaseline : nowPanelBaseline;
    if (!baseline) return;
    partsDraftDirty = false;
    restoreSnapshot(baseline);
    notifyPanelMutation(s.activeSection === 'plan' ? 'plan' : 'now');
  }

  function markPlanSaved() {
    if (!activeAgendaFlowRef) return;
    planLastSavedAt = Date.now();
  }

  function selectAgendaDate(date: string) {
    setActiveAgendaDate(date);
    calendarMonthCursor = monthKey(parseIsoDate(date));
    activeAgendaFlowRef = null;
    planSelectionExplicit = false;
    sessionSource = { kind: 'unscheduled' };
    agendaDraftDirty = false;
    partsDraftDirty = false;
    appState.persist();
  }

  function fmtLeft(left: number): string {
    if (left <= 0) return 'klart';
    const h = Math.floor(left / 60);
    const m = Math.ceil(left % 60);
    if (h === 0) return m === 1 ? '1 minut kvar' : `${m} minuter kvar`;
    if (m === 0) return h === 1 ? '1 timme kvar' : `${h} timmar kvar`;
    return `${h}h ${m}m kvar`;
  }

  function fmtTillStart(min: number): string {
    const h = Math.floor(min / 60);
    const m = Math.ceil(min % 60);
    if (h === 0) return `${m} min till start`;
    if (m === 0) return `${h}h till start`;
    return `${h}h ${m}m till start`;
  }
  function trackActualForActiveAgendaItem() {
    const date = localDateISO();
    const nowMin = nowMinutes();
    const active = agendaItems.find((item) => nowMin >= item.startMin && nowMin < item.startMin + item.totalMin);
    if (!active) {
      activeRuntimeEntryId = null;
      return;
    }
    const id = makeActualEntryId(date, active.startMin, active.flow.title || 'Session');
    activeRuntimeEntryId = id;
    const existing = s.actualTimeLog.find((entry) => entry.id === id);
    const duration = Math.max(1, nowMin - active.startMin);
    const base: ActualTimeEntry = existing ?? {
      id,
      date,
      agendaDate: selectedDay?.date ?? null,
      title: active.flow.title || 'Session',
      subjectCategory: inferSubjectCategory(active.flow.title || ''),
      weekday: new Date().getDay(),
      startMin: active.startMin,
      endMinActual: nowMin,
      durationActualMin: duration,
      dayTextSnapshot: serializeSelectedAgendaDay(selectedDay?.date ?? null, agendaDays ?? null),
      confirmed: false,
      confirmedAt: null,
      autoFinalized: false
    };
    const updated = {
      ...base,
      endMinActual: Math.max(base.endMinActual, nowMin),
      durationActualMin: Math.max(base.durationActualMin, duration),
      dayTextSnapshot: base.dayTextSnapshot || serializeSelectedAgendaDay(selectedDay?.date ?? null, agendaDays ?? null),
    };
    const wasNew = !existing;
    const wasChanged = updated.endMinActual !== base.endMinActual || updated.durationActualMin !== base.durationActualMin;
    s.actualTimeLog = upsertActualEntry(s.actualTimeLog, updated);
    if (wasNew || (wasChanged && nowMin % 5 === 0)) appState.persist();
  }
  function finalizeUnconfirmedForDateLocal(date: string) {
    const { log, changed } = finalizeUnconfirmedForDate(s.actualTimeLog, date);
    if (changed) {
      s.actualTimeLog = log;
      appState.persist();
    }
  }
  function sessionSourceText(): string {
    if (sessionSource.kind === 'agenda') {
      return `Från dagplan: ${sessionSource.title || 'Session'} ${fmtHM(sessionSource.startMin)}`;
    }
    if (sessionSource.kind === 'template') {
      return `Från mall: ${sessionSource.title || 'Utan rubrik'}`;
    }
    return 'Fristående session';
  }
  const elapsedMin = () => nowMinutes() - s.startMin;
  const startAngle = () => ((s.startMin % s.clockSpan) / s.clockSpan) * 360;
  let warningsOpen = $state(false);
  let soundMuted = $state(false);
  let widgetMode = $state(false);
  let workspaceTimeDataOpen = $state(false);

  function syncBodyClasses() {
    const PALETTE_CLASSES = ['sansad','meadow','mlp','bright','clear','psychedelic'];
    document.body.classList.remove(...PALETTE_CLASSES, 'dark', 'sb-collapsed', 'ag-open', 'm-now', 'm-plan', 'm-library', 'm-workspace', 'page-locked', 'run-mode', 'widget-mode');
    if (s.palette) document.body.classList.add(s.palette);
    if (s.dark && s.palette !== 'psychedelic') document.body.classList.add('dark');
    if (s.sbCollapsed) document.body.classList.add('sb-collapsed');
    if (s.agendaOpen) document.body.classList.add('ag-open');
    document.body.classList.add('m-' + mobileTab);
    if (locked) document.body.classList.add('page-locked');
    if (locked && !miniMenuOpen) document.body.classList.add('run-mode');
    if (widgetMode) document.body.classList.add('widget-mode');
  }

  // ── Drag ──
  type DragState =
    | { type: 'between'; i: number; leftMin: number; rightMin: number; boundaryMin0: number }
    | { type: 'end'; totalMin0: number }
    | { type: 'start'; startMin0: number; endMin0: number; pointerAng0: number };
  let drag: DragState | null = null;

  function pointerAngle(e: PointerEvent): number {
    if (!svgEl) return 0;
    const rect = svgEl.getBoundingClientRect();
    const scale = rect.width / 360;
    const x = e.clientX - rect.left - CX * scale;
    const y = e.clientY - rect.top - CY * scale;
    let ang = Math.atan2(y, x) * 180 / Math.PI + 90;
    if (ang < 0) ang += 360;
    return ang;
  }

  function startBoundaryDrag(pe: PointerEvent, i: number) {
    if (isViewMode || locked) return;
    pe.preventDefault();
    const boundaryMin0 = s.blocks.slice(0, i + 1).reduce((sum, b) => sum + b.minutes, 0);
    drag = { type: 'between', i, leftMin: s.blocks[i].minutes, rightMin: s.blocks[i+1].minutes, boundaryMin0 };
    window.addEventListener('pointermove', onDrag);
    window.addEventListener('pointerup', endDrag);
  }
  function startEndDrag(pe: PointerEvent) {
    if (isViewMode || locked) return;
    pe.preventDefault();
    drag = { type: 'end', totalMin0: totalMin() };
    window.addEventListener('pointermove', onDrag);
    window.addEventListener('pointerup', endDrag);
  }
  function startStartDrag(pe: PointerEvent) {
    if (isViewMode || locked) return;
    pe.preventDefault();
    drag = { type: 'start', startMin0: s.startMin, endMin0: s.startMin + totalMin(), pointerAng0: pointerAngle(pe) };
    window.addEventListener('pointermove', onDrag);
    window.addEventListener('pointerup', endDrag);
  }

  function scaleMinutesTo(newTotal: number) {
    const newMins = allocateBlockMinutes(s.blocks, newTotal);
    s.blocks.forEach((b, i) => { b.minutes = newMins[i]; });
  }

  function toggleSegmentDone(blockId: string) {
    if (doneSegments[blockId] !== undefined) {
      const saved = doneSegments[blockId];
      const idx = s.blocks.findIndex(b => b.id === blockId);
      if (idx !== -1) {
        const restoredMinutes = undoCompletedSegment(s.blocks.map(b => b.minutes), idx, saved);
        s.blocks.forEach((b, i) => { b.minutes = restoredMinutes[i]; });
      }
      const next = { ...doneSegments };
      delete next[blockId];
      doneSegments = next;
      warnedSet.clear();
      syncTimerToAgenda(true);
      appState.persist();
      return;
    }
    const elapsed = elapsedMin();
    let cum = 0;
    for (let i = 0; i < s.blocks.length; i++) {
      if (s.blocks[i].id === blockId) {
        const isActive = elapsed >= cum && elapsed < cum + s.blocks[i].minutes;
        if (!isActive) return;
        const completion = completeActiveSegment(s.blocks.map(b => b.minutes), i, elapsed - cum);
        s.blocks.forEach((b, j) => { b.minutes = completion.minutes[j]; });
        doneSegments = { ...doneSegments, [blockId]: completion.savedMinutes };
        warnedSet.clear();
        syncTimerToAgenda(true);
        appState.persist();
        return;
      }
      cum += s.blocks[i].minutes;
    }
  }

  function onDrag(e: PointerEvent) {
    if (!drag || locked) return;
    const ang = pointerAngle(e);
    const sa = startAngle();
    let rel = ang - sa;
    while (rel < 0) rel += 360;

    function unwrappedMinuteNear(anchorMin: number) {
      const base = (rel / 360) * s.clockSpan;
      let best = base;
      let bestDist = Math.abs(base - anchorMin);
      const anchorCycle = Math.round(anchorMin / s.clockSpan);
      for (let cycle = Math.max(0, anchorCycle - 2); cycle <= anchorCycle + 2; cycle++) {
        const candidate = base + cycle * s.clockSpan;
        const dist = Math.abs(candidate - anchorMin);
        if (dist < bestDist) {
          best = candidate;
          bestDist = dist;
        }
      }
      return best;
    }

    if (drag.type === 'end') {
      let newTotal = unwrappedMinuteNear(drag.totalMin0);
      const minTotal = s.blocks.length * 2;
      if (newTotal < minTotal) newTotal = minTotal;
      if (newTotal > s.clockSpan * 3) newTotal = s.clockSpan * 3;
      scaleMinutesTo(Math.round(newTotal));
       return;
    }
    if (drag.type === 'start') {
      let delta = ang - drag.pointerAng0;
      while (delta > 180) delta -= 360;
      while (delta < -180) delta += 360;
      const minDelta = (delta / 360) * s.clockSpan;
      let newStart = Math.round(drag.startMin0 + minDelta);
      let newTotal = drag.endMin0 - newStart;
      const minTotal = s.blocks.length * 2;
      if (newTotal < minTotal) { newTotal = minTotal; newStart = drag.endMin0 - newTotal; }
      if (newTotal > s.clockSpan * 3) { newTotal = s.clockSpan * 3; newStart = drag.endMin0 - newTotal; }
      s.startMin = newStart;
      scaleMinutesTo(newTotal);
       return;
      }

    const targetCumMin = unwrappedMinuteNear(drag.boundaryMin0);
    let cumBefore = 0;
    for (let k = 0; k < drag.i; k++) cumBefore += s.blocks[k].minutes;
    let newLeft = targetCumMin - cumBefore;
    const pair = drag.leftMin + drag.rightMin;
    newLeft = Math.max(2, Math.min(pair - 2, newLeft));
    s.blocks[drag.i].minutes = Math.round(newLeft);
    s.blocks[drag.i + 1].minutes = pair - Math.round(newLeft);
    
  }

  function syncTimerToAgenda(forceUpdate = false) {
    const result = syncSessionToAgenda({
      days: agendaDays,
      activeRef: activeAgendaFlowRef,
      activeSection: s.activeSection as AppSection,
      source: sessionSource,
      forceUpdate,
      planSelectionExplicit,
      session: {
        title: s.dayTitle,
        blocks: s.blocks,
        extraInfo: s.extraInfo,
        startMin: s.startMin
      },
      agendaMeta: s.agendaMeta,
      createId: uid
    });
    if (!result) return;
    setActiveAgendaText(serializeAgenda(result.days));
    activeAgendaFlowRef = result.activeRef;
    s.agendaMeta = result.agendaMeta;
    markPlanSaved();
  }

  function endDrag() {
    drag = null;
    window.removeEventListener('pointermove', onDrag);
    window.removeEventListener('pointerup', endDrag);
    syncTimerToAgenda(true);
    partsDraftDirty = false;
    appState.persist();
  }

  function updateTimeFeedback() {}

  // ── Audio & flash ──
  let audioCtx: AudioContext | null = null;
  const warnedSet = new Set<string>();

  function beep(offset = 0) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const t0 = audioCtx.currentTime + offset;
      const dur = 1.4;
      const freqs = [1568, 3136];
      const gains = [0.18, 0.06];
      freqs.forEach((f, i) => {
        const o = audioCtx!.createOscillator();
        const g = audioCtx!.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(gains[i], t0 + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g); g.connect(audioCtx!.destination);
        o.start(t0); o.stop(t0 + dur + 0.05);
      });
    } catch { /* ignore */ }
  }

  function doFlash() {
    if (!flashEl) return;
    flashEl.classList.add('on');
    setTimeout(() => flashEl.classList.remove('on'), 400);
  }

  function checkWarnings() {
    if (soundMuted) return;
    const elapsed = elapsedMin();
    let cum = 0;
    s.blocks.forEach((b, i) => {
      const segEnd = cum + b.minutes;
      if (b.warning) {
        const warnAt = segEnd - 3;
        const keyWarn = `w-${i}-${s.startMin}-${segEnd}`;
        const keyEnd = `e-${i}-${s.startMin}-${segEnd}`;
        if (elapsed >= warnAt && elapsed < warnAt + 1/60 && !warnedSet.has(keyWarn)) {
          warnedSet.add(keyWarn); beep(); doFlash();
        }
        if (elapsed >= segEnd && elapsed < segEnd + 1/60 && !warnedSet.has(keyEnd)) {
          warnedSet.add(keyEnd); beep(); beep(0.45); doFlash();
        }
      }
      cum = segEnd;
    });
  }

  function tick() {
    const now = new Date();
    const todayIso = localDateISO(now);
    if (todayIso !== lastSeenDate) {
      finalizeUnconfirmedForDateLocal(lastSeenDate);
      lastSeenDate = todayIso;
    }
    nowMinLive = nowMinutes();
    nowText = pad(now.getHours()) + ':' + pad(now.getMinutes());
    const tot = totalMin();
    const nowMin = nowMinutes();
    if (nowMin < s.startMin) {
      leftText = fmtTillStart(s.startMin - nowMin);
    } else {
      leftText = fmtLeft((s.startMin + tot) - nowMin);
    }
    checkAutoLoad();
    trackActualForActiveAgendaItem();
    checkWarnings();
  }

  function handlePartsInput(input: string, applyTitle = false) {
    partsDraft = input;
    partsDraftDirty = true;
    const result = parseParts(input, s.blocks);
    s.blocks = result.blocks;
    if (applyTitle && result.dayTitle) s.dayTitle = result.dayTitle;
    s.extraInfo = result.extraInfo;
    updateTimeFeedback();
    
    syncTimerToAgenda();
    appState.persist();
    notifyPanelMutation(s.activeSection === 'plan' ? 'plan' : 'now');
  }

  function replaceTextareaSelection(node: HTMLTextAreaElement, value: string, caret: number) {
    handlePartsInput(value);
    requestAnimationFrame(() => {
      node.focus();
      node.setSelectionRange(caret, caret);
    });
  }

  function handlePartsKeyDown(e: KeyboardEvent) {
    const node = e.currentTarget as HTMLTextAreaElement | null;
    if (!node) return;

    if (e.key === 'Tab') {
      e.preventDefault();
      const start = node.selectionStart ?? 0;
      const end = node.selectionEnd ?? start;
      const value = node.value;
      const insert = '\n- ';
      const next = value.slice(0, start) + insert + value.slice(end);
      replaceTextareaSelection(node, next, start + insert.length);
      return;
    }
  }

  function startQuickNowSession() {
    const raw = quickStartText.trim();
    if (!raw) {
      showToast('Skriv minst en aktivitet först');
      return;
    }
    const result = parseParts(raw, []);
    if (!result.blocks.length) {
      showToast('Skriv minst en aktivitet först');
      return;
    }
    const d = new Date();
    s.dayTitle = quickStartTitle.trim() || result.dayTitle || 'Session';
    s.blocks = result.blocks;
    s.extraInfo = result.extraInfo;
    s.startMin = d.getHours() * 60 + d.getMinutes();
    warnedSet.clear();
    updateTimeFeedback();
    const f = flowFromCurrentSession();
    addFlowToAgendaToday(f, true, sessionAgendaMeta());
    lastAutoLoadKey = `${f.startMin}-${totalFlowMinutes(f)}-${f.title}-${f.parts.length}`;
    quickStartTitle = '';
    quickStartText = '';
    capturePanelBaseline('now');
    partsDraftDirty = false;
    syncPartsDraftFromState(true);
    notifyPanelMutation('now');
    appState.persist();
    if (hasSyncSession()) void syncSave();
    collapseActiveWorkMenus();
    locked = true;
    miniMenuOpen = false;
    s.showControls = false;
    persistRunModePreference(true);
    appState.persist();
  }

  function saveFlow() {
    const title = s.dayTitle.trim() || 'Utan rubrik';
    if (!s.flows) s.flows = [];
    const existing = s.flows.find(f => f.title === title);
    const data = makeFlowFromSession({
      id: existing?.id,
      title,
      blocks: s.blocks,
      extraInfo: s.extraInfo || '',
    }, () => 'f-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7));
    if (existing) { Object.assign(existing, data); }
    else { s.flows.push(data); }
    flowsOpen = true;
    appState.persist();
    savedFlowMsg = 'Sparat ✓';
    setTimeout(() => { savedFlowMsg = ''; }, 2000);
    if (hasSyncSession()) syncSave();
  }

  function addFlowToAgendaDate(date: string, f: Flow, activate = false, meta: AgendaFlowMeta | null = null, startMinOverride?: number) {
    const startMin = startMinOverride ?? s.startMin;
    const flowToAdd: Flow = { ...f, id: uid(), startMin };
    const inserted = insertFlowIntoAgendaDate(agendaDays, date, flowToAdd, startMin);
    const days = inserted.days;
    const insertedFlow = inserted.flow;
    setActiveAgendaText(serializeAgenda(days));
    setActiveAgendaDate(date);
    if (meta) setAgendaMeta(makeAgendaMetaKeyForFlow(date, insertedFlow, insertedFlow.startMin ?? startMin), meta);
    if (activate) {
      activeAgendaFlowRef = makeAgendaFlowRef(date, insertedFlow, insertedFlow.startMin ?? startMin);
      sessionSource = { kind: 'agenda', date, title: insertedFlow.title, startMin: insertedFlow.startMin ?? startMin };
    }
    appState.persist();
    return inserted;
  }

  function addFlowToAgendaToday(f: Flow, activate = false, meta: AgendaFlowMeta | null = null) {
    addFlowToAgendaDate(localDateISO(), f, activate, meta);
  }

  function loadFlow(id: string, targetSection: AppSection = 'now') {
    const f = s.flows.find(x => x.id === id);
    if (!f) return;
    f.lastUsed = Date.now();
    if (s.activeSection !== targetSection) {
      setActiveSection(targetSection);
    }
    applySessionStateFromFlow(f, { pinned: true });
    if (targetSection === 'plan') {
      const targetDate = selectedDay?.date ?? activeAgendaDate() ?? localDateISO();
      s.startMin = suggestedStartMinForDate(agendaDays, targetDate, totalFlowMinutes(f));
    }
    updateTimeFeedback(); 
    activeAgendaFlowRef = null;
    planSelectionExplicit = false;
    sessionSource = { kind: 'template', templateId: f.id, title: f.title };
    syncActiveDraftFromEditor();
    capturePanelBaseline(targetSection === 'plan' ? 'plan' : 'now');
    syncPartsDraftFromState(true);
    appState.persist();
  }

  function addTemplateToSelectedAgendaDate(id: string) {
    const f = s.flows.find(x => x.id === id);
    if (!f) return;
    const targetDate = selectedDay?.date ?? activeAgendaDate() ?? localDateISO();
    addFlowToAgendaDate(targetDate, f, false, { source: 'template', label: f.title }, suggestedStartMinForDate(agendaDays, targetDate, totalFlowMinutes(f)));
    savedFlowMsg = 'Tillagd i dagplan ✓';
    setTimeout(() => { savedFlowMsg = ''; }, 2000);
    if (hasSyncSession()) syncSave();
  }

  function deleteFlow(id: string) {
    if (!confirm(`Radera flödet?`)) return;
    s.flows = s.flows.filter(f => f.id !== id);
    appState.persist();
  }

  const SYNC_TOKEN_STORAGE = 'timer-sync-token';
  let syncStatusTimer: ReturnType<typeof setTimeout>;

  function persistShareEntries() {
    try {
      localStorage.setItem(SHARE_ENTRIES_STORAGE, JSON.stringify(shareEntries));
    } catch (err) {
      console.warn('[day_timer] failed to persist share entries', err);
    }
  }

  function loadPersistedShareEntries(): Record<string, ShareEntry> {
    const raw = localStorage.getItem(SHARE_ENTRIES_STORAGE);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed as Record<string, ShareEntry>;
      console.warn('[day_timer] share entries had unexpected shape, ignoring');
    } catch (err) {
      console.warn('[day_timer] failed to parse share entries, ignoring', err);
    }
    return {};
  }

  function clearLegacyShareState() {
    removeSessionValue(SHARE_TOKEN_STORAGE);
    removeSessionValue(SHARE_OWNER_STORAGE);
    removeSessionValue(SHARE_MODE_STORAGE);
    localStorage.removeItem(SHARE_TOKEN_STORAGE);
    localStorage.removeItem(SHARE_OWNER_STORAGE);
    localStorage.removeItem(SHARE_MODE_STORAGE);
  }

  function showSyncStatus(msg: string, isError = false) {
    syncStatusText = msg; syncStatusError = isError;
    clearTimeout(syncStatusTimer);
    syncStatusTimer = setTimeout(() => { syncStatusText = ''; }, 3000);
  }

  function applySessionStateFromFlow(flow: Flow, options: SessionFromFlowOptions = {}) {
    const session = createSessionStateFromFlow(flow, uid, options);
    s.dayTitle = session.dayTitle;
    s.blocks = session.blocks;
    s.extraInfo = session.extraInfo;
    s.startMin = session.startMin;
    if (options.clockSpan !== undefined) s.clockSpan = options.clockSpan;
    warnedSet.clear();
    return session;
  }

  function hasUnsavedAgendaDraft() {
    return s.activeSection === 'plan' && agendaDraftDirty;
  }

  async function syncLoad(source: SyncLoadSource = 'manual') {
    if (source === 'auto' && hasUnsavedAgendaDraft()) {
      syncProbeState = 'idle';
      syncProbeText = 'Dagtext osparad – molnladdning pausad';
      return;
    }
    const token = s.syncKey || '';
    if (!validateSyncToken(token)) { showSyncStatus('Inte inloggad', true); loadingFromCloud = false; return; }
    loadingFromCloud = true;
    syncProbeState = 'loading';
    syncProbeText = 'Laddar...';
    try {
      const res = await fetch('/api/sync', {
        headers: { 'x-sync-token': token }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const cloudWorkspace = workspaceDataFromSyncResponse(data, uid);
      const localWorkspace = currentWorkspaceData();
      if (!cloudWorkspace) throw new Error();
      const preservedRunAgendaView = locked && !miniMenuOpen ? s.agendaView : null;
      
      const localWorkspaceHash = JSON.stringify(localWorkspace);
      const cloudWorkspaceHash = JSON.stringify(cloudWorkspace);
      const syncLoadDecision = decideWorkspaceSyncLoad({
        source,
        localRevision: localWorkspace.revision,
        cloudRevision: cloudWorkspace.revision,
        localHash: localWorkspaceHash,
        cloudHash: cloudWorkspaceHash,
        localEmpty: isWorkspaceMeaningfullyEmpty(localWorkspace),
        cloudEmpty: isWorkspaceMeaningfullyEmpty(cloudWorkspace)
      });

      if (syncLoadDecision === 'upload-local') {
        const uploadedToEmptyCloud = isWorkspaceMeaningfullyEmpty(cloudWorkspace);
        appState.persist();
        await syncSave('auto-effect');
        if (uploadedToEmptyCloud) showSyncStatus('Molnet var tomt. Lokal data laddades upp ✓');
        return;
      }
      
      const cloudFlows: Flow[] = cloudWorkspace.flows || [];
      const cloudIds = new Set(cloudFlows.map((f: Flow) => f.id));
      const localOnly = localWorkspace.flows.filter((flow) => !cloudIds.has(flow.id));
      
      applyWorkspaceDataToAppState(s, { ...cloudWorkspace, flows: [...cloudFlows, ...localOnly] });
      if (preservedRunAgendaView) setAgendaView(preservedRunAgendaView);
      s.currentRevision = cloudWorkspace.revision;
      
      let restoredDraft = false;
      if (cloudWorkspace.drafts.now) {
        restoredDraft = restoredDraft || s.activeSection === 'now';
      }
      if (cloudWorkspace.drafts.plan) {
        restoredDraft = restoredDraft || s.activeSection === 'plan';
      }
      if (restoredDraft) {
        restoreCurrentEditorFromDraft();
      }
      if (typeof data.userLevel === 'number') {
        s.userLevel = data.userLevel;
      }
      activeAgendaFlowRef = null;
      sessionSource = { kind: 'unscheduled' };
      capturePanelBaseline('now');
      capturePanelBaseline('plan');
      lastSyncedHash = JSON.stringify(currentWorkspaceData());
      appState.persist();
      showSyncStatus('Laddat från moln ✓');
      syncProbeState = 'ok';
      syncProbeText = `Synkad ${probeTime()} (rev ${s.currentRevision})`;
      void loadWorkspaceSnapshots();
    } catch { 
      showSyncStatus('Kunde inte ladda', true); 
      syncProbeState = 'error';
      syncProbeText = 'Laddningsfel';
    }
    finally { loadingFromCloud = false; }
  }

  async function syncSave(source: SyncSaveSource | Event = 'manual') {
    const saveSource = normalizeSyncSaveSource(source);
    const token = s.syncKey || '';
    if (!validateSyncToken(token)) { showSyncStatus('Inte inloggad', true); return; }
    if (workspaceAutosaveTimer) {
      clearTimeout(workspaceAutosaveTimer);
      workspaceAutosaveTimer = null;
    }
    syncActiveDraftFromEditor();
    const workspace = currentWorkspaceData();
    const workspaceHash = JSON.stringify(workspace);
    if (shouldSkipWorkspaceAutosave(saveSource, workspaceHash, lastSyncedHash, pendingWorkspaceSaveHash)) {
      syncProbeState = 'ok';
      syncProbeText = `Synkad ${probeTime()} (oförändrat)`;
      return;
    }
    const payloadStr = JSON.stringify({
      workspace,
      ...(saveSource === 'manual' ? { snapshotReason: 'manual-save' } : {})
    });
    try {
      syncProbeState = 'saving';
      syncProbeText = saveSource === 'manual' ? 'Sparar...' : 'Autosparar...';
      pendingWorkspaceSaveHash = workspaceHash;
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sync-token': token
        },
        body: payloadStr,
      });
      
      if (res.status === 409) {
        const data = await res.json();
        syncProbeState = 'conflict';
        syncProbeText = 'Konflikt (nyare version finns)';
        showSyncStatus('Kunde inte spara: nyare version finns i molnet', true);
        return;
      }
      
      if (!res.ok) throw new Error();
      const data = await res.json();
      s.currentRevision = data.revision;
      lastSyncedHash = JSON.stringify({ ...workspace, revision: data.revision });
      syncProbeState = 'ok';
      syncProbeText = `Synkad ${probeTime()} (rev ${s.currentRevision})`;
      showSyncStatus(saveSource === 'manual' ? 'Sparat till moln ✓' : 'Autosparat ✓');
      if (saveSource === 'manual') void loadWorkspaceSnapshots();
    } catch {
      syncProbeState = 'error';
      syncProbeText = 'Kunde inte spara';
      showSyncStatus('Kunde inte spara', true);
    } finally {
      if (pendingWorkspaceSaveHash === workspaceHash) pendingWorkspaceSaveHash = null;
    }
  }

  async function loadWorkspaceSnapshots() {
    const token = s.syncKey || '';
    if (!validateSyncToken(token)) return;
    workspaceSnapshotsLoading = true;
    try {
      const res = await fetch('/api/sync/snapshots', {
        headers: { 'x-sync-token': token }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      workspaceSnapshots = Array.isArray(data.snapshots) ? data.snapshots : [];
    } catch {
      showSyncStatus('Kunde inte ladda tidigare versioner', true);
    } finally {
      workspaceSnapshotsLoading = false;
    }
  }

  async function restoreWorkspaceSnapshot(snapshotId: string) {
    const token = s.syncKey || '';
    if (!validateSyncToken(token)) { showSyncStatus('Inte inloggad', true); return; }
    try {
      syncProbeState = 'loading';
      syncProbeText = 'Återställer...';
      const res = await fetch('/api/sync/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sync-token': token
        },
        body: JSON.stringify({ snapshotId })
      });
      if (!res.ok) throw new Error();
      showSyncStatus('Tidigare version återställd ✓');
      await syncLoad();
      await loadWorkspaceSnapshots();
    } catch {
      syncProbeState = 'error';
      syncProbeText = 'Kunde inte återställa';
      showSyncStatus('Kunde inte återställa tidigare version', true);
    }
  }

  async function upgradeLevel(code: string) {
    const token = s.syncKey || '';
    if (!token) { showSyncStatus('Logga in för att låsa upp', true); return; }
    try {
      const res = await fetch('/api/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sync-token': token
        },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Ogiltig kod');
      }
      const data = await res.json();
      s.userLevel = data.level;
      appState.persist();
      showToast('Nivå 2 upplåst! ✨');
    } catch (e: any) {
      showToast(e.message);
    }
  }

  async function generateInvite(code: string, multi: boolean) {
    if (!loggedInUser || !s.syncKey) { showSyncStatus('Inte inloggad', true); return; }
    try {
      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword // Using same as syncKey for simple local test or custom input
        },
        body: JSON.stringify({ code, multi }),
      });
      if (!res.ok) throw new Error('Kunde inte skapa inbjudan');
      inviteCodeResult = code.toUpperCase();
      showToast('Inbjudan skapad ✓');
    } catch (e: any) {
      showToast(e.message);
    }
  }

  async function login() {
    const name = loginName.trim();
    const pass = loginPass.trim();
    if (!name || !pass) { showSyncStatus('Ange namn och lösenord', true); return; }
    s.syncKey = await deriveSyncToken(name, pass);
    loggedInUser = name;
    if (name.toLowerCase() === 'admin') {
      adminPassword = pass;
      localStorage.setItem('admin-password', pass);
    }
    writeSessionValue(SYNC_TOKEN_STORAGE, s.syncKey);
    localStorage.setItem('timer-login-user', name);
    appState.persist();
    await syncLoad();
  }

  function logout() {
    loggedInUser = '';
    s.syncKey = '';
    workspaceSnapshots = [];
    removeSessionValue(SYNC_TOKEN_STORAGE);
    localStorage.removeItem(SYNC_TOKEN_STORAGE);
    localStorage.removeItem('timer-login-user');
    appState.persist();
  }

  let lastPushedHash = '';
  let lastSyncedHash = $state<string | null>(null);
  let loadingFromCloud = $state(true);

  async function pushShareState() {
    const entry = shareEntries[ACTIVE_SHARE_KEY];
    if (!entry || entry.mode !== 'active-session-live') return;
    const state = buildLiveShareState(s);
    const hash = JSON.stringify(state);
    if (hash === lastPushedHash) return;
    try {
      const res = await fetch(`/api/share?token=${encodeURIComponent(entry.viewToken)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-share-owner': entry.ownerToken
        },
        body: hash,
      });
      if (!res.ok) return;
      lastPushedHash = hash;
    } catch { /* silent */ }
  }

  async function loadSharedState(token: string) {
    try {
      const res = await fetch(`/api/share?token=${encodeURIComponent(token)}`);
      if (!res.ok) return;
      const d = await res.json();
      viewShareMode = applySharedStatePayload(s, d);
      syncBodyClasses();
    } catch { /* silent */ }
  }

  async function startSharing(mode: ShareMode) {
    const uiState = sharedUiStateFromState(s);
    const payload = mode === 'active-session-live'
      ? buildLiveShareState(s)
      : mode === 'selected-session-snapshot'
        ? (selectedAgendaDetails ? buildSelectedSessionSnapshot(selectedAgendaDetails, uiState, uid) : null)
        : buildSelectedDaySnapshot(selectedDay, selectedAgendaDetails, agendaDayStart, { ...uiState, blocks: s.blocks }, uid);
    if (!payload) return;
    const key = shareKeyFromModeAndPayload(
      mode,
      selectedAgendaDetails?.flow.id ?? null,
      selectedDay?.date ?? null
    );
    if (!key) return;
    const existing = shareEntries[key];
    const tokens = existing
      ? { viewToken: existing.viewToken, ownerToken: existing.ownerToken }
      : createShareTokens();
    try {
      const hash = JSON.stringify(payload);
      const res = await fetch(`/api/share?token=${encodeURIComponent(tokens.viewToken)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-share-owner': tokens.ownerToken
        },
        body: hash,
      });
      if (!res.ok) throw new Error();
      shareEntries = { ...shareEntries, [key]: { viewToken: tokens.viewToken, ownerToken: tokens.ownerToken, mode } };
      if (mode === 'active-session-live') lastPushedHash = hash;
      persistShareEntries();
    } catch {
      showSyncStatus('Kunde inte starta delning', true);
    }
  }

  async function stopSharingByKey(key: string) {
    const entry = shareEntries[key];
    if (!entry) return;
    try {
      await fetch(`/api/share?token=${encodeURIComponent(entry.viewToken)}`, {
        method: 'DELETE',
        headers: { 'x-share-owner': entry.ownerToken }
      });
    } catch { /* silent */ }
    const next = { ...shareEntries };
    delete next[key];
    shareEntries = next;
    if (key === ACTIVE_SHARE_KEY) lastPushedHash = '';
    persistShareEntries();
  }

  async function copyShareLinkForKey(key: string) {
    const entry = shareEntries[key];
    if (!entry) return;
    const link = `${pageOrigin}/?view=${entry.viewToken}`;
    await navigator.clipboard.writeText(link);
    shareCopyTargetKey = key;
    shareCopyText = '✓ Kopierad!';
    setTimeout(() => {
      shareCopyText = 'Kopiera länk';
      shareCopyTargetKey = '';
    }, 2000);
  }

  function saveAgenda() {
    const targetDate = selectedDay?.date ?? activeAgendaDate() ?? localDateISO();
    const savingAiDraft = agendaDraftSource === 'ai';

    const cleanedDraft = stripDraftComments(agendaDraft);
    const parsedDraft = cleanedDraft.trim() ? parseAgenda(cleanedDraft) : [];
    const datedDays = parsedDraft.filter(d => d.date !== null);
    if (savingAiDraft && datedDays.length > 1) {
      const merged = mergeAgendaDayData(activeAgendaText(), parsedDraft);
      const savedText = serializeAgenda(merged);
      setActiveAgendaText(savedText);
      agendaDraft = savedText;
      agendaDraftDate = targetDate;
      agendaDraftDirty = false;
      agendaDraftSource = 'manual';
      activeAgendaFlowRef = null;
      sessionSource = { kind: 'unscheduled' };
      appState.persist();
      if (hasSyncSession()) syncSave();
      savedAgendaMsg = 'Schema importerat ✓';
      setTimeout(() => { savedAgendaMsg = ''; }, 2000);
      return;
    }

    const result = saveAgendaDraft({
      activeText: activeAgendaText(),
      draftText: agendaDraft,
      targetDate,
      source: agendaDraftSource,
      agendaMeta: s.agendaMeta,
      agendaDayStart
    });
    setActiveAgendaText(result.savedText);
    agendaDraft = result.draftText;
    agendaDraftDate = targetDate;
    agendaDraftDirty = result.draftDirty;
    agendaDraftSource = result.draftSource;
    s.agendaMeta = result.agendaMeta;
    activeAgendaFlowRef = null;
    sessionSource = { kind: 'unscheduled' };
    appState.persist();

    if (hasSyncSession()) syncSave();

    savedAgendaMsg = savingAiDraft ? 'AI-förslag godkänt ✓' : 'Sparat ✓';
    setTimeout(() => { savedAgendaMsg = ''; }, 2000);
  }

  function persistAgendaMutation() {
    appState.persist();
    if (hasSyncSession()) void syncSave('auto-panel');
  }

  function previewIcsImport() {
    const parsed = parseIcsEvents(icsDraft);
    icsPreviewEvents = parsed;
    const timed = parsed.filter(event => !event.allDay).length;
    const allDay = parsed.filter(event => event.allDay).length;
    icsImportError = '';
    if (parsed.length === 0) {
      icsPreviewSummary = '';
      icsImportError = 'Ingen kalenderhändelse kunde läsas. Kontrollera att du klistrat in en riktig .ics-fil.';
      return;
    }
    icsPreviewSummary = `${parsed.length} händelser hittades: ${timed} tidsatta och ${allDay} heldag.`;
  }

  function resetIcsPreview() {
    icsPreviewEvents = [];
    icsPreviewSummary = '';
    icsImportError = '';
  }

  function importPreviewedIcs() {
    const importDays = icsEventsToAgendaDays(icsPreviewEvents);
    if (importDays.length === 0) {
      icsImportError = 'Det finns inga tidsatta kalenderhändelser att importera än.';
      return;
    }

    const merged = mergeAgendaDayData(activeAgendaText(), importDays);
    setActiveAgendaText(serializeAgenda(merged));

    for (const day of importDays) {
      const previousDay = (agendaDays ?? []).find(existingDay => existingDay.date === day.date) ?? null;
      const mergedDay = merged.find(mergedEntry => mergedEntry.date === day.date) ?? null;
      const overridesBySignature = new Map<string, AgendaFlowMeta>();
      for (const flow of day.flows) {
        const startMin = flow.startMin ?? s.startMin;
        overridesBySignature.set(
          agendaMetaSignature(flow, startMin),
          {
            source: 'import',
            label: 'ICS-kalender',
            detail: flow.extraInfo ? `Plats: ${flow.extraInfo}.` : undefined
          }
        );
      }
      s.agendaMeta = rebuildAgendaMetaForDay(s.agendaMeta, day.date ?? null, previousDay, mergedDay, agendaDayStart, { overridesBySignature });
    }

    if (importDays[0]?.date) setActiveAgendaDate(importDays[0].date);
    icsImportError = '';
    savedAgendaMsg = 'ICS importerad ✓';
    setTimeout(() => { savedAgendaMsg = ''; }, 2000);
    appState.persist();
    if (hasSyncSession()) syncSave();
  }

  async function readIcsFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    icsDraft = await file.text();
    previewIcsImport();
  }

  // Merge pasted agenda text with existing: new date-sections replace matching dates, others are kept
  function mergeAgendaDays(existing: string, incoming: string): string {
    const newDays = parseAgenda(incoming);
    if (newDays.length === 0) return incoming;
    const hasDates = newDays.some(d => d.date !== null);
    if (!existing.trim()) return incoming;
    // If pasted text has no dates, tag it with today so it doesn't wipe existing dated entries
    if (!hasDates) {
      const t = localDateISO();
      const [y, m, d] = t.split('-');
      return mergeAgendaDays(existing, `@${y.slice(2)}${m}${d}\n${incoming}`);
    }
    const baseDays = parseAgenda(existing);
    const merged = [...baseDays];
    for (const day of newDays) {
      const idx = merged.findIndex(d => d.date === day.date);
      if (idx >= 0) {
        merged[idx] = day;
      } else {
        const insertAt = merged.findIndex(d => d.date !== null && day.date !== null && d.date > day.date);
        if (insertAt < 0) merged.push(day);
        else merged.splice(insertAt, 0, day);
      }
    }
    return serializeAgenda(merged);
  }

  function deleteAgendaItem(flowIdx: number) {
    if (!agendaDays || selectedDayIdx < 0) return;
    const days = deleteAgendaItemAt(agendaDays, selectedDayIdx, flowIdx);
    setActiveAgendaText(serializeAgenda(days));
    if (selectedAgendaDetails?.dayIdx === selectedDayIdx && selectedAgendaDetails.flowIdx === flowIdx) {
      activeAgendaFlowRef = null;
      planSelectionExplicit = false;
      sessionSource = { kind: 'unscheduled' };
      if (s.activeSection === 'plan') {
        s.planDraft = createEmptyPlanDraft();
        applyEditorDraft(s.planDraft);
        partsDraftDirty = false;
        syncPartsDraftFromState(true);
        capturePanelBaseline('plan');
      }
    }
    persistAgendaMutation();
  }

  function renameAgendaItem(flowIdx: number, title: string) {
    if (!agendaDays || selectedDayIdx < 0) return;
    const nextTitle = title.trim() || 'Utan rubrik';
    const result = renameAgendaItemAt({
      days: agendaDays,
      dayIdx: selectedDayIdx,
      flowIdx,
      title: nextTitle,
      agendaDayStart,
      agendaMeta: s.agendaMeta
    });
    const days = result.days;
    setActiveAgendaText(serializeAgenda(days));
    const updatedDay = days[selectedDayIdx];
    const updatedItem = result.updatedItem;
    if (selectedAgendaDetails?.dayIdx === selectedDayIdx && selectedAgendaDetails.flowIdx === flowIdx && updatedItem) {
      s.dayTitle = nextTitle;
      activeAgendaFlowRef = makeAgendaFlowRef(updatedDay.date ?? null, updatedItem.flow, updatedItem.startMin);
      sessionSource = { kind: 'agenda', date: updatedDay.date ?? null, title: nextTitle, startMin: updatedItem.startMin };
      capturePanelBaseline(s.activeSection === 'plan' ? 'plan' : 'now');
      syncPartsDraftFromState(true);
    }
    s.agendaMeta = result.agendaMeta;
    markPlanSaved();
    appState.persist();
    if (hasSyncSession()) void syncSave();
  }

  function addAgendaItemToSelectedDay(placement?: { startMin: number; duration: number }) {
    if (isViewMode) return;
    const targetDate = selectedDay?.date ?? activeAgendaDate() ?? localDateISO();
    const duration = placement?.duration ?? 45;
    const startMin = placement?.startMin ?? suggestedStartMinForDate(agendaDays, targetDate, duration);
    const inserted = addManualAgendaItem({
      days: agendaDays,
      targetDate,
      id: uid(),
      startMin,
      duration
    });
    const insertedFlow = inserted.flow;
    setActiveAgendaText(serializeAgenda(inserted.days));
    setActiveAgendaDate(targetDate);
    setAgendaMeta(makeAgendaMetaKeyForFlow(targetDate, insertedFlow, insertedFlow.startMin ?? startMin), { source: 'manual' });
    appState.persist();
    planSelectionExplicit = true;
    loadAgendaFlow(insertedFlow, insertedFlow.startMin ?? startMin, 'plan', true);
    markPlanSaved();
    if (hasSyncSession()) void syncSave();
    return { id: insertedFlow.id, startMin: insertedFlow.startMin ?? startMin };
  }

  function commitBlockEdit() {
    updateTimeFeedback();
    
    syncTimerToAgenda();
    partsDraftDirty = false;
    appState.persist();
    notifyPanelMutation(s.activeSection === 'plan' ? 'plan' : 'now');
  }

  function addBlock() {
    if (isViewMode) return;
    const newId = uid();
    s.blocks = [...s.blocks, { id: newId, title: '', minutes: 10, note: '', warning: true, pinned: false }];
    commitBlockEdit();
  }

  function addBlockAfter(id: string) {
    if (isViewMode) return;
    const idx = s.blocks.findIndex(x => x.id === id);
    if (idx < 0) return;
    const newId = uid();
    const newBlock: Block = { id: newId, title: '', minutes: 10, note: '', warning: true, pinned: false };
    const next = [...s.blocks];
    next.splice(idx + 1, 0, newBlock);
    s.blocks = next;
    commitBlockEdit();
  }

  function deleteBlock(id: string) {
    s.blocks = s.blocks.filter(x => x.id !== id);
    if (s.blocks.length === 0) {
      s.blocks = [{ id: uid(), title: '', minutes: 10, note: '', warning: true, pinned: false }];
    }
    commitBlockEdit();
  }

  function enforceAiMinimumMinutes(text: string, minimum = 5): string {
    return text.replace(/(^|\n)([^\n]*?\S)\s+(\d+)\s*m(?:in)?(?=\s*(?:\n|$))/gi, (_match, lineStart: string, title: string, minutesText: string) => {
      const minutes = parseInt(minutesText, 10);
      if (!Number.isFinite(minutes) || minutes >= minimum) return `${lineStart}${title} ${minutesText}m`;
      return `${lineStart}${title} ${minimum}m`;
    });
  }

  async function runAiParts() {
    const input = composeAiConversationInput({
      input: aiInput,
      fallback: partsDraft,
      seed: sessionAiConversationSeed,
      questions: aiQuestionText,
      allowFallback: partsDraftDirty
    });
    if (!input) return;
    aiLoading = true; aiError = ''; aiQuestionText = '';
    try {
      if (!sessionAiConversationSeed) sessionAiConversationSeed = aiInput.trim() || partsDraft.trim();
      const { planMode, agendaPromptMode } = flexibilityToModes(sessionAiFlexibilityLevel);
      sessionAiPromptMode = agendaPromptMode;
      const preferredMode = sessionPlanningModeForPromptMode(agendaPromptMode);
      const planningMode = isValidPlanningModeForContext('plan', preferredMode)
        ? preferredMode
        : 'fixed-session';
      const requestConfig = { ...aiConfig, planMode };
      const text = await requestAiPlan(requestConfig, input, 'parts', {
        startMin: s.startMin,
        totalMin: totalMin(),
        currentPlan: serializeBlocks(s.blocks, undefined, s.extraInfo),
        dayTitle: s.dayTitle,
        extraInfo: s.extraInfo
      }, planningMode, 'create', agendaPromptMode);
      sessionAiLastResponse = text;
      if (agendaPromptMode === 'helpful-questions' && isAiQuestionResponse(text.text)) {
        aiQuestionText = text.text;
        aiInput = '';
        return;
      }
      const normalizedText = enforceAiMinimumMinutes(text.text);
      sessionAiLastResponse = { ...text, text: normalizedText };
      handlePartsInput(normalizedText, true);
      aiInput = '';
      aiQuestionText = '';
      sessionAiConversationSeed = '';
    } catch (e: any) {
      sessionAiLastResponse = null;
      sessionAiConversationSeed = '';
      aiError = e.message || 'Nätverksfel';
    } finally {
      aiLoading = false;
    }
  }

  async function runAiAgenda() {
    const input = composeAiConversationInput({
      input: agendaAiInput,
      fallback: '',
      seed: agendaAiConversationSeed,
      questions: agendaAiQuestionText
    });
    if (!input) return;
    agendaAiLoading = true; agendaAiError = ''; agendaAiQuestionText = '';
    try {
      if (!agendaAiConversationSeed) agendaAiConversationSeed = agendaAiInput.trim();
      const { planMode, agendaPromptMode } = flexibilityToModes(agendaAiFlexibilityLevel);
      agendaAiPromptMode = agendaPromptMode;
      const preferredMode = agendaPlanningModeForPromptMode(agendaPromptMode);
      const planningMode = isValidPlanningModeForContext('agenda', preferredMode)
        ? preferredMode
        : 'anchored-day';
      const requestConfig = { ...aiConfig, planMode };
      const targetDate = selectedDay?.date ?? activeAgendaDate() ?? localDateISO();
      const text = await requestAiPlan(
        requestConfig,
        input,
        'agenda',
        buildAgendaAiContext(targetDate, activeAgendaText()),
        planningMode,
        'create',
        agendaPromptMode
      );
      agendaAiLastResponse = text;
      if (agendaPromptMode === 'helpful-questions' && isAiQuestionResponse(text.text)) {
        agendaAiQuestionText = text.text;
        agendaAiInput = '';
        return;
      }
      const normalizedText = enforceAiMinimumMinutes(text.text);
      agendaAiLastResponse = { ...text, text: normalizedText };
      agendaDraft = buildAgendaAiDraftText(targetDate, normalizedText);
      agendaDraftDate = targetDate;
      agendaDraftDirty = true;
      agendaDraftSource = 'ai';
      agendaInputOpen = true;
      agendaAiInput = '';
      agendaAiQuestionText = '';
      agendaAiConversationSeed = '';
    } catch (e: any) { 
      agendaAiLastResponse = null;
      agendaAiConversationSeed = '';
      agendaAiError = e.message || 'Nätverksfel'; 
    } finally { 
      agendaAiLoading = false; 
    }
  }

  async function runScheduleVision(file: File) {
    scheduleLoading = true;
    agendaAiError = '';
    try {
      const result = await runScheduleImport({ file, weekInput: '', addStandardParts: true, aiConfig });
      if (result.error) { agendaAiError = result.error; return; }
      agendaDraft = result.text ?? '';
      agendaDraftDate = null;
      agendaDraftDirty = true;
      agendaDraftSource = 'ai';
      if (s.activeSection !== 'plan') setActiveSection('plan');
      setWriteMenuSection('agenda', true);
    } catch (e: unknown) {
      agendaAiError = e instanceof Error ? e.message : 'Nätverksfel';
    } finally {
      scheduleLoading = false;
    }
  }

  function toggleAgendaVoice() {
    if (agendaAiRecording) {
      agendaVoice.stop();
      agendaAiRecording = false;
      return;
    }
    agendaAiRecording = true;
    const useWhisper = aiConfig.provider === 'openai' && !!aiConfig.apiKey;
    agendaVoice.start({
      useWhisper,
      apiKey: aiConfig.whisperKey || aiConfig.apiKey,
      onResult: (text) => {
        agendaAiInput = agendaAiInput ? agendaAiInput + ' ' + text : text;
        agendaAiRecording = false;
      },
      onError: (err) => {
        console.error('Agenda voice error:', err);
        agendaAiRecording = false;
      }
    });
  }

  async function handleUnifiedUpload(file: File) {
    const type = detectImportType(file);
    if (type === 'ics') {
      const text = await file.text();
      icsDraft = text;
      previewIcsImport();
      importPreviewedIcs();
    } else if (type === 'text') {
      const text = await file.text();
      agendaAiInput = text;
      agendaAiOpen = true;
    } else {
      await runScheduleVision(file);
    }
  }

  function setFlowMinutes(flow: Flow, newTotal: number): Flow {
    const oldTotal = flow.minutes.reduce((a, b) => a + b, 0);
    if (oldTotal === 0) return { ...flow, minutes: flow.minutes.map(() => Math.max(1, Math.round(newTotal / flow.minutes.length))) };
    const scaled = flow.minutes.map(m => Math.max(1, Math.round(m * newTotal / oldTotal)));
    const drift = newTotal - scaled.reduce((a, b) => a + b, 0);
    scaled[scaled.length - 1] = Math.max(1, scaled[scaled.length - 1] + drift);
    return { ...flow, minutes: scaled };
  }

  function computeMovePreview(day: AgendaDay, flowIdx: number, dropY: number) {
    const items = buildAgendaItemsForDay(day, agendaDayStart);
    const source = items[flowIdx];
    if (!source) return null;
    const windowStart = agendaLayout.window.start;
    const windowEnd = AGENDA_DAY_WINDOW_END;
    const dropMin = yToMinute(dropY, agendaLayout.window, 5);
    const others = items.filter((_, i) => i !== flowIdx);

    // 1. Finger on another block?
    const hitBlock = others.find(b => dropMin >= b.startMin && dropMin < b.startMin + b.totalMin);
    if (hitBlock) {
      const hitIdx = items.indexOf(hitBlock);
      // Adjacent grannblock → swap. Non-adjacent → fall through to free placement.
      if (hitIdx === flowIdx + 1 || hitIdx === flowIdx - 1) {
        const sStart = source.startMin, sLen = source.totalMin;
        const nStart = hitBlock.startMin, nLen = hitBlock.totalMin;
        const isDown = hitIdx > flowIdx;
        let newSourceStart: number;
        let newNeighborStart: number;
        if (isDown) {
          // Pure starttime swap works if neighbor at sStart fits before original nStart
          const pureOk = sStart + nLen <= nStart;
          if (pureOk) {
            newSourceStart = nStart;
            newNeighborStart = sStart;
          } else {
            newSourceStart = sStart + nLen;
            newNeighborStart = sStart;
          }
        } else {
          const pureOk = nStart + sLen <= sStart;
          if (pureOk) {
            newSourceStart = nStart;
            newNeighborStart = sStart;
          } else {
            newSourceStart = nStart;
            newNeighborStart = nStart + sLen;
          }
        }
        return {
          items, source,
          targetIdx: hitIdx,
          previewStart: newSourceStart,
          previewValid: true,
          swap: { withIdx: hitIdx, neighborNewStart: newNeighborStart }
        };
      }
      // hit a non-adjacent block → don't swap, fall through to free placement
    }

    // 2. Free placement: find closest valid spot in any gap.
    const sortedOthers = [...others].sort((a, b) => a.startMin - b.startMin);
    const freeIntervals: { start: number; end: number }[] = [];
    let cursor = windowStart;
    for (const b of sortedOthers) {
      if (b.startMin > cursor) freeIntervals.push({ start: cursor, end: b.startMin });
      cursor = Math.max(cursor, b.startMin + b.totalMin);
    }
    if (cursor < windowEnd) freeIntervals.push({ start: cursor, end: windowEnd });

    const validIntervals = freeIntervals.filter(iv => iv.end - iv.start >= source.totalMin);
    let bestStart: number | null = null;
    let bestDist = Infinity;
    for (const iv of validIntervals) {
      const clamped = Math.max(iv.start, Math.min(iv.end - source.totalMin, dropMin));
      const dist = Math.abs(clamped - dropMin);
      if (dist < bestDist) { bestDist = dist; bestStart = clamped; }
    }
    if (bestStart !== null) {
      let targetIdx = others.findIndex(b => b.startMin > bestStart!);
      if (targetIdx < 0) targetIdx = others.length;
      return { items, source, targetIdx, previewStart: bestStart, previewValid: true, swap: null };
    }

    return { items, source, targetIdx: flowIdx, previewStart: source.startMin, previewValid: true, swap: null };
  }

  function startAgendaDrag(e: PointerEvent, i: number, edge: 'top' | 'bottom') {
    if (isViewMode || locked || !agendaDays || !selectedDay || !timelineEl) return;
    e.preventDefault();
    e.stopPropagation();
    agendaDragMoved = false;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const dayIdx = selectedDayIdx;
    if (dayIdx < 0) return;
    const item = agendaItems[i];
    const prev = agendaItems[i - 1];
    const next = agendaItems[i + 1];
    agendaDragState = {
      i, dayIdx,
      startY: e.clientY,
      startMinA: item.totalMin,
      blockStart: item.startMin,
      blockEnd: item.startMin + item.totalMin,
      clampMin: prev ? prev.startMin + prev.totalMin + 5 : 0,
      clampMax: next ? next.startMin - 5 : 24 * 60,
      edge,
      containerH: timelineEl.clientHeight,
      windowMinutes: agendaLayout.window.minutes,
    };
    window.addEventListener('pointermove', onAgendaDrag);
    window.addEventListener('pointerup', endAgendaDrag);
    window.addEventListener('pointercancel', endAgendaDrag);
  }

  function onAgendaDrag(e: PointerEvent) {
    const d = agendaDragState;
    if (!d || !agendaDays) return;
    const deltaY = e.clientY - d.startY;
    if (Math.abs(deltaY) < 4) return;
    const deltaMin = Math.round(deltaY / d.containerH * d.windowMinutes);
    agendaDragMoved = true;
    const newDays = agendaDays.map((day, di) => {
      if (di !== d.dayIdx) return day;
      return {
        ...day,
        flows: day.flows.map((flow, fi) => {
          if (fi !== d.i) return flow;
          if (d.edge === 'bottom') {
            const newEnd = Math.max(d.blockStart + 5, Math.min(d.clampMax, d.blockStart + d.startMinA + deltaMin));
            return setFlowMinutes(flow, newEnd - d.blockStart);
          } else {
            const newStart = Math.max(d.clampMin, Math.min(d.blockEnd - 5, d.blockStart + deltaMin));
            return { ...setFlowMinutes(flow, d.blockEnd - newStart), startMin: newStart };
          }
        }),
      };
    });
    setActiveAgendaText(serializeAgenda(newDays));
    if (selectedAgendaDetails?.dayIdx === d.dayIdx && selectedAgendaDetails.flowIdx === d.i) {
      const updatedDay = newDays[d.dayIdx];
      const updatedItem = buildAgendaItemsForDay(updatedDay, d.blockStart)[d.i];
      if (updatedItem) {
        activeAgendaFlowRef = makeAgendaFlowRef(updatedDay.date ?? null, updatedItem.flow, updatedItem.startMin);
        s.startMin = updatedItem.startMin;
        // Sync editor blocks and text to match the resized agenda item
        updatedItem.flow.minutes.forEach((m, bi) => {
          if (s.blocks[bi]) s.blocks[bi].minutes = m;
        });
        syncPartsDraftFromState(true);
      }
    }
  }

  function endAgendaDrag() {
    if (agendaDragState && selectedAgendaDetails?.dayIdx === agendaDragState.dayIdx && selectedAgendaDetails.flowIdx === agendaDragState.i) {
      capturePanelBaseline('plan');
      capturePanelBaseline('now');
    }
    agendaDragState = null;
    window.removeEventListener('pointermove', onAgendaDrag);
    window.removeEventListener('pointerup', endAgendaDrag);
    window.removeEventListener('pointercancel', endAgendaDrag);
    setTimeout(() => { agendaDragMoved = false; }, 0);
    persistAgendaMutation();
  }

  const currentAiPrompt = $derived(
    getAiSessionPrompt(sessionAiPromptMode, localDateISO(), totalMin())
  );

  function syncPartsDraftFromState(force = false) {
    const source = serializeBlocks(s.blocks, undefined, s.extraInfo);
    // ONLY sync from the state into the editable parts draft 
    // IF the user hasn't started editing the draft yet OR if we force it.
    if (force || !partsDraftDirty) {
      partsDraft = source;
      partsDraftDirty = false;
    }
  }

  function syncAgendaDraftFromState(force = false) {
    const currentDate = selectedDay?.date ?? activeAgendaDate() ?? localDateISO();
    const source = serializeSelectedAgendaDay(currentDate, agendaDays, { includeIds: false });
    // ONLY sync from the state into the editable agenda draft 
    // IF the user hasn't started editing the draft yet OR if we force it.
    if (force || agendaDraftDate !== currentDate || !agendaDraftDirty) {
      agendaDraft = source;
      agendaDraftDate = currentDate;
      agendaDraftDirty = false;
      agendaDraftSource = 'manual';
    }
  }

  function startSidebarResize(e: PointerEvent) {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    window.addEventListener('pointermove', onSidebarResize);
    window.addEventListener('pointerup', endSidebarResize);
  }
  function onSidebarResize(e: PointerEvent) {
    if (!sidebarEl) return;
    const newW = Math.max(160, Math.min(720, e.clientX - sidebarEl.getBoundingClientRect().left));
    sidebarEl.style.width = newW + 'px';
    document.documentElement.style.setProperty('--sb-w', newW + 'px');
  }
  function endSidebarResize() {
    window.removeEventListener('pointermove', onSidebarResize);
    window.removeEventListener('pointerup', endSidebarResize);
  }

  function startAgendaResize(e: PointerEvent) {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    window.addEventListener('pointermove', onAgendaResize);
    window.addEventListener('pointerup', endAgendaResize);
  }
  function onAgendaResize(e: PointerEvent) {
    if (!agendaEl) return;
    const newW = Math.max(160, Math.min(720, agendaEl.getBoundingClientRect().right - e.clientX));
    agendaEl.style.width = newW + 'px';
    document.documentElement.style.setProperty('--ag-w', newW + 'px');
  }
  function endAgendaResize() {
    window.removeEventListener('pointermove', onAgendaResize);
    window.removeEventListener('pointerup', endAgendaResize);
  }

  function handleOutsideClick(e: MouseEvent) {
    flushWorkspaceAutosave();
    if (!(e.target as Element).closest('.mini-menu-shell')) optionsMenuOpen = false;
  }

  function isInputFocused() {
    const active = document.activeElement;
    if (!active) return false;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) return true;
    return (active as HTMLElement).isContentEditable;
  }

  let toastMsg = $state('');
  let toastTimer: ReturnType<typeof setTimeout> | null = null;
  function showToast(msg: string) {
    toastMsg = msg;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastMsg = ''; }, 2000);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.altKey && e.shiftKey && (e.key === 'R' || e.key === 'r')) {
      e.preventDefault();
      if (confirm('Återställ timern? All sparad data raderas.')) {
        appState.reset();
        window.location.reload();
      }
      return;
    }

    const key = e.key.toLowerCase();
    const isAltOnly = e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey;
    const isNoMod = !e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey;

    if ((isAltOnly || (isNoMod && !isInputFocused()))) {
      if (key === 'n') {
        e.preventDefault();
        goToTimerNow();
      } else if (key === 'p') {
        e.preventDefault();
        if (isNoMod && !isViewMode) toggleMiniMenu();
        else setActiveSection('plan');
      } else if (key === 'b') {
        e.preventDefault();
        setActiveSection('library');
      } else if (key === 'k') {
        e.preventDefault();
        setActiveSection('workspace');
      } else if (key === 'a' && loggedInUser.toLowerCase() === 'admin') {
        e.preventDefault();
        setActiveSection('admin');
      } else if (key === 'i') {
        e.preventDefault();
        s.showHelpHints = !s.showHelpHints;
        appState.persist();
      } else if (key === 's') {
        if (!isViewMode) {
          e.preventDefault();
          if (s.isLocked) {
            showToast('Låst – lås upp (l) för att växla');
            return;
          }
          setAgendaView(s.agendaView === 'school' ? 'private' : 'school');
          const labels: Record<string, string> = { school: 'Öppet', private: 'Eget' };
          showToast(labels[s.agendaView]);
          appState.persist();
        }
      } else if (key === 'l') {
        e.preventDefault();
        if (s.isLocked) {
          const code = prompt('Ange kontokod för att låsa upp:');
          if (code === s.syncKey || (!s.syncKey && code === '')) {
            s.isLocked = false;
            showToast('Upplåst');
          } else {
            alert('Fel kod.');
          }
        } else {
          s.isLocked = true;
          setAgendaView('school');
          showToast('Låst (Öppet läge)');
        }
        appState.persist();
      }
    }
  }

  onMount(() => {
    pageOrigin = window.location.origin;
    loadWriteMenuSections();
    const handleViewport = () => {
      showAgendaOverlay = window.innerWidth > 980;
    };
    handleViewport();
    // View mode: load shared state and start polling
    const vt = new URLSearchParams(location.search).get('view');
    let viewPollId: ReturnType<typeof setInterval> | null = null;
    let viewVisibilityHandler: (() => void) | null = null;
    if (vt) {
      isViewMode = true;
      viewToken = vt;
      locked = true;
      miniMenuOpen = false;
      s.agendaOpen = true;
      s.sbCollapsed = false;
      s.showControls = false;
      agendaInputOpen = false;
      agendaCalendarOpen = false;
      document.body.classList.add('view-mode');
      loadSharedState(vt);
      viewPollId = setInterval(() => loadSharedState(vt), 30000);
      viewVisibilityHandler = () => {
        if (document.hidden) {
          if (viewPollId) { clearInterval(viewPollId); viewPollId = null; }
        } else {
          loadSharedState(vt);
          viewPollId = setInterval(() => loadSharedState(vt), 30000);
        }
      };
      document.addEventListener('visibilitychange', viewVisibilityHandler);
    }

    if (new URLSearchParams(location.search).get('widget') === '1') {
      widgetMode = true;
    }

    shareEntries = loadPersistedShareEntries();
    const legacyToken = readSessionValue(SHARE_TOKEN_STORAGE) ?? localStorage.getItem(SHARE_TOKEN_STORAGE);
    const legacyOwner = readSessionValue(SHARE_OWNER_STORAGE) ?? localStorage.getItem(SHARE_OWNER_STORAGE);
    const legacyMode = (readSessionValue(SHARE_MODE_STORAGE) ?? localStorage.getItem(SHARE_MODE_STORAGE)) as ShareMode | null;
    const legacyIsActive = legacyToken && legacyOwner && (legacyMode ?? 'active-session-live') === 'active-session-live';
    if (legacyIsActive && !shareEntries[ACTIVE_SHARE_KEY]) {
      shareEntries = { ...shareEntries, [ACTIVE_SHARE_KEY]: { viewToken: legacyToken, ownerToken: legacyOwner, mode: 'active-session-live' } };
      persistShareEntries();
    }
    clearLegacyShareState();

    if (!localStorage.getItem('day_timer_v1')) {
      const d = new Date();
      s.startMin = d.getHours() * 60;
      s.showControls = true;
    }
    // On touch devices: force sensible defaults on every load
    if (navigator.maxTouchPoints > 1) {
      s.sbCollapsed = false;
      s.showControls = true;
      s.activeSection = 'now';
      activeSection = 'now';
      mobileTab = 'now';
      if (window.innerWidth < 1100 && window.innerWidth > 800) {
        s.agendaOpen = false; // iPad portrait: stäng agenda för att inte tränga
      }
      appState.persist();
    }
    if (!isViewMode) restoreRunModePreference();
    syncBodyClasses();
    scrollMobileViewportTop();
    const resizeObservers: ResizeObserver[] = [];
    if (sidebarEl && window.ResizeObserver) {
      const ro = new ResizeObserver(() => {
        document.documentElement.style.setProperty('--sb-w', sidebarEl.offsetWidth + 'px');
      });
      ro.observe(sidebarEl);
      document.documentElement.style.setProperty('--sb-w', sidebarEl.offsetWidth + 'px');
      resizeObservers.push(ro);
    }
    if (agendaEl && window.ResizeObserver) {
      const ro = new ResizeObserver(() => {
        document.documentElement.style.setProperty('--ag-w', agendaEl.offsetWidth + 'px');
      });
      ro.observe(agendaEl);
      document.documentElement.style.setProperty('--ag-w', agendaEl.offsetWidth + 'px');
      resizeObservers.push(ro);
    }
    const savedToken = readSessionValue(SYNC_TOKEN_STORAGE) ?? localStorage.getItem(SYNC_TOKEN_STORAGE);
    const migrateLegacyToken = async () => {
      const sourceToken: string = savedToken || s.syncKey || '';
      if (!sourceToken) { loadingFromCloud = false; return; }
      const existingHashedToken = validateSyncToken(sourceToken) ? sourceToken : null;
      if (existingHashedToken) {
        s.syncKey = existingHashedToken;
        writeSessionValue(SYNC_TOKEN_STORAGE, existingHashedToken);
        localStorage.removeItem(SYNC_TOKEN_STORAGE);
      } else {
        const legacyToken = sourceToken;
        const idx = legacyToken.indexOf(':');
        if (idx > 0) {
          const name = legacyToken.slice(0, idx);
          const pass = legacyToken.slice(idx + 1);
          if (name && pass) {
            s.syncKey = await deriveSyncToken(name, pass);
            writeSessionValue(SYNC_TOKEN_STORAGE, s.syncKey);
            localStorage.removeItem(SYNC_TOKEN_STORAGE);
            appState.persist();
          }
        }
      }
      // Trigger sync load once we have a valid key
      if (s.syncKey) await syncLoad('auto');
      else loadingFromCloud = false;
    };
    void migrateLegacyToken();
    const savedUser = localStorage.getItem('timer-login-user');
    if (savedUser) {
      loggedInUser = savedUser;
      if (savedUser.toLowerCase() === 'admin') adminPassword = localStorage.getItem('admin-password') || '';
    }
    aiConfig = loadAiConfig();
    const today = localDateISO();
    if (!isViewMode) {
      setActiveAgendaDate(today);
      // Automatically find and jump to the current session from the agenda if possible
      const hasRunnableSession = untrack(() => goToTimerNow());
      if (!hasRunnableSession && locked && !miniMenuOpen) {
        locked = false;
        miniMenuOpen = true;
        s.showControls = true;
        persistRunModePreference(false);
        appState.persist();
      }
    }

    
    updateTimeFeedback();
    capturePanelBaseline('now');
    capturePanelBaseline('plan');
    calendarMonthCursor = monthKey(parseIsoDate(selectedDay?.date ?? today));
    tick();
    const id = setInterval(tick, 1000);

    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('focusout', flushWorkspaceAutosave);

    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('resize', handleViewport);

    const handleFocus = () => {
      if (!document.hidden && s.syncKey && !loadingFromCloud) {
        void syncLoad('auto');
      }
    };
    document.addEventListener('visibilitychange', handleFocus);
    window.addEventListener('focus', handleFocus);
    const syncPollId = setInterval(async () => {
      if (document.hidden || !s.syncKey || loadingFromCloud || syncProbeState.startsWith('saving')) return;
      try {
        const res = await fetch('/api/sync/rev', { headers: { 'x-sync-token': s.syncKey } });
        if (!res.ok) return;
        const { revision } = await res.json();
        if (typeof revision === 'number' && revision > s.currentRevision) {
          void syncLoad('auto');
        }
      } catch { /* silent */ }
    }, 30 * 1000);

    return () => {
      clearInterval(id);
      if (workspaceAutosaveTimer) clearTimeout(workspaceAutosaveTimer);
      if (viewPollId) clearInterval(viewPollId);
      if (syncPollId) clearInterval(syncPollId);
      if (viewVisibilityHandler) document.removeEventListener('visibilitychange', viewVisibilityHandler);
      document.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('focus', handleFocus);
      resizeObservers.forEach(ro => ro.disconnect());
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('focusout', flushWorkspaceAutosave);
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('resize', handleViewport);
    };
  });

  $effect(() => {
    const _ = s.palette + s.dark + s.sbCollapsed + s.agendaOpen + mobileTab + locked + miniMenuOpen + widgetMode;
    if (typeof document !== 'undefined') syncBodyClasses();
  });

  $effect(() => {
    if (!selectedDay) return;
    const flows = selectedDay.flows;
    const firstExplicitIdx = flows.findIndex(f => f.startMin !== undefined);
    if (firstExplicitIdx >= 0) {
      let t = flows[firstExplicitIdx].startMin!;
      for (let i = firstExplicitIdx - 1; i >= 0; i--) {
        t -= flows[i].minutes.reduce((a, b) => a + b, 0);
      }
      agendaDayStart = t;
    } else {
      agendaDayStart = untrack(() => s.startMin);
    }
  });

  $effect(() => {
    const activeDate = selectedDay?.date ?? localDateISO();
    if (!calendarMonthCursor) {
      calendarMonthCursor = monthKey(parseIsoDate(activeDate));
    }
  });

  $effect(() => {
    const _selectedDate = selectedDay?.date ?? activeAgendaDate() ?? localDateISO();
    const _agendaText = activeAgendaText();
    // Only sync from the persistent state into the editable draft 
    // IF the user hasn't started editing the draft yet.
    if (activeSection === 'plan' && !agendaDraftDirty) {
      syncAgendaDraftFromState();
    }
  });

  $effect(() => {
    // Watch for state changes that should update the parts draft
    const _blocks = s.blocks;
    const _title = s.dayTitle;
    const _extra = s.extraInfo;
    syncPartsDraftFromState();
  });

  $effect(() => {
    const _section = activeSection;
    const _title = s.dayTitle;
    const _extra = s.extraInfo;
    const _start = s.startMin;
    const _blocks = JSON.stringify(s.blocks);
    syncActiveDraftFromEditor();
  });

  $effect(() => {
    const activeEntry = shareEntries[ACTIVE_SHARE_KEY];
    if (!activeEntry || activeEntry.mode !== 'active-session-live') return;
    let id: ReturnType<typeof setInterval> | null = null;

    function startPush() {
      if (!id) id = setInterval(pushShareState, 60000);
    }
    function stopPush() {
      if (id) { clearInterval(id); id = null; }
    }

    function onVisibility() {
      document.hidden ? stopPush() : (pushShareState(), startPush());
    }

    startPush();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stopPush();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  });

  $effect(() => {
    const hash = JSON.stringify(currentWorkspaceData());
    if (isViewMode || loadingFromCloud || !hasSyncSession() || hash === lastSyncedHash) {
      return;
    }
    queueWorkspaceAutosave(2000);
  });

  function toggleCollapse() {
    s.sbCollapsed = !s.sbCollapsed;
    appState.persist();
  }

  function toggleAgenda() {
    s.agendaOpen = !s.agendaOpen;
    appState.persist();
  }

  function cycleClockSpan() {
    s.clockSpan = s.clockSpan === 720 ? 60 : 720;
    appState.persist();
  }

  function checkAutoLoad() {
    const nowMin = nowMinutes();
    const decision = decideAutoLoadAgendaItem({
      activeSection: s.activeSection as AppSection,
      partsDraftDirty,
      nowMin,
      date: localDateISO(),
      fallbackStart: agendaDayStart,
      days: agendaDays,
      activeRef: activeAgendaFlowRef,
      lastAutoLoadKey
    });
    if (decision.action === 'skip') return;
    if (decision.action === 'mark-current') {
      lastAutoLoadKey = decision.key;
      return;
    }
    const active = decision.item;
    lastAutoLoadKey = decision.key;
    applySessionStateFromFlow(active.flow, { startMin: active.flow.startMin ?? active.startMin, pinned: minutes => minutes > 0 });
    activeAgendaFlowRef = selectedDay
      ? makeAgendaFlowRef(selectedDay.date ?? null, active.flow, s.startMin)
      : null;
    planSelectionExplicit = false;
    sessionSource = activeAgendaFlowRef
      ? { kind: 'agenda', date: selectedDay?.date ?? null, title: active.flow.title, startMin: s.startMin }
      : { kind: 'unscheduled' };
    updateTimeFeedback();
    
    capturePanelBaseline('now');
    capturePanelBaseline('plan');
    appState.persist();
  }

  function startAgendaMove(e: PointerEvent, i: number) {
    if (isViewMode || locked || !agendaDays || !selectedDay || !timelineEl || s.activeSection === 'now') return;
    e.preventDefault();
    e.stopPropagation();
    try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch {}
    agendaDragMoved = false;
    const dayIdx = selectedDayIdx;
    if (dayIdx < 0) return;
    const preview = computeMovePreview(selectedDay, i, e.clientY - timelineEl.getBoundingClientRect().top);
    agendaMoveState = {
      dayIdx,
      flowIdx: i,
      startY: e.clientY,
      currentY: e.clientY,
      targetIdx: preview?.targetIdx ?? i,
      previewStart: preview?.previewStart ?? null,
      previewValid: preview?.previewValid ?? false,
      swap: preview?.swap ?? null
    };
    window.addEventListener('pointermove', onAgendaMove);
    window.addEventListener('pointerup', endAgendaMove);
    window.addEventListener('pointercancel', endAgendaMove);
  }

  function onAgendaMove(e: PointerEvent) {
    const move = agendaMoveState;
    if (!move || !agendaDays || !selectedDay) return;
    move.currentY = e.clientY;
    if (Math.abs(move.currentY - move.startY) < 6) return;
    agendaDragMoved = true;
    const preview = computeMovePreview(selectedDay, move.flowIdx, move.currentY - timelineEl.getBoundingClientRect().top);
    if (preview) {
      move.targetIdx = preview.targetIdx;
      move.previewStart = preview.previewStart;
      move.previewValid = preview.previewValid;
      move.swap = preview.swap;
    }
  }

  function endAgendaMove() {
    const move = agendaMoveState;
    agendaMoveState = null;
    window.removeEventListener('pointermove', onAgendaMove);
    window.removeEventListener('pointerup', endAgendaMove);
    window.removeEventListener('pointercancel', endAgendaMove);
    if (!move || !agendaDays || !selectedDay || !timelineEl || !agendaDragMoved) {
      setTimeout(() => { agendaDragMoved = false; }, 0);
      return;
    }
    const preview = move.previewValid && move.previewStart !== null ? move : computeMovePreview(selectedDay, move.flowIdx, move.currentY - timelineEl.getBoundingClientRect().top);
    if (!preview || !preview.previewValid || preview.previewStart === null) {
      setTimeout(() => { agendaDragMoved = false; }, 0);
      return;
    }
    const previewStart = preview.previewStart;
    const swap = move.swap;

    const newDays = agendaDays.map((day, di) => {
      if (di !== move.dayIdx) return day;
      const flows = [...day.flows];
      if (swap) {
        const fromIdx = move.flowIdx;
        const toIdx = swap.withIdx;
        const dragged = flows[fromIdx];
        const neighbor = flows[toIdx];
        if (!dragged || !neighbor) return day;
        flows[fromIdx] = { ...neighbor, startMin: swap.neighborNewStart };
        flows[toIdx] = { ...dragged, startMin: previewStart };
      } else {
        const [movedFlow] = flows.splice(move.flowIdx, 1);
        const updated = { ...movedFlow, startMin: previewStart };
        flows.splice(Math.min(preview.targetIdx, flows.length), 0, updated);
      }
      return { ...day, flows };
    });
    setActiveAgendaText(serializeAgenda(newDays));
    const movedFlowId = agendaDays[move.dayIdx]?.flows[move.flowIdx]?.id;
    if (selectedAgendaDetails?.dayIdx === move.dayIdx) {
      const updatedDay = newDays[move.dayIdx];
      const updatedItems = buildAgendaItemsForDay(updatedDay, agendaDayStart);
      const updatedItem = updatedItems.find(item => item.flow.id === selectedAgendaDetails.flow.id) ?? updatedItems.find(item => item.flow.title === selectedAgendaDetails.flow.title);
      if (updatedItem) {
        activeAgendaFlowRef = makeAgendaFlowRef(updatedDay.date ?? null, updatedItem.flow, updatedItem.startMin);
        if (movedFlowId && updatedItem.flow.id === movedFlowId) {
          s.startMin = updatedItem.startMin;
          syncPartsDraftFromState(true);
          capturePanelBaseline('plan');
          capturePanelBaseline('now');
        }
      }
    }
    persistAgendaMutation();
    setTimeout(() => { agendaDragMoved = false; }, 0);
  }

  function loadAgendaFlow(flow: Flow, computedStart: number, targetSection: AppSection = 'plan', markExplicitSelection = true) {
    if (activeAgendaFlowRef) {
      syncTimerToAgenda(true);
    }
    if (s.activeSection !== targetSection) {
      setActiveSection(targetSection);
    }

    const prepared = prepareAgendaFlowLoad({
      date: selectedDay?.date ?? null,
      flow,
      computedStart,
      targetSection,
      markExplicitSelection,
      createId: uid
    });
    s.dayTitle = prepared.session.dayTitle;
    s.blocks = prepared.session.blocks;
    s.extraInfo = prepared.session.extraInfo;
    s.startMin = prepared.session.startMin;
    if (prepared.session.clockSpan !== undefined) s.clockSpan = prepared.session.clockSpan;
    warnedSet.clear();
    activeAgendaFlowRef = selectedDay ? prepared.activeRef : null;
    planSelectionExplicit = prepared.planSelectionExplicit;
    sessionSource = activeAgendaFlowRef ? prepared.sessionSource : { kind: 'unscheduled' };
    planLastSavedAt = Date.now();
    capturePanelBaseline('plan');
    capturePanelBaseline('now');
    syncPartsDraftFromState(true);
    updateTimeFeedback();  appState.persist();
  }

  function goToTimerNow(): boolean {
    const now = nowMinutes();
    const today = localDateISO();

    setActiveAgendaDate(today);
    const stored = activeAgendaText();
    const days = stored.trim() ? parseAgenda(stored) : [];
    const target = decideNowAgendaTarget(days, today, now, agendaDayStart);
    if (target) {
      loadAgendaFlow(target.item.flow, target.item.startMin, 'now', false);
      return true;
    }

    setActiveSection('now');
    if (!hasRunnableSessionContent(s.blocks)) {
      const fallback = createCurrentFallbackSession(now, uid);
      s.dayTitle = fallback.dayTitle;
      s.blocks = fallback.blocks;
      s.extraInfo = fallback.extraInfo;
      s.startMin = fallback.startMin;

      lastAutoLoadKey = '';
      activeAgendaFlowRef = null;
      planSelectionExplicit = false;
      sessionSource = { kind: 'unscheduled' };
    }

    capturePanelBaseline('now');
    capturePanelBaseline('plan');
    syncPartsDraftFromState(true);
    updateTimeFeedback();
    appState.persist();
    return false;
  }

  function openPlan() {
    if (activeSection === 'plan') return;
    const today = localDateISO();
    setActiveAgendaDate(today);
    const stored = activeAgendaText();
    const days = stored.trim() ? parseAgenda(stored) : [];
    const target = decideNowAgendaTarget(days, today, nowMinutes(), agendaDayStart);
    if (target && target.kind === 'active') {
      loadAgendaFlow(target.item.flow, target.item.startMin, 'plan', true);
      return;
    }
    const carry = hasRunnableSessionContent(s.blocks) ? currentEditorDraft() : null;
    setActiveSection('plan');
    if (carry) {
      s.planDraft = carry;
      applyEditorDraft(s.planDraft);
      capturePanelBaseline('plan');
      partsDraftDirty = false;
      syncPartsDraftFromState(true);
      appState.persist();
    }
  }
</script>

<div class="app" bind:this={appEl}>
  <aside class="sidebar" bind:this={sidebarEl}>
    <Sidebar
      bind:blocks={s.blocks}
      palette={s.palette}
      dark={s.dark}
      segMinutesMode={s.segMinutesMode}
      showSegNotes={s.showSegNotes}
      showExtraInfo={s.showExtraInfo}
      bind:extraInfo={s.extraInfo}
      isViewMode={isViewMode}
      elapsedMin={elapsedMin()}
      agendaView={s.agendaView}
      onCommitEdit={commitBlockEdit}
      onToggleSegmentDone={toggleSegmentDone}
      doneBlockIds={Object.keys(doneSegments)}
    />
  </aside>

  <div class="resize-handle-sb" role="separator" aria-orientation="vertical" onpointerdown={startSidebarResize}></div>
  <button class="collapse-btn" onclick={toggleCollapse} title="Dölj panel">
    {s.sbCollapsed ? '›' : '‹'}
  </button>

  {#if isViewMode}
    <div class="live-badge">{viewShareMode === 'active-session-live' ? '● Live' : '◌ Snapshot'}</div>
  {/if}

  <main class="main">
    <div class="main-header">
      {#if !isViewMode && !locked}
        <input id="lesson-title-input" class="lesson-title lesson-title-editable hero-text"
          placeholder="Rubrik…"
          value={titleDraftValue || stripColorDirective(s.dayTitle)}
          onfocus={() => { titleDraftValue = s.dayTitle; }}
          oninput={(e) => { titleDraftValue = (e.target as HTMLInputElement).value; }}
          onblur={(e) => {
            const v = (e.target as HTMLInputElement).value.trim();
            if (v !== s.dayTitle) { s.dayTitle = v; syncTimerToAgenda(); appState.persist(); }
            titleDraftValue = '';
          }}
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur(); }}
        />
      {:else if s.dayTitle}
        <div class="lesson-title hero-text">{stripColorDirective(s.dayTitle)}</div>
      {/if}
      <div class="top-time">
        <button class="now now-btn hero-text" type="button" onclick={goToTimerNow} title="Visa nuvarande tid">{nowText}</button>
        {#if s.showLeft}<div class="left">{leftText}</div>{/if}
      </div>
      {#if nextVisibleSessionTitle}
        <div class="next-session hero-text" title="Nästa pass">{nextVisibleSessionTitle}</div>
      {/if}
    </div>

    <div id="clock-wrap" class="clock-wrap">
      <Clock
        bind:svgEl={svgEl}
        palette={s.palette}
        dark={s.dark}
        blocks={s.blocks}
        startMin={s.startMin}
        clockSpan={s.clockSpan}
        hollow={s.hollow}
        textOutside={s.textOutside}
        showCenterEnd={s.showCenterEnd}
        showMin={s.showMin}
        showFive={s.showFive}
        showQuarter={s.showQuarter}
        showFutureSegments={s.showFutureSegments}
        showSegLabels={s.showSegLabels}
        segMinutesMode={s.segMinutesMode}
        nowMin={nowMinLive}
        agendaItems={agendaItems}
        isViewMode={isViewMode}
        locked={locked}
        onLoadAgendaFlow={loadAgendaFlow}
        onStartBoundaryDrag={startBoundaryDrag}
        onStartEndDrag={startEndDrag}
        onStartStartDrag={startStartDrag}
      />
    </div>

    <div class="mini-menu-shell" class:mini-menu-shell--planner={activeSection === 'plan'}>
      <div
        class="toolbar"
        role="button"
        tabindex="0"
        aria-label={miniMenuOpen ? 'Dölj meny' : 'Visa meny'}
        onclick={() => { if (!miniMenuOpen) toggleMiniMenu(); }}
        onkeydown={(e) => {
          if (!miniMenuOpen && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            toggleMiniMenu();
          }
        }}
      >
        <div class="toolbar-side toolbar-side-left" class:collapsed={!miniMenuOpen}>
          <button class="icon" onclick={() => { s.showControls = !s.showControls; appState.persist(); }} title="Skapa och planera timers">✎</button>
          <button class="icon" onclick={(e) => { e.stopPropagation(); optionsMenuOpen = !optionsMenuOpen; }} title="Visningsalternativ">⚙</button>
          <button class="icon clock-span-btn" class:active={s.clockSpan === 720} onclick={cycleClockSpan} title="Klockvy">{s.clockSpan === 720 ? '12h' : '1h'}</button>
          <button class="icon" onclick={() => helpOpen = true} title="Hjälp">ⓘ</button>
          <button class="icon" class:active={widgetMode} onclick={() => widgetMode = !widgetMode} title={widgetMode ? 'Avsluta widget-läge' : 'Widget-läge – dölj menyer, visa bara klockan'}>⊡</button>
        </div>

        {#if !isViewMode}
          <div class="toolbar-center" style="display:flex; align-items:center; gap:0;">
            <button
              id="mini-menu-toggle"
              class="mini-menu-toggle"
              class:open={miniMenuOpen}
              type="button"
              onclick={(e) => { e.stopPropagation(); toggleMiniMenu(); }}
              title={miniMenuOpen ? 'Starta kör-läge' : 'Stoppa kör-läge'}
            >
              <span>{miniMenuOpen ? '▶' : '■'}</span>
            </button>
          </div>
        {/if}

        <div class="toolbar-side toolbar-side-right" class:collapsed={!miniMenuOpen}>
          <button class="icon lock-btn" class:locked onclick={() => locked = !locked} title={locked ? 'Lås upp' : 'Lås sidan'}>{locked ? '○' : '⊠'}</button>
          
          <div id="theme-and-audio" style="display:flex; align-items:center; gap:0;">
            <ThemePicker bind:open={themePickerOpen} onSyncBodyClasses={syncBodyClasses} />

            <div style="position:relative; display:flex; align-items:center;"
              use:clickOutside={() => { warningsOpen = false; }}>
              <button class="icon" 
                onclick={(e) => { e.stopPropagation(); warningsOpen = !warningsOpen; }} 
                title="Hantera ljudaviseringar">
                ♪+
              </button>
              {#if warningsOpen}
                <div class="warnings-popup" role="none" onclick={(e) => e.stopPropagation()}>
                  <button
                    class="mute-all-btn"
                    class:on={soundMuted}
                    onclick={() => soundMuted = !soundMuted}
                    title="Tystar alla ljud för detta pass tills du slår på igen. Per-aktivitetsinställningar påverkas inte.">
                    {soundMuted ? '🔇 Tystat' : '🔔 Ljud på'}
                  </button>
                  {#if s.blocks.length > 0}
                    <div class="warn-dots-grid" class:muted={soundMuted}>
                      {#each s.blocks as b, i (b.id)}
                        {@const ct = clockTheme(s.palette, s.dark)}
                        <button class="wd" class:on={b.warning && !soundMuted} style={`--warn-color:${ct.colors[i % ct.colors.length]}`}
                          title={b.title || 'Aktivitet'}
                          onclick={() => { b.warning = !b.warning; syncTimerToAgenda(); appState.persist(); }}
                        >♪</button>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
          </div>

          <button class="sync-emoji"
            data-sync={!hasSyncSession() ? 'grey'
              : (syncProbeState === 'error' || syncProbeState === 'conflict') ? 'red'
              : (syncProbeState === 'saving' || syncProbeState === 'loading') ? 'orange'
              : syncProbeState === 'queued' ? 'halfgreen'
              : 'green'}
            title={(!hasSyncSession()
              ? 'Ej inloggad'
              : (syncProbeText ? `${loggedInUser ? loggedInUser + ' · ' : ''}${syncProbeText}` : (loggedInUser ? `Inloggad som ${loggedInUser}` : ''))) + ' · Öppna Konto & AI'}
            onclick={() => setActiveSection('workspace')}
          >👤</button>
        </div>
      </div> <!-- toolbar end -->

      {#if optionsMenuOpen}
        <OptionsMenu
          {isViewMode}
          onCycleClockSpan={cycleClockSpan}
          onToggleCollapse={toggleCollapse}
          onShowToast={showToast}
        />
      {/if}

      <div class="mini-menu-details" class:open={miniMenuOpen} class:mini-menu-details--planner={activeSection === 'plan'}>
      {#if s.showControls}
        <div class="controls" class:controls--planner={activeSection === 'plan'}>
        <SectionNav {activeSection} labels={NAV_LABELS} onSelect={(section) => section === 'plan' ? openPlan() : setActiveSection(section)} />

        {#if activeSection === 'now'}
          <div class="section-hero section-hero--split section-hero--compact">
            <div class="hero-select-wrap">
              <select
                id="now-template-select"
                class="hero-select"
                disabled={sortedFlowOptions.length === 0}
                bind:value={nowTemplateSelection}
                onchange={(e) => loadNowTemplate((e.target as HTMLSelectElement).value)}
              >
                <option value="">{sortedFlowOptions.length > 0 ? 'Ladda mall...' : 'Inga mallar ännu'}</option>
                {#each sortedFlowOptions as flow (flow.id)}
                  <option value={flow.id}>{flow.title || '(utan rubrik)'}</option>
                {/each}
              </select>
            </div>
          </div>
        {:else if activeSection === 'plan'}
          <div class="section-hero section-hero--split section-hero--compact">
            <div class="hero-select-wrap">
              <select
                id="plan-template-select"
                class="hero-select"
                disabled={sortedFlowOptions.length === 0}
                bind:value={planTemplateSelection}
                onchange={(e) => loadPlanTemplate((e.target as HTMLSelectElement).value)}
              >
                <option value="">{sortedFlowOptions.length > 0 ? 'Ladda mall...' : 'Inga mallar ännu'}</option>
                {#each sortedFlowOptions as flow (flow.id)}
                  <option value={flow.id}>{flow.title || '(utan rubrik)'}</option>
                {/each}
              </select>
            </div>
          </div>
        {:else}
          <SectionHero title={SECTION_LABELS[activeSection]} copy={sectionCopy} />
        {/if}

        {#if activeSection === 'now' && s.blocks.length > 0}
          <div class="now-live-panel" in:fade={{ duration: 150 }}>
            <div>
              <div class="now-live-title">Nu är live</div>
              <div class="now-live-copy">Justera direkt i rubriken, vänsterpanelen eller genom att dra i klockan. Använd Planera för större ändringar.</div>
            </div>
            <div class="now-live-actions">
              <button class="quickstart quickstart-subtle" type="button" onclick={openPlan}>Redigera i Planera</button>
              <button class="quickstart quickstart-subtle" type="button" onclick={saveFlow}>{savedFlowMsg || 'Spara som mall'}</button>
            </div>
          </div>
	        {:else if activeSection === 'now'}
	          <div in:fade={{ duration: 150 }}>
            <SessionEditorPanel
              userLevel={effectiveUserLevel}
              aiProvider={aiConfig.provider}
              aiApiKey={aiConfig.apiKey}
              mode={activeSection}

              hasSelection={!!selectedAgendaDetails && planSelectionExplicit}
              savedFlowMsg={savedFlowMsg}
              titleValue={s.dayTitle}
              partsValue={partsFieldValue}
              {copyBtnText}
              {partsFeedbackText}
              {timeFeedbackText}
              hasAiKey={!!aiApiKey}
              {aiPanelOpen}
              planShareOpen={writeMenuSections.planShare}
              nowMainOpen={writeMenuSections.nowMain}
              nowQuickStartOpen={writeMenuSections.nowQuickStart}
              nowShareOpen={writeMenuSections.nowShare}
              {aiInput}
              {aiError}
              {aiQuestionText}
              {aiLoading}
              aiPromptMode={sessionAiPromptMode}
              aiLastResponse={sessionAiLastResponse}
              startTimeValue={fmtHM(s.startMin)}
              endTimeValue={fmtHM(s.startMin + totalMin())}
              totalMinutesValue={totalMin()}
              minTotalMinutes={s.blocks.length * 2}
              {endMode}
	              actionLabel="Kör!"
              actionHint={planActionHint}
              saveStatusLabel={activePanelStatusLabel}
              canRevert={canRevertPanel}
              showTitleHelp={helpVisible(sessionTitleHelpOpen)}
              showPartsHelp={helpVisible(sessionPartsHelpOpen)}
              targetDateLabel={targetDateLabel}
              sourceLabel={selectedAgendaSourceLabel}
              sourceHelp={selectedAgendaSourceHelp}
              {shareCopyText}
              {activeShareUrl}
              {sessionShareUrl}
              {dayShareUrl}
              sessionShareDisabled={!selectedAgendaDetails}
              isCopyingActive={shareCopyTargetKey === ACTIVE_SHARE_KEY}
              isCopyingSession={!!currentSessionShareKey && shareCopyTargetKey === currentSessionShareKey}
              isCopyingDay={!!currentDayShareKey && shareCopyTargetKey === currentDayShareKey}
              onTitleInput={(value) => {
                s.dayTitle = value;
                syncTimerToAgenda();
                appState.persist();
	                notifyPanelMutation('now');
              }}
              onPartsInput={handlePartsInput}
              onPartsKeyDown={handlePartsKeyDown}
              onCopyPrompt={() => {
                navigator.clipboard.writeText(currentAiPrompt).then(() => {
                  copyBtnText = '✓ Kopierad';
                  setTimeout(() => { copyBtnText = 'AI-prompt'; }, 1500);
                });
              }}
              canUsePartsFallback={partsDraftDirty}
              onToggleAiPanel={() => {
                const nextOpen = !aiPanelOpen;
                setWriteMenuSection('sessionAi', nextOpen);
                if (nextOpen) agendaAiOpen = false;
              }}
              onAiInputChange={(value) => aiInput = value}
              onRunAi={runAiParts}
              onRunAiWithText={(text) => { aiInput = text; runAiParts(); }}
              aiFlexibilityLevel={sessionAiFlexibilityLevel}
              onFlexibilityChange={(level) => {
                sessionAiFlexibilityLevel = level;
                sessionAiPromptMode = flexibilityToModes(level).agendaPromptMode;
                aiQuestionText = '';
                sessionAiConversationSeed = '';
              }}
              onAction={() => {
                if (s.blocks.length === 0 || totalMin() <= 0) {
                  showToast('Lägg till minst en aktivitet först');
                  return;
                }
	                const d = new Date();
	                s.startMin = d.getHours() * 60 + d.getMinutes();
                warnedSet.clear(); updateTimeFeedback();
                const f = flowFromCurrentSession();
                addFlowToAgendaToday(f, true, sessionAgendaMeta());
                lastAutoLoadKey = `${f.startMin}-${totalFlowMinutes(f)}-${f.title}-${f.parts.length}`;
                capturePanelBaseline('now');
                partsDraftDirty = false;
                notifyPanelMutation('now');
                if (hasSyncSession()) void syncSave();
              }}
              onCreateNew={() => {
                if (s.blocks.length === 0 || totalMin() <= 0) {
                  showToast('Lägg till minst en aktivitet först');
                  return;
                }
                const targetDate = selectedDay?.date ?? activeAgendaDate() ?? localDateISO();
                addFlowToAgendaDate(targetDate, flowFromCurrentSession(), true, sessionAgendaMeta());
                planSelectionExplicit = true;
                capturePanelBaseline('plan');
                partsDraftDirty = false;
                notifyPanelMutation('plan');
                appState.persist();
                if (hasSyncSession()) void syncSave();
              }}
              onStartTimeInput={(value) => {
                const [h, m] = value.split(':').map(Number);
                if (isNaN(h) || isNaN(m)) return;
                s.startMin = h * 60 + m; warnedSet.clear();
                updateTimeFeedback();
	                syncTimerToAgenda(); appState.persist(); notifyPanelMutation('now');
              }}
              onEndTimeInput={(value) => {
                const [h, m] = value.split(':').map(Number);
                if (isNaN(h) || isNaN(m)) return;
                let end = h * 60 + m;
                if (end <= s.startMin) end += 24 * 60;
                const diff = end - s.startMin;
                if (diff < s.blocks.length * 2) return;
                scaleMinutesTo(diff);
                updateTimeFeedback();
                syncTimerToAgenda(); appState.persist();
	                notifyPanelMutation('now');
              }}
              onTotalMinutesInput={(value) => {
                if (!value || value < s.blocks.length * 2) return;
                scaleMinutesTo(value);
                updateTimeFeedback();
                syncTimerToAgenda(); appState.persist();
	                notifyPanelMutation('now');
              }}
	              onEndModeChange={(mode) => { endMode = mode; s.endMode = mode; appState.persist(); notifyPanelMutation('now'); }}
              onRevert={revertActivePanel}
              onToggleTitleHelp={() => sessionTitleHelpOpen = toggleHelpOverride(sessionTitleHelpOpen)}
              onTogglePartsHelp={() => sessionPartsHelpOpen = toggleHelpOverride(sessionPartsHelpOpen)}
              {quickStartTitle}
              {quickStartText}
              onQuickStartTitleInput={(value) => { quickStartTitle = value; }}
              onQuickStartTextInput={(value) => { quickStartText = value; }}
              onQuickStart={startQuickNowSession}
              onCopyActiveShare={() => copyShareLinkForKey(ACTIVE_SHARE_KEY)}
              onCopySessionShare={() => currentSessionShareKey && copyShareLinkForKey(currentSessionShareKey)}
              onCopyDayShare={() => currentDayShareKey && copyShareLinkForKey(currentDayShareKey)}
              onStopActiveShare={() => stopSharingByKey(ACTIVE_SHARE_KEY)}
              onStopSessionShare={() => currentSessionShareKey && stopSharingByKey(currentSessionShareKey)}
              onStopDayShare={() => currentDayShareKey && stopSharingByKey(currentDayShareKey)}
              onStartLiveShare={() => startSharing('active-session-live')}
              onSaveFlow={saveFlow}
              onStartSessionShare={() => startSharing('selected-session-snapshot')}
              onStartDayShare={() => startSharing('selected-day-snapshot')}
              {suggestedDuration}
              onApplySuggestedDuration={(mins) => {
                if (mins < s.blocks.length * 2) return;
                scaleMinutesTo(mins);
                updateTimeFeedback();
                syncTimerToAgenda(); appState.persist();
	                notifyPanelMutation('now');
              }}
              onTogglePlanShare={() => setWriteMenuSection('planShare', !writeMenuSections.planShare)}
              onToggleNowMain={() => setWriteMenuSection('nowMain', !writeMenuSections.nowMain)}
              onToggleNowQuickStart={() => setWriteMenuSection('nowQuickStart', !writeMenuSections.nowQuickStart)}
              onToggleNowShare={() => setWriteMenuSection('nowShare', !writeMenuSections.nowShare)}
              whisperApiKey={aiConfig.whisperKey}
            />
          </div>
        {:else if activeSection === 'library'}
          <div in:fade={{ duration: 150 }}>
            <LibraryPanel
              savedFlowMsg={savedFlowMsg}
              flows={s.flows}
              flowsOpen={flowsOpen}
              {describeFlow}
              {formatLastUsed}
              onSaveFlow={saveFlow}
              onToggleFlows={() => flowsOpen = !flowsOpen}
              onLoadFlow={(id) => loadFlow(id, selectedDay?.date ? 'plan' : 'now')}
              onAddToAgenda={addTemplateToSelectedAgendaDate}
              onDeleteFlow={deleteFlow}
            />
          </div>
        {:else if activeSection === 'workspace'}
          <div in:fade={{ duration: 150 }}>
            <WorkspacePanel
              userLevel={effectiveUserLevel}
              onUpgrade={upgradeLevel}
              {loggedInUser}

              {syncStatusText}
              {syncStatusError}
              {syncProbeText}
              {syncProbeState}
              {workspaceSnapshots}
              {workspaceSnapshotsLoading}
              {loginName}
              {loginPass}
              aiProvider={aiConfig.provider}
              aiProviderLabels={AI_PROVIDER_LABELS}
              aiKeyPlaceholders={AI_KEY_PLACEHOLDERS}
              aiApiKey={aiApiKey}
              aiRememberApiKey={aiConfig.rememberApiKey}
              aiKeyVisible={aiKeyVisible}
              aiBaseUrl={aiConfig.baseUrl}
              aiCustomModel={aiConfig.customModel}
              syncReady={!!loggedInUser}
              aiReady={!!aiApiKey}
              showHelpHints={s.showHelpHints}
              confirmedActualCount={confirmedActualCount}
              pendingActualCount={pendingActualEntries.length}
              reliabilityPercent={reliabilityPercent}
              reliabilityLevel={reliabilityLevel}
              reliabilityHint={reliabilityHint}
              timeDataOpen={workspaceTimeDataOpen}
              onToggleTimeData={() => workspaceTimeDataOpen = !workspaceTimeDataOpen}
              onLogout={logout}
              onSyncLoad={syncLoad}
              onSyncSave={syncSave}
              onLoadSnapshots={loadWorkspaceSnapshots}
              onRestoreSnapshot={restoreWorkspaceSnapshot}
              onLogin={login}
              onLoginNameChange={(value) => loginName = value}
              onLoginPassChange={(value) => loginPass = value}
              onToggleHelpHints={() => { s.showHelpHints = !s.showHelpHints; appState.persist(); }}
              onProviderChange={(value) => { aiConfig.provider = value as AiProvider; aiKeyVisible = false; saveAiConfig(); }}
              onToggleAiKeyVisible={() => aiKeyVisible = !aiKeyVisible}
              onClearAiConfig={clearAiConfig}
              onAiApiKeyChange={(value) => { aiConfig.apiKey = value; saveAiConfig(); }}
              onAiRememberApiKeyChange={(value) => { aiConfig.rememberApiKey = value; saveAiConfig(); }}
              onAiBaseUrlChange={(value) => { aiConfig.baseUrl = value; saveAiConfig(); }}
              onAiCustomModelChange={(value) => { aiConfig.customModel = value; saveAiConfig(); }}
              whisperKey={aiConfig.whisperKey}
              onWhisperKeyChange={(value) => { aiConfig.whisperKey = value; saveAiConfig(); }}
            />
          </div>
        {:else if activeSection === 'admin'}
          <div in:fade={{ duration: 150 }}>
            <AdminPanel
              {adminPassword}
              onGenerateInvite={generateInvite}
              {inviteCodeResult}
            />
          </div>
        {/if}

	        {#if activeSection === 'plan'}
	          <div class="menu-blob menu-blob--planner" in:fade={{ duration: 150 }}>
	            <div class="planner-menu-workspace">
	              <div class="planner-menu-main">
	                <AgendaImportPanel
	              {agendaInputOpen}
	              {agendaDraft}
	              agendaDraftSource={agendaDraftDirty ? agendaDraftSource : 'manual'}
              draftStatus={agendaDraftStatus}
              selectedDateLabel={selectedDay?.date ? fmtAgendaDate(selectedDay.date) : 'Odaterad dag'}
              {savedAgendaMsg}
              hasAiKey={!!aiApiKey}
              {agendaAiOpen}
              {agendaAiInput}
              {agendaAiPromptMode}
              aiLastResponse={agendaAiLastResponse}
              {agendaAiError}
              {agendaAiQuestionText}
              {agendaAiLoading}
              showImportHelp={helpVisible(agendaImportHelpOpen)}
              aiFlexibilityLevel={agendaAiFlexibilityLevel}
              isRecordingAgendaAi={agendaAiRecording}
              onToggleOpen={() => setWriteMenuSection('agenda', !agendaInputOpen)}
              onDraftChange={(value) => { agendaDraft = value; agendaDraftDirty = true; agendaDraftDate = selectedDay?.date ?? activeAgendaDate() ?? localDateISO(); }}
              onSave={saveAgenda}
              onCopyPrompt={async (type) => {
                const prompt = getAiAgendaPrompt(type, localDateISO());
                await navigator.clipboard.writeText(prompt);
              }}
              onToggleAi={() => {
                agendaAiOpen = !agendaAiOpen;
                if (agendaAiOpen) setWriteMenuSection('sessionAi', false);
              }}
              onAgendaAiInputChange={(value) => agendaAiInput = value}
              onRunAi={runAiAgenda}
              onToggleImportHelp={() => agendaImportHelpOpen = toggleHelpOverride(agendaImportHelpOpen)}
              onFlexibilityChange={(level) => {
                agendaAiFlexibilityLevel = level;
                agendaAiPromptMode = flexibilityToModes(level).agendaPromptMode;
                agendaAiQuestionText = '';
                agendaAiConversationSeed = '';
              }}
	              onToggleAgendaVoice={toggleAgendaVoice}
	              onUnifiedUpload={handleUnifiedUpload}
	            />
	              </div>
	              <div class="planner-menu-side">
	                <SessionEditorPanel
	                  userLevel={effectiveUserLevel}
	                  aiProvider={aiConfig.provider}
	                  aiApiKey={aiConfig.apiKey}
	                  mode={activeSection}
	                  hasSelection={!!selectedAgendaDetails && planSelectionExplicit}
	                  savedFlowMsg={savedFlowMsg}
	                  titleValue={s.dayTitle}
	                  partsValue={partsFieldValue}
	                  {copyBtnText}
	                  {partsFeedbackText}
	                  {timeFeedbackText}
	                  hasAiKey={!!aiApiKey}
	                  {aiPanelOpen}
	                  planShareOpen={writeMenuSections.planShare}
	                  nowMainOpen={writeMenuSections.nowMain}
	                  nowQuickStartOpen={writeMenuSections.nowQuickStart}
	                  nowShareOpen={writeMenuSections.nowShare}
	                  {aiInput}
	                  {aiError}
	                  {aiQuestionText}
	                  {aiLoading}
	                  aiPromptMode={sessionAiPromptMode}
	                  aiLastResponse={sessionAiLastResponse}
	                  startTimeValue={fmtHM(s.startMin)}
	                  endTimeValue={fmtHM(s.startMin + totalMin())}
	                  totalMinutesValue={totalMin()}
	                  minTotalMinutes={s.blocks.length * 2}
	                  {endMode}
	                  actionLabel={selectedAgendaDetails && planSelectionExplicit ? 'Klar' : 'Lägg till i dagplan'}
	                  actionHint={planActionHint}
	                  saveStatusLabel={activePanelStatusLabel}
	                  canRevert={canRevertPanel}
	                  showTitleHelp={helpVisible(sessionTitleHelpOpen)}
	                  showPartsHelp={helpVisible(sessionPartsHelpOpen)}
	                  targetDateLabel={targetDateLabel}
	                  sourceLabel={selectedAgendaSourceLabel}
	                  sourceHelp={selectedAgendaSourceHelp}
	                  {shareCopyText}
	                  {activeShareUrl}
	                  {sessionShareUrl}
	                  {dayShareUrl}
	                  sessionShareDisabled={!selectedAgendaDetails}
	                  isCopyingActive={shareCopyTargetKey === ACTIVE_SHARE_KEY}
	                  isCopyingSession={!!currentSessionShareKey && shareCopyTargetKey === currentSessionShareKey}
	                  isCopyingDay={!!currentDayShareKey && shareCopyTargetKey === currentDayShareKey}
	                  onTitleInput={(value) => {
	                    s.dayTitle = value;
	                    syncTimerToAgenda();
	                    appState.persist();
	                    notifyPanelMutation('plan');
	                  }}
	                  onPartsInput={handlePartsInput}
	                  onPartsKeyDown={handlePartsKeyDown}
	                  onCopyPrompt={() => {
	                    navigator.clipboard.writeText(currentAiPrompt).then(() => {
	                      copyBtnText = '✓ Kopierad';
	                      setTimeout(() => { copyBtnText = 'AI-prompt'; }, 1500);
	                    });
	                  }}
	                  canUsePartsFallback={partsDraftDirty}
	                  onToggleAiPanel={() => {
	                    const nextOpen = !aiPanelOpen;
	                    setWriteMenuSection('sessionAi', nextOpen);
	                    if (nextOpen) agendaAiOpen = false;
	                  }}
	                  onAiInputChange={(value) => aiInput = value}
	                  onRunAi={runAiParts}
	                  onRunAiWithText={(text) => { aiInput = text; runAiParts(); }}
	                  aiFlexibilityLevel={sessionAiFlexibilityLevel}
	                  onFlexibilityChange={(level) => {
	                    sessionAiFlexibilityLevel = level;
	                    sessionAiPromptMode = flexibilityToModes(level).agendaPromptMode;
	                    aiQuestionText = '';
	                    sessionAiConversationSeed = '';
	                  }}
	                  onAction={() => {
	                    if (s.blocks.length === 0 || totalMin() <= 0) {
	                      showToast('Lägg till minst en aktivitet först');
	                      return;
	                    }
	                    if (selectedAgendaDetails && planSelectionExplicit) {
	                      syncTimerToAgenda(true);
	                    } else {
	                      const targetDate = selectedDay?.date ?? activeAgendaDate() ?? localDateISO();
	                      addFlowToAgendaDate(targetDate, flowFromCurrentSession(), true, sessionAgendaMeta());
	                      planSelectionExplicit = true;
	                    }
	                    capturePanelBaseline('plan');
	                    partsDraftDirty = false;
	                    notifyPanelMutation('plan');
	                    appState.persist();
	                    if (hasSyncSession()) void syncSave();
	                  }}
	                  onCreateNew={() => {
	                    if (s.blocks.length === 0 || totalMin() <= 0) {
	                      showToast('Lägg till minst en aktivitet först');
	                      return;
	                    }
	                    const targetDate = selectedDay?.date ?? activeAgendaDate() ?? localDateISO();
	                    addFlowToAgendaDate(targetDate, flowFromCurrentSession(), true, sessionAgendaMeta());
	                    planSelectionExplicit = true;
	                    capturePanelBaseline('plan');
	                    partsDraftDirty = false;
	                    notifyPanelMutation('plan');
	                    appState.persist();
	                    if (hasSyncSession()) void syncSave();
	                  }}
	                  onStartTimeInput={(value) => {
	                    const [h, m] = value.split(':').map(Number);
	                    if (isNaN(h) || isNaN(m)) return;
	                    s.startMin = h * 60 + m; warnedSet.clear();
	                    updateTimeFeedback();
	                    syncTimerToAgenda(); appState.persist(); notifyPanelMutation('plan');
	                  }}
	                  onEndTimeInput={(value) => {
	                    const [h, m] = value.split(':').map(Number);
	                    if (isNaN(h) || isNaN(m)) return;
	                    let end = h * 60 + m;
	                    if (end <= s.startMin) end += 24 * 60;
	                    const diff = end - s.startMin;
	                    if (diff < s.blocks.length * 2) return;
	                    scaleMinutesTo(diff);
	                    updateTimeFeedback();
	                    syncTimerToAgenda(); appState.persist();
	                    notifyPanelMutation('plan');
	                  }}
	                  onTotalMinutesInput={(value) => {
	                    if (!value || value < s.blocks.length * 2) return;
	                    scaleMinutesTo(value);
	                    updateTimeFeedback();
	                    syncTimerToAgenda(); appState.persist();
	                    notifyPanelMutation('plan');
	                  }}
	                  onEndModeChange={(mode) => { endMode = mode; s.endMode = mode; appState.persist(); notifyPanelMutation('plan'); }}
	                  onRevert={revertActivePanel}
	                  onToggleTitleHelp={() => sessionTitleHelpOpen = toggleHelpOverride(sessionTitleHelpOpen)}
	                  onTogglePartsHelp={() => sessionPartsHelpOpen = toggleHelpOverride(sessionPartsHelpOpen)}
	                  {quickStartTitle}
	                  {quickStartText}
	                  onQuickStartTitleInput={(value) => { quickStartTitle = value; }}
	                  onQuickStartTextInput={(value) => { quickStartText = value; }}
	                  onQuickStart={startQuickNowSession}
	                  onCopyActiveShare={() => copyShareLinkForKey(ACTIVE_SHARE_KEY)}
	                  onCopySessionShare={() => currentSessionShareKey && copyShareLinkForKey(currentSessionShareKey)}
	                  onCopyDayShare={() => currentDayShareKey && copyShareLinkForKey(currentDayShareKey)}
	                  onStopActiveShare={() => stopSharingByKey(ACTIVE_SHARE_KEY)}
	                  onStopSessionShare={() => currentSessionShareKey && stopSharingByKey(currentSessionShareKey)}
	                  onStopDayShare={() => currentDayShareKey && stopSharingByKey(currentDayShareKey)}
	                  onStartLiveShare={() => startSharing('active-session-live')}
	                  onSaveFlow={saveFlow}
	                  onStartSessionShare={() => startSharing('selected-session-snapshot')}
	                  onStartDayShare={() => startSharing('selected-day-snapshot')}
	                  {suggestedDuration}
	                  onApplySuggestedDuration={(mins) => {
	                    if (mins < s.blocks.length * 2) return;
	                    scaleMinutesTo(mins);
	                    updateTimeFeedback();
	                    syncTimerToAgenda(); appState.persist();
	                    notifyPanelMutation('plan');
	                  }}
	                  onTogglePlanShare={() => setWriteMenuSection('planShare', !writeMenuSections.planShare)}
	                  onToggleNowMain={() => setWriteMenuSection('nowMain', !writeMenuSections.nowMain)}
	                  onToggleNowQuickStart={() => setWriteMenuSection('nowQuickStart', !writeMenuSections.nowQuickStart)}
	                  onToggleNowShare={() => setWriteMenuSection('nowShare', !writeMenuSections.nowShare)}
	                  whisperApiKey={aiConfig.whisperKey}
	                />
	              </div>
	            </div>
	          </div>
	        {/if}
        </div>
      {/if}
      </div>
    </div>
  </main>

  <div class="resize-handle-ag" role="separator" aria-orientation="vertical" onpointerdown={startAgendaResize}></div>
  <AgendaPanel
    selectedFlowId={(activeSection === 'plan' && planSelectionExplicit && selectedAgendaDetails) ? selectedAgendaDetails.flow.id : null}
    {sectorColors}
    {isViewMode}
    runMode={locked && !miniMenuOpen}
    {selectedDay}
    {agendaDays}
    {selectedDayIdx}
    {agendaItems}
    {agendaLayout}
    {overlayItems}
    {agendaMoveState}
    {nowMinLive}
    {agendaDragMoved}
    {calendarCells}
    agendaDimPast={s.agendaDimPast}
    {activeAgendaDate}
    {selectAgendaDate}
    {prevDay}
    {nextDay}
    {loadAgendaFlow}
    {loadFlow}
    {startAgendaMove}
    {deleteAgendaItem}
    {startAgendaDrag}
    {schoolPrimary}
    onSetActiveSection={setActiveSection}
    onRenameAgendaItem={renameAgendaItem}
    onAddAgendaItem={addAgendaItemToSelectedDay}
    bind:agendaEl
    bind:timelineEl
    bind:agendaCalendarOpen
    bind:calendarMonthCursor
  />

  <button id="agenda-toggle-btn" class="agenda-toggle-btn" onclick={toggleAgenda} title="Dagagenda">
    {s.agendaOpen ? '›' : '‹'}
  </button>

  <nav class="mobile-tabs">
    <button class:active={activeSection === 'now' && mobileTab === 'now'} onclick={goToTimerNow}>
      <span>◷</span> Nu
    </button>
    <button class:active={activeSection === 'plan' && mobileTab === 'plan'} onclick={openPlan}>
      <span>▦</span> Planera
    </button>
    <button class:active={activeSection === 'library'} onclick={() => setActiveSection('library')}>
      <span>⌘</span> Bibliotek
    </button>
    <button class:active={activeSection === 'workspace'} onclick={() => setActiveSection('workspace')}>
      <span>⋯</span> Konto
    </button>
  </nav>
</div>

<div class="flash" bind:this={flashEl}></div>

<div class="help-modal" class:open={helpOpen}
  role="button"
  tabindex="0"
  onclick={(e) => { if ((e.target as Element).classList.contains('help-modal')) helpOpen = false; }}
  onkeydown={(e) => {
    if ((e.key === 'Enter' || e.key === ' ') && (e.target as Element).classList.contains('help-modal')) {
      e.preventDefault();
      helpOpen = false;
    }
  }}>
  <div class="help-card">
    <button class="help-close" onclick={() => helpOpen = false} title="Stäng">×</button>
    <h2 style="margin-bottom: 8px; color: var(--accent); display: flex; align-items: center; gap: 10px;">
      Day Timer Manual
      <span style="font-size: 10px; background: var(--accent); color: white; padding: 2px 6px; border-radius: 4px; vertical-align: middle; font-weight: 800; letter-spacing: 0.5px;">BETA</span>
    </h2>
    <p class="help-foot" style="margin-bottom: 24px; opacity: 0.8;">Allt du behöver veta för att bemästra din tid.</p>

    <div class="help-grid">
      <!-- Column 1 -->
      <div class="help-column">
        <h3>🚀 Arbetsflöden</h3>
        <div class="help-box">
          <strong>Nu-läget</strong>: Din snabbväg. Skriv in rubrik och aktiviteter och klicka "Kör!". Timern startar direkt från aktuell klocktid. Perfekt för spontana lektionsmoment.<br/><br/>
          <strong>Planera</strong>: Din arbetsbänk. Här förbereder du pass för framtiden. Välj en dag i kalendern, lägg till innehåll och spara. Detta rör aldrig din aktiva timer.
        </div>

        <h3>📝 Format & Aktiviteter</h3>
        <p>Skriv en aktivitet per rad i det stora fältet. Appen fördelar tiden automatiskt om du inte anger annat.</p>
        <div class="help-box">
          <code>Genomgång 10m</code> — Låser tiden till 10 min.<br/>
          <code>Eget arbete</code> — Tar upp resterande tid.<br/>
          <code>- instruktion</code> — Skapar en underpunkt (instruktionstext) som syns i sidopanelen.<br/>
          <code>&amp; kommentar</code> — Lägger kommentaren under senaste aktiviteten.<br/>
          <code>&amp;&amp; kommentar</code> — Skapar en stor inforuta längst ner i passet.
        </div>

        <h3>⌨️ Genvägar</h3>
        <ul class="help-list">
          <li><code>n</code> / <code>p</code> — Växla mellan Nu och Planera.</li>
          <li><code>b</code> / <code>k</code> — Öppna Bibliotek eller Konto.</li>
          <li><code>i</code> — Toggla alla förklarande hjälprutor i appen.</li>
          <li><code>Tab</code> — När du skriver aktiviteter: Skapar en ny rad med <code>-</code> direkt.</li>
          <li><code>Alt+Shift+R</code> — Totalt återställning.</li>
        </ul>
      </div>

      <!-- Column 2 -->
      <div class="help-column">
        <h3>Agendan & Kalendern</h3>
        <p>Öppna agendan med pilen <span class="ico">▷</span> till höger om klockan.</p>
        <div class="help-box">
          <strong>Tidslinjen</strong>: Här ser du hela dagen. Du kan dra i blocken för att justera deras tid eller flytta dem i ordningen.<br/><br/>
          <strong>Dagtext</strong>: Det kraftfullaste sättet att planera. Skriv <code>@260517</code> för datum och <code>#Rubrik</code> för att snabbt bygga hela dagar med text.
        </div>

        <h3>AI & Smart Import</h3>
        <div class="help-box">
          <strong>Prompter</strong>: Vi har färdiga prompter för Gemini/ChatGPT. Kopiera dem för att be AI:n konvertera röriga anteckningar eller Google Kalender-data till Day Timer-format.<br/><br/>
          <strong>AI-planering</strong>: Har du en egen API-nyckel? Använd den inbyggda AI-panelen i editorn för att generera hela pass från en enkel beskrivning.
        </div>

        <h3>🌐 Dela & Synka</h3>
        <ul class="help-list">
          <li><strong>Live-delning</strong>: Skapa en länk så kan eleverna följa din aktiva klocka på sina egna skärmar i realtid.</li>
          <li><strong>Konto</strong>: Logga in för att automatiskt synka dina mallar och dagplaner mellan din dator, iPad och telefon.</li>
        </ul>
      </div>
    </div>

    <div class="help-footer-actions">
      <button class="quickstart" style="background:var(--accent); color:white; font-weight: 700; padding: 12px 24px;" onclick={() => { helpOpen = false; s.onboardingStep = 1; }}>
        Starta den interaktiva guiden
      </button>
      <div style="text-align: center;">
        <p class="help-foot">Klockan följer alltid faktiskt klocktid.</p>
        <p class="help-foot">Frågor eller feedback? <a href="mailto:timer@ximon.se">timer@ximon.se</a></p>
      </div>
    </div>
  </div>
</div>

{#if s.firstVisit}
  <div class="welcome-overlay" in:fade={{ duration: 400 }}>
    <div class="welcome-card" in:fly={{ y: 20, duration: 500, delay: 200 }}>
      <div style="position: absolute; top: 20px; right: 24px; font-size: 10px; background: var(--accent); color: white; padding: 2px 8px; border-radius: 6px; font-weight: 900; letter-spacing: 1px; opacity: 0.9;">BETA</div>
      <h1>Hej!</h1>
      <p>Det här är Day Timer — ett verktyg för att visualisera tid och planera dina pass snyggt och enkelt.</p>
      
      <div style="display:flex; flex-direction:column; gap:12px; margin-top:24px;">
        <button class="quickstart" style="background:var(--accent); color:white; justify-content:center;" 
          onclick={() => { s.firstVisit = false; s.onboardingStep = 1; appState.persist(); }}>
          Visa hur det funkar (30 sek)
        </button>
        <button class="quickstart quickstart-subtle" style="justify-content:center;" 
          onclick={() => { s.firstVisit = false; appState.persist(); }}>
          Jag fattar, kör igång!
        </button>
      </div>

      <div style="margin-top: 32px; text-align: left; font-size: 13px; line-height: 1.6; opacity: 0.85; border-top: 1px solid var(--menu-border); padding-top: 24px;">
        <p style="margin-bottom: 12px;">Den här timern är lika mycket ett verktyg för dig som planerar andras dag som för dig som behöver hjälp att planera din egen.</p>
        <p style="margin-bottom: 12px;">Att göra tid synlig – som utrymme med tydlig progress och historik – är inte bara intuitivt. Det bygger på forskning om hur hjärnan hanterar tid, motivation och självreglering.</p>
        <p>Starta direkt – ingen inloggning, inget krångel. När du är redo finns schemaläggning för hela dagar och veckor, med synk mot din kalender. Och för den som vill ha hjälp att planera finns AI-stöd – med din egen nyckel eller via de verktyg du redan använder.</p>
        <p style="margin-top: 16px; font-weight: 600; opacity: 0.9;">/Simon</p>
        <p style="margin-top: 24px; font-size: 11px; opacity: 0.5;">Ifall du hittar buggar kan du mejla <a href="mailto:timer@ximon.se" style="color: inherit; text-decoration: underline;">timer@ximon.se</a></p>
      </div>
    </div>
  </div>
{/if}

  {#if toastMsg}
    {#key toastMsg}
      <div class="toast-pill">{toastMsg}</div>
    {/key}
  {/if}

  <OnboardingTour
    step={s.onboardingStep}
    onNext={() => {
      s.onboardingStep++;
      if (s.onboardingStep > 16) s.onboardingStep = 0;
      appState.persist();
    }}
    onBack={() => {
      s.onboardingStep--;
      if (s.onboardingStep < 1) s.onboardingStep = 1;
      appState.persist();
    }}
    onLoadDummy={() => {}}
    onExit={() => {
      s.onboardingStep = 0;
      appState.persist();
    }}
  />
