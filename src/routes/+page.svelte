<script lang="ts">
  import AgendaPanel from '$lib/components/AgendaPanel.svelte';
  
  import { onMount, untrack } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { appState, uid, type ActualTimeEntry, type AgendaFlowMeta, type AppSection, type Block, type EditorDraft, type Flow } from '$lib/state.svelte.js';
  import { clockTheme, labelColorFor } from '$lib/theme.js';
  import { CX, CY, R, Ri, polar, arcPath, nowMinutes, fmtHM, truncate } from '$lib/clock.js';
  import { localDateISO, parseIsoDate, monthKey, shiftMonth, fmtAgendaDate, monthLabel } from '$lib/date.js';
  import { parseParts, serializeBlocks, parseAgenda, serializeAgenda, totalFlowMinutes, mergeAgendaDayData, type AgendaDay } from '$lib/parse.js';
  import {
    agendaMetaHelp,
    agendaMetaLabel,
    agendaMetaSignature,
    buildAgendaItemsForDay,
    buildCalendarCells,
    buildSequentialTimeline,
    cloneAgendaDay,
    computeAgendaDensity,
    insertFlowIntoAgendaDate,
    findAgendaItemForTime,
    makeAgendaFlowRef,
    makeAgendaMetaKeyForFlow,
    makeAgendaMetaKeyForRef,
    moveAgendaMeta,
    rebuildAgendaMetaForDay,
    replaceAgendaFlowInDays,
    resolveAgendaFlowRef,
    serializeSelectedAgendaDay,
    suggestedStartMinForDate,
    type AgendaFlowRef,
    type CalendarCell
  } from '$lib/agenda.js';
  import { icsEventsToAgendaDays, parseIcsEvents, type IcsEvent } from '$lib/ics.js';
  import { AI_PROMPT_PARTS, getAiPromptAgenda, requestAiPlan, DEFAULT_AI_CONFIG, loadAiConfig, persistAiConfig, clearStoredAiConfig, type AiProvider, type AiPlanMode, type AiConfig } from '$lib/ai.js';
  import { createShareTokens, deriveSyncToken, validateSyncToken } from '$lib/security.js';
  import { clickOutside } from '$lib/actions.js';
  import { readSessionValue, writeSessionValue, removeSessionValue } from '$lib/storage.js';
  import { applyDayTextHeuristic, computeRecommendation, inferSubjectCategory } from '$lib/learning.js';
  import {
    makeActualEntryId,
    upsertActualEntry,
    finalizeUnconfirmedForDate,
    confirmActualEntry,
    deleteActualEntry,
    exportActualHistoryJsonl
  } from '$lib/actuals.js';
  import { createCurrentFallbackSession, createSessionStateFromFlow, makeFlowFromSession, type SessionFromFlowOptions } from '$lib/session.js';
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
  let agendaInputOpen = $state(true);
  let agendaCalendarOpen = $state(true);
  let savedAgendaMsg = $state('');
  let savedFlowMsg = $state('');
  let copyAgendaPromptText = $state('AI-prompt');
  let workspaceAutosaveTimer: ReturnType<typeof setTimeout> | null = null;
  let agendaDragState = $state<{ i: number; dayIdx: number; startY: number; startMinA: number; blockStart: number; blockEnd: number; clampMin: number; clampMax: number; edge: 'top' | 'bottom'; containerH: number } | null>(null);
  let agendaMoveState = $state<{ dayIdx: number; flowIdx: number; startY: number; currentY: number; targetIdx: number; previewStart: number | null; previewValid: boolean } | null>(null);
  let planSelectionExplicit = $state(false);
  let partsDraft = $state('');
  let partsDraftDirty = $state(false);
  let activeAgendaFlowRef = $state<AgendaFlowRef | null>(null);
  type SessionSource =
    | { kind: 'unscheduled' }
    | { kind: 'template'; templateId: string; title: string }
    | { kind: 'agenda'; date: string | null; title: string; startMin: number };
  let sessionSource = $state<SessionSource>({ kind: 'unscheduled' });
  let agendaDragMoved = $state(false);
  let agendaEl = $state<HTMLElement>(null!);
  let timelineEl = $state<HTMLElement>(null!);
  let agendaDraft = $state('');
  let agendaDraftDate = $state<string | null>(null);
  let agendaDraftDirty = $state(false);
  let icsDraft = $state('');
  let icsImportOpen = $state(false);
  let icsPreviewEvents = $state<IcsEvent[]>([]);
  let icsPreviewSummary = $state('');
  let icsImportError = $state('');
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
  let lastAutoLoadKey = $state('');
  let mobileTab = $state<AppSection>('now');
  let showAgendaOverlay = $state(typeof window !== 'undefined' ? window.innerWidth > 980 : true);
  let nowText = $state('--:--');
  let leftText = $state('');
  let flowsOpen = $state(false);
  let miniMenuOpen = $state(true);
  let themePickerOpen = $state(false);
  let optionsMenuOpen = $state(false);
  let helpOpen = $state(false);
  type HelpOverride = 'inherit' | 'show' | 'hide';
  let sessionTitleHelpOpen = $state<HelpOverride>('inherit');
  let sessionPartsHelpOpen = $state<HelpOverride>('inherit');
  let sessionTimeHelpOpen = $state<HelpOverride>('inherit');
  let planSourceHelpOpen = $state<HelpOverride>('inherit');
  let agendaImportHelpOpen = $state<HelpOverride>('inherit');
  let agendaIcsHelpOpen = $state<HelpOverride>('inherit');
  let agendaOverviewHelpOpen = $state<HelpOverride>('inherit');
  let copyBtnText = $state('AI-prompt');
  let nowTemplateSelection = $state('');
  let planTemplateSelection = $state('');
  let syncStatusText = $state('');
  let syncStatusError = $state(false);
  let endMode = $state<'end' | 'len'>(s.endMode ?? 'end');

  let aiConfig = $state<AiConfig>({ ...DEFAULT_AI_CONFIG });
  let aiKeyVisible = $state(false);
  let aiPanelOpen = $state(false);
  let aiInput = $state('');
  let aiLoading = $state(false);
  let aiError = $state('');
  let agendaAiInput = $state('');
  let agendaAiLoading = $state(false);
  let agendaAiError = $state('');
  let agendaAiOpen = $state(false);

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
  function activeAgendaDate(): string { return s.agendaDate; }
  function setActiveAgendaText(v: string) { if (schoolPrimary()) s.agendaText = v; else s.agendaText2 = v; }
  function setActiveAgendaDate(v: string) { s.agendaDate = v; }
  function hasOverlay() { return false; }

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
    return agendaDraftDirty ? 'Ej sparat ännu' : 'Synkat med vald dag';
  });

  const sectionCopy = $derived.by(() => {
    if (s.activeSection === 'now') return 'Kör det som händer nu utan planeringsbrus.';
    if (s.activeSection === 'plan') return '';
    if (s.activeSection === 'library') return 'Spara och återanvänd mallar utan att blanda ihop dem med dagens plan.';
    if (s.activeSection === 'admin') return 'Hantera inbjudningar och systemnivåer.';
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
  const activePanelStatus = $derived(s.activeSection === 'plan' ? planPanelStatus : nowPanelStatus);
  const activePanelStatusLabel = $derived.by(() => {
    if (activePanelStatus === 'saving') return 'Sparar...';
    if (activePanelStatus === 'saved') return 'Sparat';
    return s.activeSection === 'plan' ? 'Autospar på. Klicka Spara när blocket känns klart.' : 'Autospar på i den här sessionen.';
  });
  const canRevertPanel = $derived(
    (s.activeSection === 'plan' ? planPanelBaseline : nowPanelBaseline) !== null
  );
  const planActionHint = $derived.by(() =>
    s.activeSection === 'plan'
      ? 'Sparar till den dag som är vald i kalendern utan att snabbstarta timern.'
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
    const oldSection = s.activeSection;
    if (oldSection === section) return;

    if (oldSection === 'now') {
      s.nowDraft = currentEditorDraft();
    } else if (oldSection === 'plan') {
      s.planDraft = currentEditorDraft();
    }

    s.activeSection = section;

    if (section === 'now') {
      applyEditorDraft(s.nowDraft);
    } else if (section === 'plan') {
      applyEditorDraft(s.planDraft);
      s.agendaOpen = true;
      agendaInputOpen = true;
    }

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
    aiPanelOpen = false;
    agendaAiOpen = false;
    icsImportOpen = false;
    flowsOpen = false;
  }

  function toggleMiniMenu() {
    if (miniMenuOpen) {
      closeTransientMenus();
      miniMenuOpen = false;
      return;
    }
    closeTransientMenus();
    miniMenuOpen = true;
    s.showControls = true;
    setActiveSection('now');
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
    });
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
      applyEditorDraft(s.planDraft);
      s.agendaOpen = true;
      agendaInputOpen = true;
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

  function queueWorkspaceAutosave() {
    if (isViewMode || loadingFromCloud || !loggedInUser || !s.syncKey) return;
    if (workspaceAutosaveTimer) clearTimeout(workspaceAutosaveTimer);
    workspaceAutosaveTimer = setTimeout(() => {
      workspaceAutosaveTimer = null;
      void syncSave();
    }, 1500);
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
  function confirmActualEntryLocal(id: string) {
    const { log, changed } = confirmActualEntry(s.actualTimeLog, id);
    if (changed) {
      s.actualTimeLog = log;
      appState.persist();
    }
  }
  function deleteActualEntryLocal(id: string) {
    const { log, changed } = deleteActualEntry(s.actualTimeLog, id);
    if (changed) {
      s.actualTimeLog = log;
      appState.persist();
    }
  }
  async function exportActualHistory() {
    const jsonl = exportActualHistoryJsonl(s.actualTimeLog);
    const blob = new Blob([jsonl], { type: 'application/x-ndjson;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `day-timer-history-${localDateISO()}.jsonl`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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
  function agendaAutoLoadKey(item: { startMin: number; totalMin: number; flow: Flow }) {
    return `${item.startMin}-${item.totalMin}-${item.flow.title}-${item.flow.parts.length}`;
  }

  let warningsOpen = $state(false);
  let workspaceTimeDataOpen = $state(false);
  let actualHistoryOpen = $state(false);

  function syncBodyClasses() {
    const PALETTE_CLASSES = ['sansad','meadow','mlp','bright','clear','psychedelic'];
    document.body.classList.remove(...PALETTE_CLASSES, 'dark', 'sb-collapsed', 'ag-open', 'm-now', 'm-plan', 'm-library', 'm-workspace', 'page-locked');
    if (s.palette) document.body.classList.add(s.palette);
    if (s.dark && s.palette !== 'psychedelic') document.body.classList.add('dark');
    if (s.sbCollapsed) document.body.classList.add('sb-collapsed');
    if (s.agendaOpen) document.body.classList.add('ag-open');
    document.body.classList.add('m-' + mobileTab);
    if (locked) document.body.classList.add('page-locked');
  }

  // ── Drag ──
  type DragState =
    | { type: 'between'; i: number; leftMin: number; rightMin: number }
    | { type: 'end' }
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
    drag = { type: 'between', i, leftMin: s.blocks[i].minutes, rightMin: s.blocks[i+1].minutes };
    window.addEventListener('pointermove', onDrag);
    window.addEventListener('pointerup', endDrag);
  }
  function startEndDrag(pe: PointerEvent) {
    if (isViewMode || locked) return;
    pe.preventDefault();
    drag = { type: 'end' };
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
    const old = totalMin();
    let newMins: number[];
    if (old <= 0) {
      const each = Math.max(2, Math.round(newTotal / s.blocks.length));
      newMins = s.blocks.map(() => each);
    } else {
      const factor = newTotal / old;
      newMins = s.blocks.map(b => Math.max(2, b.minutes * factor));
    }
    newMins = newMins.map(m => Math.round(m));
    const drift = newTotal - newMins.reduce((a,b)=>a+b, 0);
    newMins[newMins.length-1] = Math.max(2, newMins[newMins.length-1] + drift);
    s.blocks.forEach((b, i) => { b.minutes = newMins[i]; });
  }

  function onDrag(e: PointerEvent) {
    if (!drag || locked) return;
    const ang = pointerAngle(e);
    const sa = startAngle();
    let rel = ang - sa;
    while (rel < 0) rel += 360;

    if (drag.type === 'end') {
      let newTotal = (rel / 360) * s.clockSpan;
      const minTotal = s.blocks.length * 2;
      if (newTotal < minTotal) newTotal = minTotal;
      if (newTotal > s.clockSpan) newTotal = s.clockSpan;
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
      if (newTotal > s.clockSpan) { newTotal = s.clockSpan; newStart = drag.endMin0 - newTotal; }
      s.startMin = newStart;
      scaleMinutesTo(newTotal);
       return;
      }

    const targetCumMin = (rel / 360) * s.clockSpan;
    let cumBefore = 0;
    for (let k = 0; k < drag.i; k++) cumBefore += s.blocks[k].minutes;
    let newLeft = targetCumMin - cumBefore;
    const pair = drag.leftMin + drag.rightMin;
    newLeft = Math.max(2, Math.min(pair - 2, newLeft));
    s.blocks[drag.i].minutes = Math.round(newLeft);
    s.blocks[drag.i + 1].minutes = pair - Math.round(newLeft);
    
  }

  function syncTimerToAgenda(forceUpdate = false) {
    if (s.activeSection === 'plan' && !forceUpdate) return;
    const active = resolveAgendaFlowRef(agendaDays, activeAgendaFlowRef);
    if (!active || !agendaDays) return;
    const { dayIdx, flowIdx } = active;
    const oldKey = activeAgendaFlowRef ? makeAgendaMetaKeyForRef(activeAgendaFlowRef) : null;
    const newDays = replaceAgendaFlowInDays(agendaDays, dayIdx, flowIdx, makeFlowFromSession({
      id: active.flow.id,
      title: s.dayTitle,
      blocks: s.blocks,
      extraInfo: s.extraInfo,
      startMin: s.startMin
    }, uid));
    setActiveAgendaText(serializeAgenda(newDays));
    activeAgendaFlowRef = {
      ...activeAgendaFlowRef!,
      title: s.dayTitle,
      startMin: s.startMin,
      totalMin: totalMin(),
      partCount: s.blocks.length
    };
    if (oldKey && activeAgendaFlowRef) s.agendaMeta = moveAgendaMeta(s.agendaMeta, oldKey, makeAgendaMetaKeyForRef(activeAgendaFlowRef));
    partsDraftDirty = false;
    markPlanSaved();
  }

  function endDrag() {
    drag = null;
    window.removeEventListener('pointermove', onDrag);
    window.removeEventListener('pointerup', endDrag);
    syncTimerToAgenda();
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
    
    if (s.activeSection !== 'plan') {
      syncTimerToAgenda();
    }
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
    if (loggedInUser) syncSave();
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
  }

  function addFlowToAgendaToday(f: Flow, activate = false, meta: AgendaFlowMeta | null = null) {
    addFlowToAgendaDate(localDateISO(), f, activate, meta);
  }

  function loadFlow(id: string, targetSection: AppSection = 'now') {
    const f = s.flows.find(x => x.id === id);
    if (!f) return;
    f.lastUsed = Date.now();
    applySessionStateFromFlow(f, { pinned: true });
    if (targetSection === 'plan') {
      const targetDate = selectedDay?.date ?? activeAgendaDate() ?? localDateISO();
      s.startMin = suggestedStartMinForDate(agendaDays, targetDate, totalFlowMinutes(f));
    }
    updateTimeFeedback(); 
    activeAgendaFlowRef = null;
    planSelectionExplicit = false;
    sessionSource = { kind: 'template', templateId: f.id, title: f.title };
    setActiveSection(targetSection);
    capturePanelBaseline('now');
    capturePanelBaseline('plan');
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
    if (loggedInUser) syncSave();
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

  async function syncLoad() {
    const token = s.syncKey || '';
    if (!validateSyncToken(token)) { showSyncStatus('Inte inloggad', true); loadingFromCloud = false; return; }
    loadingFromCloud = true;
    try {
      const res = await fetch('/api/sync', {
        headers: { 'x-sync-token': token }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const cloudWorkspace = workspaceDataFromSyncResponse(data, uid);
      const localWorkspace = currentWorkspaceData();
      if (!cloudWorkspace) throw new Error();
      if (isWorkspaceMeaningfullyEmpty(cloudWorkspace) && !isWorkspaceMeaningfullyEmpty(localWorkspace)) {
        lastSyncedHash = JSON.stringify(localWorkspace);
        appState.persist();
        queueMicrotask(() => { void syncSave(); });
        showSyncStatus('Molnet var tomt. Lokal data laddades upp ✓');
        return;
      }
      const cloudFlows: Flow[] = cloudWorkspace.flows || [];
      const cloudIds = new Set(cloudFlows.map((f: Flow) => f.id));
      const localOnly = localWorkspace.flows.filter((flow) => !cloudIds.has(flow.id));
      applyWorkspaceDataToAppState(s, { ...cloudWorkspace, flows: [...cloudFlows, ...localOnly] });
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
    } catch { showSyncStatus('Kunde inte ladda', true); }
    finally { loadingFromCloud = false; }
  }

  async function syncSave() {
    const token = s.syncKey || '';
    if (!validateSyncToken(token)) { showSyncStatus('Inte inloggad', true); return; }
    syncActiveDraftFromEditor();
    const workspace = currentWorkspaceData();
    const workspaceHash = JSON.stringify(workspace);
    const payloadStr = JSON.stringify({ workspace });
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sync-token': token
        },
        body: payloadStr,
      });
      if (!res.ok) throw new Error();
      lastSyncedHash = workspaceHash;
      showSyncStatus('Sparat till moln ✓');
    } catch { showSyncStatus('Kunde inte spara', true); }
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
    removeSessionValue(SYNC_TOKEN_STORAGE);
    localStorage.removeItem(SYNC_TOKEN_STORAGE);
    localStorage.removeItem('timer-login-user');
    appState.persist();
  }

  let lastPushedHash = '';
  let lastSyncedHash: string | null = null;
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
    const parsedDraft = agendaDraft.trim() ? parseAgenda(agendaDraft) : [];
    const draftDay = parsedDraft.find(day => day.date === targetDate)
      ?? (parsedDraft[0] ? { ...parsedDraft[0], date: targetDate } : { date: targetDate, flows: [] });
    const baseDays = activeAgendaText().trim() ? parseAgenda(activeAgendaText()) : [];
    const previousDay = baseDays.find(day => day.date === targetDate) ?? null;
    const preservedDays = baseDays
      .filter(day => day.date !== targetDate)
      .map(day => cloneAgendaDay(day));
    const nextDays = draftDay.flows.length > 0
      ? [...preservedDays, cloneAgendaDay(draftDay)].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
      : preservedDays.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
    const savedText = serializeAgenda(nextDays);
    setActiveAgendaText(savedText);
    agendaDraft = serializeSelectedAgendaDay(targetDate, nextDays);
    agendaDraftDate = targetDate;
    agendaDraftDirty = false;
    s.agendaMeta = rebuildAgendaMetaForDay(
      s.agendaMeta,
      targetDate,
      previousDay,
      nextDays.find(day => day.date === targetDate) ?? null,
      agendaDayStart,
      { defaultMeta: { source: 'manual' } }
    );
    activeAgendaFlowRef = null;
    sessionSource = { kind: 'unscheduled' };
    appState.persist();

    if (loggedInUser) syncSave();

    savedAgendaMsg = 'Sparat ✓';
    setTimeout(() => { savedAgendaMsg = ''; }, 2000);
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
    if (loggedInUser) syncSave();
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
    const days = agendaDays.map((d, i) =>
      i === selectedDayIdx
        ? { ...d, flows: d.flows.filter((_, j) => j !== flowIdx) }
        : d
    );
    setActiveAgendaText(serializeAgenda(days));
    if (selectedAgendaDetails?.dayIdx === selectedDayIdx && selectedAgendaDetails.flowIdx === flowIdx) {
      activeAgendaFlowRef = null;
      planSelectionExplicit = false;
      sessionSource = { kind: 'unscheduled' };
    }
    appState.persist();
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
  async function runAiParts() {
    if (!aiInput.trim()) return;
    aiLoading = true; aiError = '';
    try {
      const text = await requestAiPlan(aiConfig, aiInput, 'parts', { startMin: s.startMin });
      handlePartsInput(text, true);
      aiPanelOpen = false;
      aiInput = '';
    } catch (e: any) { 
      aiError = e.message || 'Nätverksfel'; 
    } finally { 
      aiLoading = false; 
    }
  }

  async function runAiAgenda() {
    if (!agendaAiInput.trim()) return;
    agendaAiLoading = true; agendaAiError = '';
    try {
      const todayISO = localDateISO();
      const text = await requestAiPlan(aiConfig, agendaAiInput, 'agenda', { date: todayISO });
      setActiveAgendaText(text);
      const aiDays = parseAgenda(text);
      for (const day of aiDays) {
        const items = buildAgendaItemsForDay(day, day.flows[0]?.startMin ?? s.startMin);
        for (const item of items) {
          setAgendaMeta(makeAgendaMetaKeyForFlow(day.date ?? null, item.flow, item.startMin), { source: 'ai' });
        }
      }
      activeAgendaFlowRef = null;
      sessionSource = { kind: 'unscheduled' };
      appState.persist();
      agendaAiOpen = false;
      agendaAiInput = '';
    } catch (e: any) { 
      agendaAiError = e.message || 'Nätverksfel'; 
    } finally { 
      agendaAiLoading = false; 
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
    const remaining = items.filter((_, idx) => idx !== flowIdx);
    const windowStart = Math.floor(items[0].startMin / 60) * 60;
    const targetPx = dropY;
    let targetIdx = remaining.findIndex(item => {
      const topPx = ((item.startMin - windowStart) / 720) * timelineEl.clientHeight;
      const midPx = topPx + (item.totalMin / 720) * timelineEl.clientHeight / 2;
      return targetPx < midPx;
    });
    if (targetIdx < 0) targetIdx = remaining.length;
    const prev = targetIdx > 0 ? remaining[targetIdx - 1] : null;
    const next = targetIdx < remaining.length ? remaining[targetIdx] : null;
    const duration = source.totalMin;
    const minStart = prev ? prev.startMin + prev.totalMin + 5 : windowStart;
    const maxStart = next ? next.startMin - duration - 5 : windowStart + 720 - duration;
    const room = maxStart - minStart;
    if (room < 0) {
      return { items, source, remaining, targetIdx, previewStart: null, previewValid: false };
    }
    const desired = windowStart + Math.round((dropY / timelineEl.clientHeight) * 720);
    const previewStart = Math.max(minStart, Math.min(maxStart, Math.round(desired / 5) * 5));
    return { items, source, remaining, targetIdx, previewStart, previewValid: true };
  }

  function startAgendaDrag(e: PointerEvent, i: number, edge: 'top' | 'bottom') {
    if (isViewMode || !agendaDays || !selectedDay || !timelineEl) return;
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
    };
    window.addEventListener('pointermove', onAgendaDrag);
    window.addEventListener('pointerup', endAgendaDrag);
  }

  function onAgendaDrag(e: PointerEvent) {
    const d = agendaDragState;
    if (!d || !agendaDays) return;
    const deltaY = e.clientY - d.startY;
    if (Math.abs(deltaY) < 4) return;
    const deltaMin = Math.round(deltaY / d.containerH * 720);
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
    setTimeout(() => { agendaDragMoved = false; }, 0);
    appState.persist();
  }

  const currentAiPrompt = $derived(
    s.agendaOpen && s.clockSpan === 720 ? getAiPromptAgenda(localDateISO()) : AI_PROMPT_PARTS
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
    const source = serializeSelectedAgendaDay(currentDate, agendaDays);
    // ONLY sync from the state into the editable agenda draft 
    // IF the user hasn't started editing the draft yet OR if we force it.
    if (force || agendaDraftDate !== currentDate || !agendaDraftDirty) {
      agendaDraft = source;
      agendaDraftDate = currentDate;
      agendaDraftDirty = false;
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
        setActiveSection('now');
      } else if (key === 'p') {
        e.preventDefault();
        setActiveSection('plan');
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
          s.agendaView = s.agendaView === 'school' ? 'private' : 'school';
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
          s.agendaView = 'school';
          showToast('Låst (Öppet läge)');
        }
        appState.persist();
      }
    }
  }

  onMount(() => {
    pageOrigin = window.location.origin;
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
      mobileTab = 'now';
      if (window.innerWidth < 1100 && window.innerWidth > 800) {
        s.agendaOpen = false; // iPad portrait: stäng agenda för att inte tränga
      }
      appState.persist();
    }
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
      if (s.syncKey) await syncLoad();
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
      untrack(() => goToTimerNow());
    }

    
    updateTimeFeedback();
    capturePanelBaseline('now');
    capturePanelBaseline('plan');
    calendarMonthCursor = monthKey(parseIsoDate(selectedDay?.date ?? today));
    tick();
    const id = setInterval(tick, 1000);

    document.addEventListener('click', handleOutsideClick);

    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('resize', handleViewport);

    return () => {
      clearInterval(id);
      if (workspaceAutosaveTimer) clearTimeout(workspaceAutosaveTimer);
      if (viewPollId) clearInterval(viewPollId);
      if (viewVisibilityHandler) document.removeEventListener('visibilitychange', viewVisibilityHandler);
      resizeObservers.forEach(ro => ro.disconnect());
      document.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('resize', handleViewport);
    };
  });

  $effect(() => {
    const _ = s.palette + s.dark + s.sbCollapsed + s.agendaOpen + mobileTab + locked;
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
    if (s.activeSection === 'plan' && !agendaDraftDirty) {
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
    const _section = s.activeSection;
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
    const _ = JSON.stringify(s.blocks) + s.palette + s.dark + s.hollow + s.textOutside +
      s.showMin + s.showFive + s.showQuarter + s.showSegLabels + s.showCenterEnd + s.segMinutesMode + s.clockSpan +
      s.agendaText + s.agendaDate + s.agendaText2 + s.agendaDate2 + s.agendaView;
    agendaItems; // track agenda for 12h mode
  });

  $effect(() => {
    const hash = JSON.stringify(currentWorkspaceData());
    if (isViewMode || loadingFromCloud || !loggedInUser || !s.syncKey
      || lastSyncedHash === null || hash === lastSyncedHash) {
      return;
    }
    const timer = setTimeout(() => { void syncSave(); }, 4000);
    return () => clearTimeout(timer);
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
    if (!agendaItems.length) return;
    const nowMin = nowMinutes();
    const current = resolveAgendaFlowRef(agendaDays, activeAgendaFlowRef);
    if (current && nowMin >= current.startMin && nowMin < current.startMin + current.totalMin) {
      lastAutoLoadKey = `${current.startMin}-${current.totalMin}-${current.flow.title}-${current.flow.parts.length}`;
      return;
    }
    const active = agendaItems.find(item =>
      nowMin >= item.startMin && nowMin < item.startMin + item.totalMin
    );
    if (!active) return;
    const key = agendaAutoLoadKey(active);
    if (key === lastAutoLoadKey) return;
    lastAutoLoadKey = key;
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
    if (isViewMode || !agendaDays || !selectedDay || !timelineEl || s.activeSection === 'now') return;
    e.preventDefault();
    e.stopPropagation();
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
      previewValid: preview?.previewValid ?? false
    };
    window.addEventListener('pointermove', onAgendaMove);
    window.addEventListener('pointerup', endAgendaMove);
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
    }
  }

  function endAgendaMove() {
    const move = agendaMoveState;
    agendaMoveState = null;
    window.removeEventListener('pointermove', onAgendaMove);
    window.removeEventListener('pointerup', endAgendaMove);
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

    const newDays = agendaDays.map((day, di) => {
      if (di !== move.dayIdx) return day;
      const flows = [...day.flows];
      const [movedFlow] = flows.splice(move.flowIdx, 1);
      const updated = { ...movedFlow, startMin: previewStart };
      flows.splice(Math.min(preview.targetIdx, flows.length), 0, updated);
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
    appState.persist();
    setTimeout(() => { agendaDragMoved = false; }, 0);
  }

  function loadAgendaFlow(flow: Flow, computedStart: number, targetSection: AppSection = 'plan', markExplicitSelection = true) {
    applySessionStateFromFlow(flow, { startMin: flow.startMin ?? computedStart, pinned: minutes => minutes > 0, clockSpan: 60 });
    activeAgendaFlowRef = selectedDay
      ? makeAgendaFlowRef(selectedDay.date ?? null, flow, s.startMin)
      : null;
    planSelectionExplicit = markExplicitSelection && targetSection === 'plan';
    sessionSource = activeAgendaFlowRef
      ? { kind: 'agenda', date: selectedDay?.date ?? null, title: flow.title, startMin: s.startMin }
      : { kind: 'unscheduled' };
    planLastSavedAt = Date.now();
    setActiveSection(targetSection);
    capturePanelBaseline('plan');
    capturePanelBaseline('now');
    syncPartsDraftFromState(true);
    updateTimeFeedback();  appState.persist();
  }

  function goToTimerNow() {
    const now = nowMinutes();
    const today = localDateISO();

    setActiveAgendaDate(today);
    const stored = activeAgendaText();
    const days = stored.trim() ? parseAgenda(stored) : [];
    const activeItem = findAgendaItemForTime(days, today, now, agendaDayStart);

    if (activeItem) {
      loadAgendaFlow(activeItem.flow, activeItem.startMin, 'now', false);
      return;
    }

    const fallback = createCurrentFallbackSession(now, uid);
    setActiveSection('now');
    s.dayTitle = fallback.dayTitle;
    s.blocks = fallback.blocks;
    s.extraInfo = fallback.extraInfo;
    s.startMin = fallback.startMin;

    lastAutoLoadKey = '';
    activeAgendaFlowRef = null;
    sessionSource = { kind: 'unscheduled' };
    
    capturePanelBaseline('now');
    capturePanelBaseline('plan');
    syncPartsDraftFromState(true);
    updateTimeFeedback();
    appState.persist();
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
          value={titleDraftValue || s.dayTitle}
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
        <div class="lesson-title hero-text">{s.dayTitle}</div>
      {/if}
      <div class="top-time">
        <button class="now now-btn hero-text" type="button" onclick={goToTimerNow} title="Visa nuvarande tid">{nowText}</button>
        {#if s.showLeft}<div class="left">{leftText}</div>{/if}
      </div>
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

    <div class="mini-menu-shell">
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
        </div>

        {#if !isViewMode}
          <div class="toolbar-center" style="display:flex; align-items:center; gap:0;">
            <button
              id="mini-menu-toggle"
              class="mini-menu-toggle"
              class:open={miniMenuOpen}
              type="button"
              onclick={(e) => { e.stopPropagation(); toggleMiniMenu(); }}
              title={miniMenuOpen ? 'Dölj meny' : 'Visa meny'}
            >
              <span>▾</span>
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
                  <div class="field-label" style="font-size:10px;margin-bottom:6px;opacity:.7;">Aviseringar</div>
                  <div class="warn-dots-grid">
                    {#each s.blocks as b, i (b.id)}
                      {@const ct = clockTheme(s.palette, s.dark)}
                      <button class="wd" class:on={b.warning} style={`--warn-color:${ct.colors[i % ct.colors.length]}`}
                        title={b.title || 'Aktivitet'}
                        onclick={() => { b.warning = !b.warning; syncTimerToAgenda(); appState.persist(); }}
                      >♪</button>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          </div>

          <span style="font-size:12px;opacity:.55;padding:0 6px;border-left:1px solid var(--border);cursor:default;" title={loggedInUser ? `Inloggad som ${loggedInUser}` : 'Inte inloggad'}>
            {loggedInUser ? '👤' : '👤︎'}
          </span>
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

      <div class="mini-menu-details" class:open={miniMenuOpen}>
      {#if s.showControls}
        <div class="controls">
        <SectionNav activeSection={s.activeSection} labels={SECTION_LABELS} onSelect={setActiveSection} />

        {#if s.activeSection === 'now'}
          <div class="section-hero section-hero--split section-hero--compact">
            <div class="hero-select-wrap">
              <label class="field-label" for="now-template-select">Mall</label>
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
        {:else if s.activeSection === 'plan'}
          <div class="section-hero section-hero--split section-hero--compact">
            <div class="hero-select-wrap">
              <label class="field-label" for="plan-template-select">Mall</label>
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
          <SectionHero title={SECTION_LABELS[s.activeSection]} copy={sectionCopy} />
        {/if}

        {#if s.activeSection === 'now' || s.activeSection === 'plan'}
          <div in:fade={{ duration: 150 }}>
            <SessionEditorPanel
              userLevel={s.userLevel}
              aiProvider={aiConfig.provider}
              aiApiKey={aiConfig.apiKey}
              mode={s.activeSection}

              hasSelection={!!selectedAgendaDetails}
              savedFlowMsg={savedFlowMsg}
              titleValue={s.dayTitle}
              partsValue={partsFieldValue}
              {copyBtnText}
              {partsFeedbackText}
              {timeFeedbackText}
              hasAiKey={!!aiApiKey}
              {aiPanelOpen}
              {aiInput}
              {aiError}
              {aiLoading}
              aiPlanMode={aiConfig.planMode}
              startTimeValue={fmtHM(s.startMin)}
              endTimeValue={fmtHM(s.startMin + totalMin())}
              totalMinutesValue={totalMin()}
              minTotalMinutes={s.blocks.length * 2}
              {endMode}
              actionLabel={s.activeSection === 'plan' ? 'Spara' : 'Kör!'}
              actionHint={planActionHint}
              saveStatusLabel={activePanelStatusLabel}
              canRevert={canRevertPanel}
              showTitleHelp={helpVisible(sessionTitleHelpOpen)}
              showPartsHelp={helpVisible(sessionPartsHelpOpen)}
              showTimeHelp={helpVisible(sessionTimeHelpOpen)}
              targetDateLabel={targetDateLabel}
              sourceLabel={selectedAgendaSourceLabel}
              sourceHelp={selectedAgendaSourceHelp}
              showSourceHelp={helpVisible(planSourceHelpOpen)}
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
                if (s.activeSection !== 'plan') {
                  syncTimerToAgenda();
                }
                appState.persist();
                notifyPanelMutation(s.activeSection === 'plan' ? 'plan' : 'now');
              }}
              onPartsInput={handlePartsInput}
              onPartsKeyDown={handlePartsKeyDown}
              onCopyPrompt={() => {
                navigator.clipboard.writeText(currentAiPrompt).then(() => {
                  copyBtnText = '✓ Kopierad';
                  setTimeout(() => { copyBtnText = 'AI-prompt'; }, 1500);
                });
              }}
              onToggleAiPanel={() => aiPanelOpen = !aiPanelOpen}
              onAiInputChange={(value) => aiInput = value}
              onSetStrictMode={() => { aiConfig.planMode = 'strict'; saveAiConfig(); }}
              onSetHelpfulMode={() => { aiConfig.planMode = 'helpful'; saveAiConfig(); }}
              onRunAi={runAiParts}
              onAction={() => {
                if (s.activeSection === 'plan') {
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
                  if (loggedInUser) void syncSave();
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
                if (loggedInUser) void syncSave();
              }}
              onCreateNew={() => {
                const targetDate = selectedDay?.date ?? activeAgendaDate() ?? localDateISO();
                addFlowToAgendaDate(targetDate, flowFromCurrentSession(), true, sessionAgendaMeta());
                planSelectionExplicit = true;
                capturePanelBaseline('plan');
                partsDraftDirty = false;
                notifyPanelMutation('plan');
                appState.persist();
                if (loggedInUser) void syncSave();
              }}
              onStartTimeInput={(value) => {
                const [h, m] = value.split(':').map(Number);
                if (isNaN(h) || isNaN(m)) return;
                s.startMin = h * 60 + m; warnedSet.clear();
                updateTimeFeedback();
                syncTimerToAgenda(); appState.persist(); notifyPanelMutation(s.activeSection === 'plan' ? 'plan' : 'now');
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
                notifyPanelMutation(s.activeSection === 'plan' ? 'plan' : 'now');
              }}
              onTotalMinutesInput={(value) => {
                if (!value || value < s.blocks.length * 2) return;
                scaleMinutesTo(value);
                updateTimeFeedback();
                syncTimerToAgenda(); appState.persist();
                notifyPanelMutation(s.activeSection === 'plan' ? 'plan' : 'now');
              }}
              onEndModeChange={(mode) => { endMode = mode; s.endMode = mode; appState.persist(); notifyPanelMutation(s.activeSection === 'plan' ? 'plan' : 'now'); }}  
              onRevert={revertActivePanel}
              onToggleTitleHelp={() => sessionTitleHelpOpen = toggleHelpOverride(sessionTitleHelpOpen)}
              onTogglePartsHelp={() => sessionPartsHelpOpen = toggleHelpOverride(sessionPartsHelpOpen)}
              onToggleTimeHelp={() => sessionTimeHelpOpen = toggleHelpOverride(sessionTimeHelpOpen)}
              onToggleSourceHelp={() => planSourceHelpOpen = toggleHelpOverride(planSourceHelpOpen)}
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
                notifyPanelMutation(s.activeSection === 'plan' ? 'plan' : 'now');
              }}
              actualHistoryOpen={actualHistoryOpen}
              onToggleActualHistory={() => actualHistoryOpen = !actualHistoryOpen}
              currentSubjectCategory={currentSubjectCategory}
              pendingActualEntries={pendingActualEntries}
              onConfirmActualEntry={confirmActualEntryLocal}
              onDeleteActualEntry={deleteActualEntryLocal}
              onExportActualHistory={exportActualHistory}
            />
          </div>
        {:else if s.activeSection === 'library'}
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
        {:else if s.activeSection === 'workspace'}
          <div in:fade={{ duration: 150 }}>
            <WorkspacePanel
              userLevel={s.userLevel}
              onUpgrade={upgradeLevel}
              {loggedInUser}

              {syncStatusText}
              {syncStatusError}
              {loginName}
              {loginPass}
              aiProvider={aiConfig.provider}
              aiProviderLabels={AI_PROVIDER_LABELS}
              aiKeyPlaceholders={AI_KEY_PLACEHOLDERS}
              aiApiKey={aiApiKey}
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
              onLogin={login}
              onLoginNameChange={(value) => loginName = value}
              onLoginPassChange={(value) => loginPass = value}
              onToggleHelpHints={() => { s.showHelpHints = !s.showHelpHints; appState.persist(); }}
              onProviderChange={(value) => { aiConfig.provider = value as AiProvider; aiKeyVisible = false; saveAiConfig(); }}
              onToggleAiKeyVisible={() => aiKeyVisible = !aiKeyVisible}
              onClearAiConfig={clearAiConfig}
              onAiApiKeyChange={(value) => { aiConfig.apiKey = value; saveAiConfig(); }}
              onAiBaseUrlChange={(value) => { aiConfig.baseUrl = value; saveAiConfig(); }}
              onAiCustomModelChange={(value) => { aiConfig.customModel = value; saveAiConfig(); }}
            />
          </div>
        {:else if s.activeSection === 'admin'}
          <div in:fade={{ duration: 150 }}>
            <AdminPanel
              {adminPassword}
              onGenerateInvite={generateInvite}
              {inviteCodeResult}
            />
          </div>
        {/if}
        </div>
      {/if}
      </div>
    </div>
  </main>

  <div class="resize-handle-ag" role="separator" aria-orientation="vertical" onpointerdown={startAgendaResize}></div>
  <AgendaPanel
    selectedFlowId={(s.activeSection === 'plan' && planSelectionExplicit && selectedAgendaDetails) ? selectedAgendaDetails.flow.id : null}
    {sectorColors}
    {isViewMode}
    {agendaDraftStatus}
    {savedAgendaMsg}
    {icsPreviewSummary}
    {icsPreviewLines}
    {icsImportError}
    {icsCanImport}
    {agendaAiError}
    {agendaAiLoading}
    {selectedDay}
    {agendaDays}
    {selectedDayIdx}
    {agendaItems}
    {overlayItems}
    {agendaMoveState}
    {nowMinLive}
    {agendaDragMoved}
    {calendarCells}
    agendaDimPast={s.agendaDimPast}
    {aiApiKey}
    {aiConfig}
    {icsPreviewEvents}
    {activeAgendaDate}
    {saveAgenda}
    {resetIcsPreview}
    {readIcsFile}
    {previewIcsImport}
    {importPreviewedIcs}
    {runAiAgenda}
    {toggleHelpOverride}
    {selectAgendaDate}
    {prevDay}
    {nextDay}
    {loadAgendaFlow}
    {loadFlow}
    {startAgendaMove}
    {deleteAgendaItem}
    {startAgendaDrag}
    {schoolPrimary}
    {saveAiConfig}
    onSetActiveSection={setActiveSection}
    bind:agendaEl
    bind:timelineEl
    bind:agendaInputOpen
    bind:agendaCalendarOpen
    bind:calendarMonthCursor
    bind:agendaDraft
    bind:agendaDraftDirty
    bind:agendaDraftDate
    bind:icsDraft
    bind:icsImportOpen
    bind:copyAgendaPromptText
    bind:agendaAiOpen
    bind:agendaAiInput
  />

  <button id="agenda-toggle-btn" class="agenda-toggle-btn" onclick={toggleAgenda} title="Dagagenda">
    {s.agendaOpen ? '›' : '‹'}
  </button>

  <nav class="mobile-tabs">
    <button class:active={s.activeSection === 'now' && mobileTab === 'now'} onclick={() => setActiveSection('now')}>
      <span>◷</span> Nu
    </button>
    <button class:active={s.activeSection === 'plan' && mobileTab === 'plan'} onclick={() => setActiveSection('plan')}>
      <span>▦</span> Planera
    </button>
    <button class:active={s.activeSection === 'library'} onclick={() => setActiveSection('library')}>
      <span>⌘</span> Bibliotek
    </button>
    <button class:active={s.activeSection === 'workspace'} onclick={() => setActiveSection('workspace')}>
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
          <code>&amp; kommentar</code> — Skapar en stor inforuta i slutet av passet.
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
        <h3>📅 Agendan & Kalendern</h3>
        <p>Öppna agendan med pilen <span class="ico">▷</span> till höger om klockan.</p>
        <div class="help-box">
          <strong>Tidslinjen</strong>: Här ser du hela dagen. Du kan dra i blocken för att justera deras tid eller flytta dem i ordningen.<br/><br/>
          <strong>Dagtext</strong>: Det kraftfullaste sättet att planera. Skriv <code>@260517</code> för datum och <code>#Rubrik</code> för att snabbt bygga hela dagar med text.
        </div>

        <h3>✨ AI & Smart Import</h3>
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
