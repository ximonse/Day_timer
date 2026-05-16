<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { appState, uid, type ActualTimeEntry, type AgendaFlowMeta, type AppSection, type Flow } from '$lib/state.svelte.js';
  import { PALETTES, PALETTE_COLORS, PALETTE_LABELS, clockTheme, labelColorFor } from '$lib/theme.js';
  import { CX, CY, R, Ri, polar, arcPath, nowMinutes, fmtHM, truncate } from '$lib/clock.js';
  import { localDateISO } from '$lib/date.js';
  import { parseParts, serializeBlocks, parseAgenda, serializeAgenda, type AgendaDay } from '$lib/parse.js';
  import { icsEventsToAgendaDays, parseIcsEvents, type IcsEvent } from '$lib/ics.js';
  import { createShareTokens, deriveSyncToken, validateSyncToken } from '$lib/security.js';
  import { applyDayTextHeuristic, computeRecommendation, inferSubjectCategory, toJsonl } from '$lib/learning.js';
  import SectionNav from '$lib/components/SectionNav.svelte';
  import SectionHero from '$lib/components/SectionHero.svelte';
  import SessionEditorPanel from '$lib/components/SessionEditorPanel.svelte';
  import LibraryPanel from '$lib/components/LibraryPanel.svelte';
  import WorkspacePanel from '$lib/components/WorkspacePanel.svelte';
  import AgendaImportPanel from '$lib/components/AgendaImportPanel.svelte';

  const s = appState.value;
  const NS = 'http://www.w3.org/2000/svg';

  function clickOutside(node: HTMLElement, cb: () => void) {
    function handle(e: MouseEvent) {
      if (!node.contains(e.target as Node)) cb();
    }
    document.addEventListener('click', handle, true);
    return { destroy() { document.removeEventListener('click', handle, true); } };
  }

  function focusOnMount(node: HTMLInputElement) {
    node.focus();
    node.select();
    return {};
  }

  let svgEl = $state<SVGSVGElement>(null!);
  let sidebarEl = $state<HTMLElement>(null!);
  let flashEl = $state<HTMLElement>(null!);
  let endControlEl = $state<HTMLElement>(null!);
  let loginName = $state('');
  let loginPass = $state('');
  let loggedInUser = $state('');
  let shareToken = $state('');
  let shareOwnerToken = $state('');
  let shareCopyText = $state('Kopiera länk');
  let pageOrigin = $state('');
  type ShareMode = 'active-session-live' | 'selected-session-snapshot' | 'selected-day-snapshot';
  let shareMode = $state<ShareMode | null>(null);
  let isViewMode = $state(false);
  let viewToken = $state('');
  let agendaInputOpen = $state(true);
  let agendaCalendarOpen = $state(true);
  let savedAgendaMsg = $state('');
  let savedFlowMsg = $state('');
  let copyAgendaPromptText = $state('AI-prompt');
  let agendaDragState = $state<{ i: number; dayIdx: number; startY: number; startMinA: number; blockStart: number; blockEnd: number; clampMin: number; clampMax: number; edge: 'top' | 'bottom'; containerH: number } | null>(null);
  let agendaMoveState = $state<{ dayIdx: number; flowIdx: number; startY: number; currentY: number; targetIdx: number; previewStart: number | null; previewValid: boolean } | null>(null);
  let planSelectionExplicit = $state(false);
  let partsDraft = $state('');
  let partsDraftDirty = $state(false);
  type AgendaFlowRef = {
    date: string | null;
    title: string;
    startMin: number;
    totalMin: number;
    partCount: number;
  };
  let activeAgendaFlowRef = $state<AgendaFlowRef | null>(null);
  type SessionSource =
    | { kind: 'unscheduled' }
    | { kind: 'template'; templateId: string; title: string }
    | { kind: 'agenda'; date: string | null; title: string; startMin: number };
  let sessionSource = $state<SessionSource>({ kind: 'unscheduled' });
  let agendaDragMoved = false;
  let editingBlockId = $state<string | null>(null);
  let editingBlockField = $state<'name' | 'min' | null>(null);
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
  let mobileTab = $state<'timer'|'plan'>('timer');
  let showAgendaOverlay = $state(typeof window !== 'undefined' ? window.innerWidth > 980 : true);
  let nowText = $state('--:--');
  let leftText = $state('');
  let flowsOpen = $state(false);
  let miniMenuOpen = $state(true);
  let themePickerOpen = $state(false);
  let optionsMenuOpen = $state(false);
  let menuHelpOpen = $state<'tid' | 'visning' | 'sidopanel' | 'agenda' | 'ovrigt' | null>(null);
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
  let syncStatusText = $state('');
  let syncStatusError = $state(false);
  let endMode = $state<'end' | 'len'>(s.endMode ?? 'end');

  type AiProvider = 'anthropic' | 'openai' | 'gemini' | 'custom';
  type AiPlanMode = 'strict' | 'helpful';
  interface AiConfig { provider: AiProvider; apiKey: string; baseUrl: string; customModel: string; planMode: AiPlanMode; }
  type PersistedAiConfig = Omit<AiConfig, 'apiKey'>;
  let aiConfig = $state<AiConfig>({ provider: 'anthropic', apiKey: '', baseUrl: '', customModel: '', planMode: 'helpful' });
  let aiKeyVisible = $state(false);
  let aiPanelOpen = $state(false);
  let aiInput = $state('');
  let aiLoading = $state(false);
  let aiError = $state('');
  let agendaAiInput = $state('');
  let agendaAiLoading = $state(false);
  let agendaAiError = $state('');
  let agendaAiOpen = $state(false);

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
    workspace: 'Konto & AI'
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

  const AI_CONFIG_STORAGE = 'daytimer_ai_config';
  const AI_KEY_SESSION_STORAGE = 'daytimer_ai_api_key';
  const SHARE_TOKEN_STORAGE = 'daytimer_share_token';
  const SHARE_OWNER_STORAGE = 'daytimer_share_owner_token';
  const SHARE_MODE_STORAGE = 'daytimer_share_mode';

  function readSessionValue(key: string) {
    try {
      return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(key) : null;
    } catch {
      return null;
    }
  }

  function writeSessionValue(key: string, value: string) {
    try {
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  }

  function removeSessionValue(key: string) {
    try {
      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }

  function saveAiConfig() {
    const persistedConfig: PersistedAiConfig = {
      provider: aiConfig.provider,
      baseUrl: aiConfig.baseUrl,
      customModel: aiConfig.customModel,
      planMode: aiConfig.planMode
    };
    localStorage.setItem(AI_CONFIG_STORAGE, JSON.stringify(persistedConfig));
    if (aiConfig.apiKey.trim()) writeSessionValue(AI_KEY_SESSION_STORAGE, aiConfig.apiKey);
    else removeSessionValue(AI_KEY_SESSION_STORAGE);
    localStorage.removeItem('daytimer_ai_key'); // migrate away from old key
  }
  function clearAiConfig() {
    aiConfig = { provider: 'anthropic', apiKey: '', baseUrl: '', customModel: '', planMode: 'helpful' };
    localStorage.removeItem(AI_CONFIG_STORAGE);
    localStorage.removeItem('daytimer_ai_key');
    removeSessionValue(AI_KEY_SESSION_STORAGE);
  }

  // derived shorthand used in templates
  const aiApiKey = $derived(aiConfig.apiKey);

  const pad = (n: number) => String(Math.floor(n)).padStart(2, '0');
  const totalMin = () => s.blocks.reduce((a, b) => a + b.minutes, 0);

  const sectorColors = $derived(clockTheme(s.palette, s.dark).colors);

  function totalFlowMinutes(flow: Flow): number {
    return flow.minutes.reduce((sum, minutes) => sum + minutes, 0);
  }

  function deriveAgendaDayStart(day: AgendaDay, fallbackStart: number): number {
    const firstExplicitIdx = day.flows.findIndex(f => f.startMin !== undefined);
    if (firstExplicitIdx < 0) return fallbackStart;
    let t = day.flows[firstExplicitIdx].startMin!;
    for (let i = firstExplicitIdx - 1; i >= 0; i--) {
      t -= totalFlowMinutes(day.flows[i]);
    }
    return t;
  }

  function buildAgendaItemsForDay(day: AgendaDay, fallbackStart: number) {
    let t = deriveAgendaDayStart(day, fallbackStart);
    return day.flows.map((flow, flowIdx) => {
      if (flow.startMin !== undefined) t = flow.startMin;
      const startMin = t;
      const totalMin = totalFlowMinutes(flow);
      t += totalMin;
      return { day, flow, flowIdx, startMin, totalMin };
    });
  }

  function cloneAgendaDay(day: AgendaDay): AgendaDay {
    return {
      date: day.date,
      flows: day.flows.map(flow => ({
        ...flow,
        parts: [...flow.parts],
        minutes: [...flow.minutes],
        warnings: [...flow.warnings],
        notes: [...flow.notes]
      }))
    };
  }

  function serializeSelectedAgendaDay(date: string | null, days: AgendaDay[] | null) {
    if (!date) return '';
    const day = days?.find(entry => entry.date === date);
    return day ? serializeAgenda([cloneAgendaDay(day)]) : `@${date.slice(2, 4)}${date.slice(5, 7)}${date.slice(8, 10)}\n`;
  }

  function suggestedStartMinForDate(date: string, durationMin = totalMin()) {
    const day = agendaDays?.find(entry => entry.date === date) ?? null;
    if (!day || day.flows.length === 0) return 8 * 60;
    const items = buildAgendaItemsForDay(day, 8 * 60);
    const last = items[items.length - 1];
    const roundedEnd = Math.ceil((last.startMin + last.totalMin) / 5) * 5;
    return Math.min(roundedEnd, Math.max(8 * 60, 24 * 60 - durationMin));
  }

  function makeAgendaFlowRef(date: string | null, flow: Flow, startMin: number): AgendaFlowRef {
    return {
      date,
      title: flow.title,
      startMin,
      totalMin: totalFlowMinutes(flow),
      partCount: flow.parts.length
    };
  }

  function makeAgendaMetaKey(date: string | null, title: string, startMin: number, totalMin: number, partCount: number): string {
    return JSON.stringify([date ?? '', title, startMin, totalMin, partCount]);
  }

  function makeAgendaMetaKeyForFlow(date: string | null, flow: Flow, startMin: number): string {
    return makeAgendaMetaKey(date, flow.title, startMin, totalFlowMinutes(flow), flow.parts.length);
  }

  function agendaMetaSignature(flow: Flow, startMin: number): string {
    return JSON.stringify([
      startMin,
      flow.title,
      flow.parts,
      flow.minutes,
      flow.extraInfo || ''
    ]);
  }

  function makeAgendaMetaKeyForRef(ref: AgendaFlowRef): string {
    return makeAgendaMetaKey(ref.date, ref.title, ref.startMin, ref.totalMin, ref.partCount);
  }

  function setAgendaMeta(key: string, meta: AgendaFlowMeta) {
    s.agendaMeta = { ...s.agendaMeta, [key]: meta };
  }

  function removeAgendaMetaForDate(date: string | null) {
    const next: typeof s.agendaMeta = {};
    for (const [key, meta] of Object.entries(s.agendaMeta)) {
      try {
        const [storedDate] = JSON.parse(key);
        if ((storedDate || '') !== (date ?? '')) next[key] = meta;
      } catch {
        next[key] = meta;
      }
    }
    s.agendaMeta = next;
  }

  function cloneAgendaMeta(meta: AgendaFlowMeta): AgendaFlowMeta {
    return { ...meta };
  }

  function buildAgendaMetaLookup(date: string | null, day: AgendaDay | null) {
    const exact = new Map<string, AgendaFlowMeta>();
    const signature = new Map<string, AgendaFlowMeta>();
    if (!day) return { exact, signature };
    const fallbackStart = day.flows[0]?.startMin ?? agendaDayStart;
    for (const item of buildAgendaItemsForDay(day, fallbackStart)) {
      const key = makeAgendaMetaKeyForFlow(date, item.flow, item.startMin);
      const meta = s.agendaMeta[key];
      if (!meta) continue;
      exact.set(key, cloneAgendaMeta(meta));
      signature.set(agendaMetaSignature(item.flow, item.startMin), cloneAgendaMeta(meta));
    }
    return { exact, signature };
  }

  function rebuildAgendaMetaForDay(
    date: string | null,
    previousDay: AgendaDay | null,
    nextDay: AgendaDay | null,
    options?: {
      overridesByKey?: Map<string, AgendaFlowMeta>;
      overridesBySignature?: Map<string, AgendaFlowMeta>;
      defaultMeta?: AgendaFlowMeta;
    }
  ) {
    removeAgendaMetaForDate(date);
    if (!nextDay) return;
    const previousLookup = buildAgendaMetaLookup(date, previousDay);
    const fallbackStart = nextDay.flows[0]?.startMin ?? agendaDayStart;
    for (const item of buildAgendaItemsForDay(nextDay, fallbackStart)) {
      const key = makeAgendaMetaKeyForFlow(date, item.flow, item.startMin);
      const signature = agendaMetaSignature(item.flow, item.startMin);
      const meta =
        options?.overridesByKey?.get(key) ??
        options?.overridesBySignature?.get(signature) ??
        previousLookup.exact.get(key) ??
        previousLookup.signature.get(signature) ??
        options?.defaultMeta;
      if (meta) setAgendaMeta(key, cloneAgendaMeta(meta));
    }
  }

  function moveAgendaMeta(oldKey: string, newKey: string) {
    if (oldKey === newKey) return;
    const meta = s.agendaMeta[oldKey];
    if (!meta) return;
    const next = { ...s.agendaMeta };
    delete next[oldKey];
    next[newKey] = meta;
    s.agendaMeta = next;
  }

  function agendaMetaLabel(meta: AgendaFlowMeta | null): string {
    if (!meta) return 'Ospecificerad';
    if (meta.source === 'template') return meta.label ? `Mall: ${meta.label}` : 'Mall';
    if (meta.source === 'ai') return 'AI-planerad';
    if (meta.source === 'import') return meta.label ? `Import: ${meta.label}` : 'Importerad';
    return 'Manuellt skapad';
  }

  function agendaMetaBadge(meta: AgendaFlowMeta | null): string {
    if (!meta) return '';
    if (meta.source === 'template') return 'Mall';
    if (meta.source === 'ai') return 'AI';
    if (meta.source === 'import') return meta.label === 'ICS-kalender' ? 'ICS' : 'Import';
    return 'Manuell';
  }

  function agendaMetaHelp(meta: AgendaFlowMeta | null): string {
    if (!meta || meta.source === 'manual') {
      return 'Det här blocket är nu ett vanligt dagplansblock utan särskild koppling.';
    }
    if (meta.source === 'template') {
      return 'Blocket skapades från en mall. Ändringar här påverkar bara dagplanen, inte originalmallen.';
    }
    if (meta.source === 'ai') {
      return 'Blocket skapades av AI och går nu att finjustera som ett vanligt dagplansblock.';
    }
    const detail = meta.detail ? ` ${meta.detail}` : '';
    return `Blocket kom in via import.${detail} Om du vill behandla det som helt eget kan du göra det manuellt.`;
  }

  function sessionAgendaMeta(): AgendaFlowMeta {
    if (sessionSource.kind === 'template') {
      return { source: 'template', label: sessionSource.title };
    }
    return { source: 'manual' };
  }

  function resolveAgendaFlowRef(days: AgendaDay[] | null, ref: AgendaFlowRef | null) {
    if (!days || !ref) return null;
    const dayIdx = days.findIndex(d => d.date === ref.date);
    if (dayIdx < 0) return null;
    const day = days[dayIdx];
    const items = buildAgendaItemsForDay(day, ref.startMin);
    const exact = items.find(item => item.startMin === ref.startMin && item.flow.title === ref.title);
    if (exact) return { ...exact, dayIdx };
    const fallback = items.find(item =>
      item.flow.title === ref.title &&
      item.totalMin === ref.totalMin &&
      item.flow.parts.length === ref.partCount
    );
    return fallback ? { ...fallback, dayIdx } : null;
  }

  function schoolPrimary() { return s.agendaView === 'school' || s.agendaView === 'school+private'; }
  function activeAgendaText(): string { return schoolPrimary() ? s.agendaText : s.agendaText2; }
  function activeAgendaDate(): string { return schoolPrimary() ? s.agendaDate : s.agendaDate2; }
  function setActiveAgendaText(v: string) { if (schoolPrimary()) s.agendaText = v; else s.agendaText2 = v; }
  function setActiveAgendaDate(v: string) { if (schoolPrimary()) s.agendaDate = v; else s.agendaDate2 = v; }
  function hasOverlay() { return s.agendaView === 'school+private' || s.agendaView === 'private+school'; }

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
    if (s.activeSection === 'plan') return 'Planera på vald dag och håll själva visningsläget lugnt.';
    if (s.activeSection === 'library') return 'Spara och återanvänd mallar utan att blanda ihop dem med dagens plan.';
    return 'Hantera konto, synk, hjälpläge och AI-stöd.';
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
  type CalendarCell = {
    iso: string;
    label: number;
    inMonth: boolean;
    isSelected: boolean;
    density: number;
    hasContent: boolean;
  };

  function parseIsoDate(iso: string) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function monthKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  function shiftMonth(monthIso: string, delta: number) {
    const [year, month] = monthIso.split('-').map(Number);
    const date = new Date(year, month - 1 + delta, 1);
    return monthKey(date);
  }

  const agendaDensityByDay = $derived.by(() => {
    const map = new Map<string, { count: number; minutes: number }>();
    for (const day of agendaDays ?? []) {
      if (!day.date) continue;
      const minutes = day.flows.reduce((sum, flow) => sum + totalFlowMinutes(flow), 0);
      map.set(day.date, { count: day.flows.length, minutes });
    }
    return map;
  });

  const calendarCells = $derived.by<CalendarCell[]>(() => {
    const baseIso = selectedDay?.date ?? localDateISO();
    const monthIso = calendarMonthCursor || monthKey(parseIsoDate(baseIso));
    const [year, month] = monthIso.split('-').map(Number);
    const first = new Date(year, month - 1, 1);
    const startOffset = first.getDay();
    const gridStart = new Date(year, month - 1, 1 - startOffset);
    const cells: CalendarCell[] = [];
    const selectedIso = selectedDay?.date ?? '';
    const monthDensities = [...agendaDensityByDay.values()].map(entry => entry.count);
    const maxCount = monthDensities.length ? Math.max(...monthDensities) : 1;
    for (let i = 0; i < 42; i++) {
      const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
      const iso = localDateISO(date);
      const densityEntry = agendaDensityByDay.get(iso);
      cells.push({
        iso,
        label: date.getDate(),
        inMonth: date.getMonth() === first.getMonth(),
        isSelected: iso === selectedIso,
        density: densityEntry ? Math.max(0.2, densityEntry.count / maxCount) : 0,
        hasContent: Boolean(densityEntry)
      });
    }
    return cells;
  });

  const agendaItems = $derived.by(() => {
    const flows = selectedDay?.flows ?? (agendaDays ? [] : s.flows);
    const fromText = agendaDays !== null;
    if (!selectedDay) {
      let t = s.startMin;
      return flows.map(flow => {
        if (flow.startMin !== undefined) t = flow.startMin;
        const startMin = t;
        const totalMin = totalFlowMinutes(flow);
        t += totalMin;
        return { flow, startMin, totalMin, fromText };
      });
    }
    return buildAgendaItemsForDay(selectedDay, agendaDayStart).map(({ flow, startMin, totalMin }) => ({
      flow, startMin, totalMin, fromText
    }));
  });

  const overlayItems = $derived.by(() => {
    if (s.activeSection !== 'plan') return [];
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
    let t = s.startMin;
    return day.flows.map(flow => {
      if (flow.startMin !== undefined) t = flow.startMin;
      const startMin = t;
      const totalMin = flow.minutes.reduce((a, b) => a + b, 0);
      t += totalMin;
      return { flow, startMin, totalMin };
    });
  });

  function fmtAgendaDate(iso: string | null): string {
    if (!iso) return 'Odaterat';
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const days = ['Sön','Mån','Tis','Ons','Tor','Fre','Lör'];
    const months = ['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'];
    return `${days[dt.getDay()]} ${d} ${months[m - 1]}`;
  }

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
    s.activeSection = section;
    s.showControls = true;
    miniMenuOpen = true;
    if (section === 'plan') {
      s.agendaOpen = true;
      agendaInputOpen = true;
    }
    if (typeof window !== 'undefined' && window.innerWidth <= 800) {
      mobileTab = section === 'plan' ? 'plan' : 'timer';
      syncBodyClasses();
    }
    appState.persist();
  }

  function closeTransientMenus() {
    optionsMenuOpen = false;
    menuHelpOpen = null;
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

  function cloneBlocks(blocks: typeof s.blocks) {
    return blocks.map(block => ({ ...block }));
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
    renderEndControl();
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

  function monthLabel(monthIso: string): string {
    const [year, month] = monthIso.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('sv-SE', {
      month: 'long',
      year: 'numeric'
    });
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
  function makeActualEntryId(date: string, startMin: number, title: string) {
    return `${date}|${startMin}|${title.trim().toLowerCase()}`;
  }
  function upsertActualEntry(entry: ActualTimeEntry) {
    const idx = s.actualTimeLog.findIndex((item) => item.id === entry.id);
    if (idx < 0) s.actualTimeLog = [...s.actualTimeLog, entry];
    else {
      const next = [...s.actualTimeLog];
      next[idx] = entry;
      s.actualTimeLog = next;
    }
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
    upsertActualEntry(updated);
    if (wasNew || (wasChanged && nowMin % 5 === 0)) appState.persist();
  }
  function finalizeUnconfirmedForDate(date: string) {
    let changed = false;
    s.actualTimeLog = s.actualTimeLog.map((entry) => {
      if (entry.date !== date || entry.confirmed) return entry;
      changed = true;
      return {
        ...entry,
        confirmed: true,
        confirmedAt: Date.now(),
        autoFinalized: true
      };
    });
    if (changed) appState.persist();
  }
  function confirmActualEntry(id: string) {
    const hit = s.actualTimeLog.find((entry) => entry.id === id);
    if (!hit || hit.confirmed) return;
    upsertActualEntry({
      ...hit,
      confirmed: true,
      confirmedAt: Date.now(),
      autoFinalized: false
    });
    appState.persist();
  }
  function deleteActualEntry(id: string) {
    const before = s.actualTimeLog.length;
    s.actualTimeLog = s.actualTimeLog.filter((entry) => entry.id !== id);
    if (s.actualTimeLog.length !== before) appState.persist();
  }
  async function exportActualHistory() {
    const confirmed = s.actualTimeLog.filter((entry) => entry.confirmed || entry.autoFinalized);
    const jsonl = toJsonl(confirmed);
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

  function syncBodyClasses() {
    const PALETTE_CLASSES = ['sansad','meadow','mlp','bright','clear','psychedelic'];
    document.body.classList.remove(...PALETTE_CLASSES, 'dark', 'sb-collapsed', 'ag-open', 'm-timer', 'm-delar', 'm-plan', 'page-locked');
    if (s.palette) document.body.classList.add(s.palette);
    if (s.dark && s.palette !== 'psychedelic') document.body.classList.add('dark');
    if (s.sbCollapsed) document.body.classList.add('sb-collapsed');
    if (s.agendaOpen) document.body.classList.add('ag-open');
    document.body.classList.add('m-' + mobileTab);
    if (locked) document.body.classList.add('page-locked');
  }

  function renderClock() {
    if (!svgEl) return;
    while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);

    const ct = clockTheme(s.palette, s.dark);
    const { bg, dimSuffix, mark: markColor, centerMain, centerMuted, handDark, handLight, chip: chipFill } = ct;
    const cs = ct.colors;
    const tot = totalMin();
    const sa = startAngle();
    const elapsed = elapsedMin();
    const nowMin = nowMinutes();
    const ri = s.hollow ? Ri : 0;
    const labelDefer: { lx: number; ly: number; fillText: string; text: string }[] = [];

    const use12hAgenda = s.clockSpan === 720 && agendaItems.length > 0;

    if (use12hAgenda) {
      // 12h mode: render agenda sessions at absolute clock positions
      const periodStart = Math.floor(nowMin / 720) * 720;
      agendaItems.forEach((item, i) => {
        const itemEnd = item.startMin + item.totalMin;
        if (itemEnd <= periodStart || item.startMin >= periodStart + 720) return;
        const clampStart = Math.max(item.startMin, periodStart);
        const clampEnd = Math.min(itemEnd, periodStart + 720);
        const a0 = ((clampStart - periodStart) / 720) * 360;
        const a1 = ((clampEnd - periodStart) / 720) * 360;
        if (a1 - a0 < 0.1) return;
        const baseColor = cs[i % cs.length];
        const isPast = nowMin >= itemEnd;
        const isActive = nowMin >= item.startMin && nowMin < itemEnd;
        if (isActive) {
          const splitAngle = ((nowMin - periodStart) / 720) * 360;
          if (splitAngle > a0) {
            const pastP = document.createElementNS(NS, 'path');
            pastP.setAttribute('d', arcPath(a0, Math.min(splitAngle, a1), R, ri));
            pastP.setAttribute('fill', baseColor + dimSuffix);
            svgEl.appendChild(pastP);
          }
          if (splitAngle < a1) {
            const liveP = document.createElementNS(NS, 'path');
            liveP.setAttribute('d', arcPath(Math.max(splitAngle, a0), a1, R, ri));
            liveP.setAttribute('fill', baseColor);
            svgEl.appendChild(liveP);
          }
        } else {
          const path = document.createElementNS(NS, 'path');
          path.setAttribute('d', arcPath(a0, a1, R, ri));
          path.setAttribute('fill', isPast ? baseColor + dimSuffix : baseColor);
          svgEl.appendChild(path);
        }
        // transparent hit-area for click-to-load
        const hit = document.createElementNS(NS, 'path');
        hit.setAttribute('d', arcPath(a0, a1, R, ri));
        hit.setAttribute('fill', 'transparent');
        hit.style.cursor = 'pointer';
        hit.addEventListener('click', () => loadAgendaFlow(item.flow, item.startMin));
        svgEl.appendChild(hit);

        const midAngle = (a0 + a1) / 2;
        const [lx, ly] = s.textOutside ? polar(midAngle, R + 22) : polar(midAngle, ri > 0 ? (R + ri) / 2 : R * 0.65);
        const fillText = labelColorFor(baseColor, i, isPast, s.palette, s.dark);
        const timeLabel = fmtHM(item.startMin);
        const nameLabel = truncate(item.flow.title, 10);
        labelDefer.push({ lx, ly, fillText, text: `${nameLabel} ${timeLabel}` });
      });
    } else {
      // 1h/2h mode: render s.blocks as relative sectors
      let cumMin = 0;
      s.blocks.forEach((b, i) => {
        const segStartMin = cumMin;
        const segEndMin = cumMin + b.minutes;
        const a0 = sa + (segStartMin / s.clockSpan) * 360;
        const a1 = sa + (segEndMin / s.clockSpan) * 360;
        const baseColor = cs[i % cs.length];
        const isPast = elapsed >= segEndMin;
        const isActive = elapsed >= segStartMin && elapsed < segEndMin;
        if (isActive) {
          const splitAngle = sa + (elapsed / s.clockSpan) * 360;
          const pastP = document.createElementNS(NS, 'path');
          pastP.setAttribute('d', arcPath(a0, splitAngle, R, ri));
          pastP.setAttribute('fill', baseColor + dimSuffix);
          svgEl.appendChild(pastP);
          const liveP = document.createElementNS(NS, 'path');
          liveP.setAttribute('d', arcPath(splitAngle, a1, R, ri));
          liveP.setAttribute('fill', baseColor);
          svgEl.appendChild(liveP);
        } else {
          const path = document.createElementNS(NS, 'path');
          path.setAttribute('d', arcPath(a0, a1, R, ri));
          path.setAttribute('fill', isPast ? baseColor + dimSuffix : baseColor);
          svgEl.appendChild(path);
        }
        if (i > 0) {
          const [x0, y0] = polar(a0, ri || 0);
          const [x1, y1] = polar(a0, R);
          const hit = document.createElementNS(NS, 'line');
          hit.setAttribute('x1', String(x0)); hit.setAttribute('y1', String(y0));
          hit.setAttribute('x2', String(x1)); hit.setAttribute('y2', String(y1));
          hit.setAttribute('stroke', 'transparent'); hit.setAttribute('stroke-width', '32');
          hit.setAttribute('pointer-events', 'stroke'); hit.style.cursor = 'grab';
          (hit as any)._boundaryIdx = i - 1;
          hit.addEventListener('pointerdown', startBoundaryDrag);
          svgEl.appendChild(hit);
        }
        const midAngle = (a0 + a1) / 2;
        const [lx, ly] = s.textOutside ? polar(midAngle, R + 22) : polar(midAngle, ri > 0 ? (R + ri) / 2 : R / 2);
        const fillText = labelColorFor(baseColor, i, isPast, s.palette, s.dark);
        let labelText = truncate(b.title, 14);
        if (s.segMinutesMode === 'planned') { labelText += ` ${b.minutes}m`; }
        else if (s.segMinutesMode === 'remaining') {
          const mins = isPast ? 0 : isActive ? Math.max(0, Math.ceil(segEndMin - elapsed)) : b.minutes;
          labelText += ` ${mins}m kvar`;
        }
        labelDefer.push({ lx, ly, fillText, text: labelText });
        cumMin = segEndMin;
      });
    }

    if (s.hollow) {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', String(CX)); c.setAttribute('cy', String(CY));
      c.setAttribute('r', String(Ri - 3)); c.setAttribute('fill', bg);
      svgEl.appendChild(c);
      if (s.showCenterEnd) {
        if (s.clockSpan === 720) {
          const now = new Date();
          const dayNames = ['Söndag','Måndag','Tisdag','Onsdag','Torsdag','Fredag','Lördag'];
          const monthNames = ['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'];
          const t1 = document.createElementNS(NS, 'text');
          t1.setAttribute('x', String(CX)); t1.setAttribute('y', String(CY - 8));
          t1.setAttribute('text-anchor', 'middle'); t1.setAttribute('font-size', '9');
          t1.setAttribute('fill', centerMuted);
          t1.textContent = dayNames[now.getDay()];
          svgEl.appendChild(t1);
          const t2 = document.createElementNS(NS, 'text');
          t2.setAttribute('x', String(CX)); t2.setAttribute('y', String(CY + 11));
          t2.setAttribute('text-anchor', 'middle'); t2.setAttribute('font-size', '17');
          t2.setAttribute('font-weight', '200'); t2.setAttribute('fill', centerMain);
          t2.textContent = `${now.getDate()} ${monthNames[now.getMonth()]}`;
          svgEl.appendChild(t2);
        } else {
          const t1 = document.createElementNS(NS, 'text');
          t1.setAttribute('x', String(CX)); t1.setAttribute('y', String(CY - 8));
          t1.setAttribute('text-anchor', 'middle'); t1.setAttribute('font-size', '11');
          t1.setAttribute('fill', centerMuted); t1.textContent = 'slutar';
          svgEl.appendChild(t1);
          const t2 = document.createElementNS(NS, 'text');
          t2.setAttribute('x', String(CX)); t2.setAttribute('y', String(CY + 12));
          t2.setAttribute('text-anchor', 'middle'); t2.setAttribute('font-size', '20');
          t2.setAttribute('font-weight', '200'); t2.setAttribute('letter-spacing', '-0.5');
          t2.setAttribute('font-variant-numeric', 'tabular-nums'); t2.setAttribute('fill', centerMain);
          t2.textContent = fmtHM(s.startMin + tot);
          svgEl.appendChild(t2);
        }
      }
    }

    if (!use12hAgenda) {
      const [sx0, sy0] = polar(sa, ri || 0);
      const [sx1, sy1] = polar(sa, R);
      const startHit = document.createElementNS(NS, 'line');
      startHit.setAttribute('x1', String(sx0)); startHit.setAttribute('y1', String(sy0));
      startHit.setAttribute('x2', String(sx1)); startHit.setAttribute('y2', String(sy1));
      startHit.setAttribute('stroke', 'transparent'); startHit.setAttribute('stroke-width', '36');
      startHit.setAttribute('pointer-events', 'stroke'); startHit.style.cursor = 'grab';
      startHit.addEventListener('pointerdown', startStartDrag);
      svgEl.appendChild(startHit);
      const lessonSpan = (tot / s.clockSpan) * 360;
      if (lessonSpan < 360 - 2) {
        const aEnd = sa + lessonSpan;
        const [ex0, ey0] = polar(aEnd, ri || 0);
        const [ex1, ey1] = polar(aEnd, R);
        const ehit = document.createElementNS(NS, 'line');
        ehit.setAttribute('x1', String(ex0)); ehit.setAttribute('y1', String(ey0));
        ehit.setAttribute('x2', String(ex1)); ehit.setAttribute('y2', String(ey1));
        ehit.setAttribute('stroke', 'transparent'); ehit.setAttribute('stroke-width', '36');
        ehit.setAttribute('pointer-events', 'stroke'); ehit.style.cursor = 'grab';
        ehit.addEventListener('pointerdown', startEndDrag);
        svgEl.appendChild(ehit);
      }
    }

    const drawMark = (ang: number, len: number, w: number, op: number) => {
      const [mx0, my0] = polar(ang, R);
      const [mx1, my1] = polar(ang, R - len);
      const l = document.createElementNS(NS, 'line');
      l.setAttribute('x1', String(mx0)); l.setAttribute('y1', String(my0));
      l.setAttribute('x2', String(mx1)); l.setAttribute('y2', String(my1));
      l.setAttribute('stroke', markColor); l.setAttribute('stroke-width', String(w));
      l.setAttribute('stroke-linecap', 'round'); l.setAttribute('opacity', String(op));
      l.setAttribute('pointer-events', 'none');
      svgEl.appendChild(l);
    };
    {
      const cs = s.clockSpan;
      if (cs === 720) {
        if (s.showMin)     { for (let m = 0; m < 720; m += 15)  drawMark((m/720)*360, 5,  1,   0.45); }
        if (s.showFive)    { for (let m = 0; m < 720; m += 60)  drawMark((m/720)*360, 11, 1.8, 0.7);  }
        if (s.showQuarter) { for (let m = 0; m < 720; m += 180) drawMark((m/720)*360, 18, 3,   0.95); }
      } else {
        const f = cs / 60;
        if (s.showMin)     { for (let m = 0; m < cs; m += f)    drawMark((m/cs)*360, 5,  1,   0.45); }
        if (s.showFive)    { for (let m = 0; m < cs; m += 5*f)  drawMark((m/cs)*360, 11, 1.8, 0.7);  }
        if (s.showQuarter) { for (let m = 0; m < cs; m += 15*f) drawMark((m/cs)*360, 18, 3,   0.95); }
      }
    }

    if (!use12hAgenda && s.clockSpan === 60) {
      const drawSessionMarker = (ang: number) => {
        const [hx0, hy0] = polar(ang, R + 6);
        const [hx1, hy1] = polar(ang, R - 6);
        const halo = document.createElementNS(NS, 'line');
        halo.setAttribute('x1', String(hx0)); halo.setAttribute('y1', String(hy0));
        halo.setAttribute('x2', String(hx1)); halo.setAttribute('y2', String(hy1));
        halo.setAttribute('stroke', '#fff');
        halo.setAttribute('stroke-width', '3.2');
        halo.setAttribute('stroke-linecap', 'round');
        halo.setAttribute('opacity', '0.38');
        halo.setAttribute('pointer-events', 'none');
        svgEl.appendChild(halo);

        const mark = document.createElementNS(NS, 'line');
        mark.setAttribute('x1', String(hx0)); mark.setAttribute('y1', String(hy0));
        mark.setAttribute('x2', String(hx1)); mark.setAttribute('y2', String(hy1));
        mark.setAttribute('stroke', markColor);
        mark.setAttribute('stroke-width', '1.4');
        mark.setAttribute('stroke-linecap', 'round');
        mark.setAttribute('opacity', '0.95');
        mark.setAttribute('pointer-events', 'none');
        svgEl.appendChild(mark);
      };
      drawSessionMarker(sa);
      drawSessionMarker(sa + (tot / 60) * 360);
    }

    {
      const ang = (nowMin % s.clockSpan / s.clockSpan) * 360;
      const innerR = 30, tipR = R + 2, baseWidth = 22;
      const [tx, ty] = polar(ang, tipR);
      const aRad = (ang - 90) * Math.PI / 180;
      const dx = Math.cos(aRad), dy = Math.sin(aRad);
      const px = -dy, py = dx;
      const cxB = CX + dx * innerR, cyB = CY + dy * innerR;
      const halfW = baseWidth / 2;
      const bx1 = cxB + px * halfW, by1 = cyB + py * halfW;
      const bx2 = cxB - px * halfW, by2 = cyB - py * halfW;
      const nowInView = nowMin >= s.startMin && nowMin < s.startMin + s.clockSpan;
      const spike = document.createElementNS(NS, 'polygon');
      spike.setAttribute('points', `${tx},${ty} ${bx1},${by1} ${bx2},${by2}`);
      spike.setAttribute('fill', handDark); spike.setAttribute('stroke', handLight);
      spike.setAttribute('stroke-width', '1.5'); spike.setAttribute('stroke-linejoin', 'round');
      spike.setAttribute('opacity', nowInView ? '1' : '0.1');
      svgEl.appendChild(spike);
    }

    if (s.showSegLabels) {
      labelDefer.forEach(({ lx, ly, fillText, text }) => {
        const t = document.createElementNS(NS, 'text');
        t.setAttribute('x', String(lx)); t.setAttribute('y', String(ly));
        t.setAttribute('text-anchor', 'middle'); t.setAttribute('dominant-baseline', 'middle');
        t.setAttribute('font-size', s.textOutside ? '14' : '13');
        t.setAttribute('font-weight', '600'); t.setAttribute('fill', fillText);
        t.setAttribute('pointer-events', 'none');
        t.textContent = text;
        svgEl.appendChild(t);
        try {
          const bb = t.getBBox();
          const padX = 6, padY = 1.5;
          const chip = document.createElementNS(NS, 'rect');
          chip.setAttribute('x', String(bb.x - padX)); chip.setAttribute('y', String(bb.y - padY));
          chip.setAttribute('width', String(bb.width + padX * 2));
          chip.setAttribute('height', String(bb.height + padY * 2));
          chip.setAttribute('rx', '3'); chip.setAttribute('fill', chipFill);
          chip.setAttribute('stroke', fillText); chip.setAttribute('stroke-width', '1');
          chip.setAttribute('opacity', '0.95'); chip.setAttribute('pointer-events', 'none');
          svgEl.insertBefore(chip, t);
        } catch { /* getBBox may fail */ }
      });
    }
  }

  // ── Drag ──
  type DragState =
    | { type: 'between'; i: number; leftMin: number; rightMin: number }
    | { type: 'end' }
    | { type: 'start'; startMin0: number; endMin0: number; pointerAng0: number };
  let drag: DragState | null = null;

  function pointerAngle(e: PointerEvent): number {
    const rect = svgEl.getBoundingClientRect();
    const scale = rect.width / 360;
    const x = e.clientX - rect.left - CX * scale;
    const y = e.clientY - rect.top - CY * scale;
    let ang = Math.atan2(y, x) * 180 / Math.PI + 90;
    if (ang < 0) ang += 360;
    return ang;
  }

  function startBoundaryDrag(e: Event) {
    if (isViewMode || locked) return;
    const pe = e as PointerEvent;
    pe.preventDefault();
    const i = (pe.target as any)._boundaryIdx as number;
    drag = { type: 'between', i, leftMin: s.blocks[i].minutes, rightMin: s.blocks[i+1].minutes };
    window.addEventListener('pointermove', onDrag);
    window.addEventListener('pointerup', endDrag);
  }
  function startEndDrag(e: Event) {
    if (isViewMode || locked) return;
    (e as PointerEvent).preventDefault();
    drag = { type: 'end' };
    window.addEventListener('pointermove', onDrag);
    window.addEventListener('pointerup', endDrag);
  }
  function startStartDrag(e: Event) {
    if (isViewMode || locked) return;
    const pe = e as PointerEvent;
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
      renderEndControl(); renderClock(); return;
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
    renderEndControl(); renderClock(); return;
    }
    const targetCumMin = (rel / 360) * s.clockSpan;
    let cumBefore = 0;
    for (let k = 0; k < drag.i; k++) cumBefore += s.blocks[k].minutes;
    let newLeft = targetCumMin - cumBefore;
    const pair = drag.leftMin + drag.rightMin;
    newLeft = Math.max(2, Math.min(pair - 2, newLeft));
    s.blocks[drag.i].minutes = Math.round(newLeft);
    s.blocks[drag.i + 1].minutes = pair - Math.round(newLeft);
    renderEndControl(); renderClock();
  }

  function syncTimerToAgenda() {
    const active = resolveAgendaFlowRef(agendaDays, activeAgendaFlowRef);
    if (!active || !agendaDays) return;
    const { dayIdx, flowIdx } = active;
    const oldKey = activeAgendaFlowRef ? makeAgendaMetaKeyForRef(activeAgendaFlowRef) : null;
    const newDays = agendaDays.map((d, di) => di !== dayIdx ? d : {
      ...d,
      flows: d.flows.map((f, fi) => fi !== flowIdx ? f : {
        ...f,
        title: s.dayTitle,
        startMin: s.startMin,
        minutes: s.blocks.map(b => b.minutes),
        parts: s.blocks.map(b => b.title),
        notes: s.blocks.map(b => b.note),
        warnings: s.blocks.map(b => b.warning),
        extraInfo: s.extraInfo,
      }),
    });
    setActiveAgendaText(serializeAgenda(newDays));
    activeAgendaFlowRef = {
      ...activeAgendaFlowRef!,
      title: s.dayTitle,
      startMin: s.startMin,
      totalMin: totalMin(),
      partCount: s.blocks.length
    };
    if (oldKey && activeAgendaFlowRef) moveAgendaMeta(oldKey, makeAgendaMetaKeyForRef(activeAgendaFlowRef));
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

  // ── End control ──
  function renderEndControl() {
    if (!endControlEl) return;
    endControlEl.innerHTML = '';
    const style = 'background:var(--menu-surface);color:var(--menu-fg);border:1px solid var(--menu-border);border-radius:8px;padding:8px 10px;font-size:14px;width:100%;font-family:inherit;';
    if (endMode === 'end') {
      const inp = document.createElement('input');
      inp.type = 'time'; inp.value = fmtHM(s.startMin + totalMin()); inp.style.cssText = style;
      inp.addEventListener('input', () => {
        const [h, m] = inp.value.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return;
        let end = h * 60 + m;
        if (end <= s.startMin) end += 24 * 60;
        const diff = end - s.startMin;
        if (diff < s.blocks.length * 2) return;
        scaleMinutesTo(diff);
        renderClock(); updateTimeFeedback();
        syncTimerToAgenda(); appState.persist();
        notifyPanelMutation(s.activeSection === 'plan' ? 'plan' : 'now');
      });
      endControlEl.appendChild(inp);
    } else {
      const inp = document.createElement('input');
      inp.type = 'number'; inp.min = String(s.blocks.length * 2); inp.value = String(totalMin()); inp.style.cssText = style;
      inp.addEventListener('input', () => {
        const v = Number(inp.value);
        if (!v || v < s.blocks.length * 2) return;
        scaleMinutesTo(v);
        renderClock(); updateTimeFeedback();
        syncTimerToAgenda(); appState.persist();
        notifyPanelMutation(s.activeSection === 'plan' ? 'plan' : 'now');
      });
      endControlEl.appendChild(inp);
    }
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
      finalizeUnconfirmedForDate(lastSeenDate);
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
    renderClock();
    checkWarnings();
  }

  function handlePartsInput(input: string) {
    partsDraft = input;
    partsDraftDirty = true;
    const result = parseParts(input, s.blocks);
    s.blocks = result.blocks;
    if (result.dayTitle) s.dayTitle = result.dayTitle;
    s.extraInfo = result.extraInfo;
    updateTimeFeedback();
    renderEndControl();
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

    if (e.key === 'Enter') {
      e.preventDefault();
      const start = node.selectionStart ?? 0;
      const end = node.selectionEnd ?? start;
      const value = node.value;
      const insert = '\n';
      const next = value.slice(0, start) + insert + value.slice(end);
      replaceTextareaSelection(node, next, start + insert.length);
    }
  }

  function saveFlow() {
    const title = s.dayTitle.trim() || 'Utan rubrik';
    if (!s.flows) s.flows = [];
    const existing = s.flows.find(f => f.title === title);
    const data = {
      id: existing ? existing.id : 'f-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      title,
      parts: s.blocks.map(b => b.title),
      minutes: s.blocks.map(b => b.minutes),
      warnings: s.blocks.map(b => b.warning),
      notes: s.blocks.map(b => b.note),
      extraInfo: s.extraInfo || '',
    };
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
    let days: AgendaDay[] = agendaDays
      ? agendaDays.map(d => ({ ...d, flows: [...d.flows] }))
      : [];

    let dayIdx = days.findIndex(d => d.date === date);
    if (dayIdx < 0) {
      const insertAt = days.findIndex(d => d.date !== null && d.date > date);
      const newDay: AgendaDay = { date, flows: [] };
      if (insertAt < 0) { days.push(newDay); dayIdx = days.length - 1; }
      else { days.splice(insertAt, 0, newDay); dayIdx = insertAt; }
    }

    const dayFlows = [...days[dayIdx].flows];
    const insertAt = dayFlows.findIndex(fl => (fl.startMin ?? 0) > startMin);
    if (insertAt < 0) { dayFlows.push(flowToAdd); }
    else { dayFlows.splice(insertAt, 0, flowToAdd); }

    days[dayIdx] = { ...days[dayIdx], flows: dayFlows };
    setActiveAgendaText(serializeAgenda(days));
    setActiveAgendaDate(date);
    if (meta) setAgendaMeta(makeAgendaMetaKeyForFlow(date, flowToAdd, flowToAdd.startMin ?? startMin), meta);
    if (activate) {
      activeAgendaFlowRef = makeAgendaFlowRef(date, flowToAdd, flowToAdd.startMin ?? startMin);
      sessionSource = { kind: 'agenda', date, title: flowToAdd.title, startMin: flowToAdd.startMin ?? startMin };
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
    s.dayTitle = f.title;
    s.blocks = f.parts.map((title, i) => ({
      id: Math.random().toString(36).slice(2, 9),
      title, minutes: f.minutes[i] ?? 45,
      note: f.notes?.[i] ?? '', warning: f.warnings?.[i] ?? false, pinned: true,
    }));
    s.extraInfo = f.extraInfo || '';
    if (targetSection === 'plan') {
      const targetDate = selectedDay?.date ?? activeAgendaDate() ?? localDateISO();
      s.startMin = suggestedStartMinForDate(targetDate, totalFlowMinutes(f));
    }
    warnedSet.clear();
    updateTimeFeedback(); renderEndControl();
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
    addFlowToAgendaDate(targetDate, f, false, { source: 'template', label: f.title }, suggestedStartMinForDate(targetDate, totalFlowMinutes(f)));
    savedFlowMsg = 'Tillagd i dagplan ✓';
    setTimeout(() => { savedFlowMsg = ''; }, 2000);
    if (loggedInUser) syncSave();
  }

  function mergeAgendaDayData(existing: string, incoming: AgendaDay[]): AgendaDay[] {
    const baseDays = existing.trim() ? parseAgenda(existing) : [];
    const dayMap = new Map<string, AgendaDay>();

    for (const day of baseDays) {
      dayMap.set(day.date ?? `undated-${dayMap.size}`, { ...day, flows: [...day.flows] });
    }

    for (const day of incoming) {
      const key = day.date ?? `undated-${dayMap.size}`;
      const existingDay = dayMap.get(key);
      if (!existingDay) {
        dayMap.set(key, { ...day, flows: [...day.flows] });
        continue;
      }

      const mergedFlows = [...existingDay.flows];
      for (const flow of day.flows) {
        const replaceIdx = mergedFlows.findIndex(existingFlow =>
          existingFlow.startMin === flow.startMin && existingFlow.title === flow.title
        );
        if (replaceIdx >= 0) mergedFlows[replaceIdx] = flow;
        else mergedFlows.push(flow);
      }
      mergedFlows.sort((a, b) => (a.startMin ?? 0) - (b.startMin ?? 0) || a.title.localeCompare(b.title));
      dayMap.set(key, { ...existingDay, flows: mergedFlows });
    }

    return [...dayMap.values()].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  }

  function deleteFlow(id: string) {
    if (!confirm(`Radera flödet?`)) return;
    s.flows = s.flows.filter(f => f.id !== id);
    appState.persist();
  }

  const SYNC_TOKEN_STORAGE = 'timer-sync-token';
  let syncStatusTimer: ReturnType<typeof setTimeout>;

  function persistShareState(token: string, ownerToken: string, mode: ShareMode) {
    writeSessionValue(SHARE_TOKEN_STORAGE, token);
    writeSessionValue(SHARE_OWNER_STORAGE, ownerToken);
    writeSessionValue(SHARE_MODE_STORAGE, mode);
  }

  function clearPersistedShareState() {
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

  async function syncLoad() {
    const token = s.syncKey || '';
    if (!validateSyncToken(token)) { showSyncStatus('Inte inloggad', true); return; }
    try {
      const res = await fetch('/api/sync', {
        headers: { 'x-sync-token': token }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      // Merge flows: cloud wins for same ID, keep local-only flows
      const cloudFlows: Flow[] = data.flows || [];
      const cloudIds = new Set(cloudFlows.map((f: Flow) => f.id));
      const localOnly = (s.flows || []).filter(f => !cloudIds.has(f.id));
      s.flows = [...cloudFlows, ...localOnly];
      // Restore agenda from cloud if it has content
      if ('agendaText' in data) {
        s.agendaText = data.agendaText;
        s.agendaDate = data.agendaDate || '';
      }
      if ('agendaText2' in data) {
        s.agendaText2 = data.agendaText2;
        s.agendaDate2 = data.agendaDate2 || '';
      }
      if (data.agendaMeta && typeof data.agendaMeta === 'object') {
        s.agendaMeta = data.agendaMeta;
      }
      if (Array.isArray(data.actualTimeLog)) {
        s.actualTimeLog = data.actualTimeLog;
      }
      activeAgendaFlowRef = null;
      sessionSource = { kind: 'unscheduled' };
      capturePanelBaseline('now');
      capturePanelBaseline('plan');
      appState.persist();
      showSyncStatus('Laddat från moln ✓');
    } catch { showSyncStatus('Kunde inte ladda', true); }
  }

  async function syncSave() {
    const token = s.syncKey || '';
    if (!validateSyncToken(token)) { showSyncStatus('Inte inloggad', true); return; }
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sync-token': token
        },
        body: JSON.stringify({
          flows: s.flows || [],
          agendaText: s.agendaText || '',
          agendaDate: s.agendaDate || '',
          agendaText2: s.agendaText2 || '',
          agendaDate2: s.agendaDate2 || '',
          agendaMeta: s.agendaMeta || {},
          actualTimeLog: s.actualTimeLog || [],
        }),
      });
      if (!res.ok) throw new Error();
      showSyncStatus('Sparat till moln ✓');
    } catch { showSyncStatus('Kunde inte spara', true); }
  }

  async function login() {
    const name = loginName.trim();
    const pass = loginPass.trim();
    if (!name || !pass) { showSyncStatus('Ange namn och lösenord', true); return; }
    s.syncKey = await deriveSyncToken(name, pass);
    loggedInUser = name;
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

  function sharedUiState() {
    return {
      palette: s.palette,
      dark: s.dark,
      showLeft: s.showLeft,
      showCenterEnd: s.showCenterEnd,
      hollow: s.hollow,
      textOutside: s.textOutside,
      showMin: s.showMin,
      showFive: s.showFive,
      showQuarter: s.showQuarter,
      segMinutesMode: s.segMinutesMode,
      showSegNotes: s.showSegNotes,
      showExtraInfo: s.showExtraInfo,
      showSegLabels: s.showSegLabels,
    };
  }

  function buildLiveShareState() {
    return {
      shareType: 'active-session-live' as const,
      ...sharedUiState(),
      blocks: cloneBlocks(s.blocks),
      dayTitle: s.dayTitle,
      extraInfo: s.extraInfo,
      startMin: s.startMin,
      endMode: s.endMode,
      clockSpan: s.clockSpan,
      agendaText: s.agendaText,
      agendaDate: s.agendaDate,
    };
  }

  function buildSelectedSessionSnapshot() {
    if (!selectedAgendaDetails) return null;
    const { day, flow, startMin } = selectedAgendaDetails;
    return {
      shareType: 'selected-session-snapshot' as const,
      ...sharedUiState(),
      blocks: flow.parts.map((title, i) => ({
        id: uid(),
        title,
        minutes: flow.minutes[i] ?? 45,
        note: flow.notes?.[i] ?? '',
        warning: flow.warnings?.[i] ?? true,
        pinned: true
      })),
      dayTitle: flow.title,
      extraInfo: flow.extraInfo || '',
      startMin,
      endMode: 'end' as const,
      clockSpan: 60 as const,
      agendaText: serializeAgenda([{ date: day.date ?? null, flows: [{ ...flow }] }]),
      agendaDate: day.date ?? '',
    };
  }

  function buildSelectedDaySnapshot() {
    if (!selectedDay?.date) return null;
    const flows = selectedDay.flows.map(flow => ({ ...flow }));
    const first = selectedAgendaDetails?.flow ?? selectedDay.flows[0] ?? null;
    const firstStart = selectedAgendaDetails?.startMin ?? selectedDay.flows[0]?.startMin ?? agendaDayStart;
    return {
      shareType: 'selected-day-snapshot' as const,
      ...sharedUiState(),
      blocks: first
        ? first.parts.map((title, i) => ({
            id: uid(),
            title,
            minutes: first.minutes[i] ?? 45,
            note: first.notes?.[i] ?? '',
            warning: first.warnings?.[i] ?? true,
            pinned: true
          }))
        : cloneBlocks(s.blocks),
      dayTitle: first?.title ?? fmtAgendaDate(selectedDay.date),
      extraInfo: first?.extraInfo ?? '',
      startMin: firstStart,
      endMode: 'end' as const,
      clockSpan: 720 as const,
      agendaText: serializeAgenda([{ date: selectedDay.date, flows }]),
      agendaDate: selectedDay.date,
    };
  }

  let lastPushedHash = '';

  async function pushShareState() {
    if (!shareToken || !shareOwnerToken || shareMode !== 'active-session-live') return;
    const state = buildLiveShareState();
    const hash = JSON.stringify(state);
    if (hash === lastPushedHash) return;
    try {
      const res = await fetch(`/api/share?token=${encodeURIComponent(shareToken)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-share-owner': shareOwnerToken
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
      shareMode = d.shareType ?? 'active-session-live';
      if (d.blocks) s.blocks = d.blocks;
      if (d.dayTitle !== undefined) s.dayTitle = d.dayTitle;
      if (d.extraInfo !== undefined) s.extraInfo = d.extraInfo;
      if (d.startMin !== undefined) s.startMin = d.startMin;
      if (d.endMode) s.endMode = d.endMode;
      if (d.clockSpan) s.clockSpan = d.clockSpan;
      if (d.palette) s.palette = d.palette;
      if (d.dark !== undefined) s.dark = d.dark;
      if (d.showLeft !== undefined) s.showLeft = d.showLeft;
      if (d.showCenterEnd !== undefined) s.showCenterEnd = d.showCenterEnd;
      if (d.hollow !== undefined) s.hollow = d.hollow;
      if (d.textOutside !== undefined) s.textOutside = d.textOutside;
      if (d.showMin !== undefined) s.showMin = d.showMin;
      if (d.showFive !== undefined) s.showFive = d.showFive;
      if (d.showQuarter !== undefined) s.showQuarter = d.showQuarter;
      if (d.segMinutesMode) s.segMinutesMode = d.segMinutesMode;
      if (d.showSegNotes !== undefined) s.showSegNotes = d.showSegNotes;
      if (d.showExtraInfo !== undefined) s.showExtraInfo = d.showExtraInfo;
      if (d.showSegLabels !== undefined) s.showSegLabels = d.showSegLabels;
      if (d.agendaText !== undefined) s.agendaText = d.agendaText;
      if (d.agendaDate !== undefined) s.agendaDate = d.agendaDate;
      if (d.shareType === 'selected-day-snapshot') {
        s.clockSpan = 720;
      }
      syncBodyClasses();
    } catch { /* silent */ }
  }

  async function startSharing(mode: ShareMode) {
    const payload = mode === 'active-session-live'
      ? buildLiveShareState()
      : mode === 'selected-session-snapshot'
        ? buildSelectedSessionSnapshot()
        : buildSelectedDaySnapshot();
    if (!payload) return;
    const tokens = createShareTokens();
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
      shareToken = tokens.viewToken;
      shareOwnerToken = tokens.ownerToken;
      shareMode = mode;
      lastPushedHash = mode === 'active-session-live' ? hash : '';
      persistShareState(tokens.viewToken, tokens.ownerToken, mode);
    } catch {
      showSyncStatus('Kunde inte starta delning', true);
    }
  }

  async function stopSharing() {
    if (!shareToken || !shareOwnerToken) return;
    try {
      await fetch(`/api/share?token=${encodeURIComponent(shareToken)}`, {
        method: 'DELETE',
        headers: { 'x-share-owner': shareOwnerToken }
      });
    } catch { /* silent */ }
    shareToken = '';
    shareOwnerToken = '';
    shareMode = null;
    lastPushedHash = '';
    clearPersistedShareState();
  }

  async function copyShareLink() {
    const link = `${pageOrigin}/?view=${shareToken}`;
    await navigator.clipboard.writeText(link);
    shareCopyText = '✓ Kopierad!';
    setTimeout(() => { shareCopyText = 'Kopiera länk'; }, 2000);
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
    rebuildAgendaMetaForDay(
      targetDate,
      previousDay,
      nextDays.find(day => day.date === targetDate) ?? null,
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
      rebuildAgendaMetaForDay(day.date ?? null, previousDay, mergedDay, { overridesBySignature });
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

  function startBlockEdit(id: string, field: 'name' | 'min') {
    if (isViewMode) return;
    editingBlockId = id;
    editingBlockField = field;
  }

  function commitBlockEdit() {
    editingBlockId = null;
    editingBlockField = null;
    updateTimeFeedback();
    renderEndControl();
    syncTimerToAgenda();
    partsDraftDirty = false;
    appState.persist();
    notifyPanelMutation(s.activeSection === 'plan' ? 'plan' : 'now');
  }

  function addBlock() {
    if (isViewMode) return;
    const newId = uid();
    s.blocks = [...s.blocks, { id: newId, title: 'Ny aktivitet', minutes: 10, note: '', warning: true, pinned: false }];
    updateTimeFeedback();
    renderEndControl();
    syncTimerToAgenda();
    partsDraftDirty = false;
    appState.persist();
    notifyPanelMutation(s.activeSection === 'plan' ? 'plan' : 'now');
    editingBlockId = newId;
    editingBlockField = 'name';
  }

  function aiPayload(extra: Record<string, unknown>) {
    return {
      provider: aiConfig.provider,
      apiKey: aiConfig.apiKey,
      planMode: aiConfig.planMode,
      ...(aiConfig.provider === 'custom' ? { baseUrl: aiConfig.baseUrl, customModel: aiConfig.customModel } : {}),
      ...extra
    };
  }

  async function runAiParts() {
    if (!aiInput.trim()) return;
    aiLoading = true; aiError = '';
    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiPayload({ message: aiInput, mode: 'parts', context: { startMin: s.startMin } }))
      });
      const data = await res.json();
      if (data.error) { aiError = data.error; return; }
      handlePartsInput(data.text);
      aiPanelOpen = false;
      aiInput = '';
    } catch { aiError = 'Nätverksfel'; }
    finally { aiLoading = false; }
  }

  async function runAiAgenda() {
    if (!agendaAiInput.trim()) return;
    agendaAiLoading = true; agendaAiError = '';
    try {
      const todayISO = localDateISO();
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiPayload({ message: agendaAiInput, mode: 'agenda', context: { date: todayISO } }))
      });
      const data = await res.json();
      if (data.error) { agendaAiError = data.error; return; }
      setActiveAgendaText(data.text);
      const aiDays = parseAgenda(data.text);
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
    } catch { agendaAiError = 'Nätverksfel'; }
    finally { agendaAiLoading = false; }
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
      }
    }
  }

  function endAgendaDrag() {
    agendaDragState = null;
    window.removeEventListener('pointermove', onAgendaDrag);
    window.removeEventListener('pointerup', endAgendaDrag);
    setTimeout(() => { agendaDragMoved = false; }, 0);
    appState.persist();
  }

  const AI_PROMPT_PARTS = `Du är en hjälpsam planeringsassistent för en visuell timer.

Målet är inte bara att formatera texten, utan att göra planen mer genomförbar och lugn.
Tänk som en omtänksam lärare eller coach: föreslå rimlig ordning, lägg till små övergångar när det behövs och påpeka kort när något verkar tajt eller saknas.

Returnera BARA en lista i detta format:
- aktiviteter på egna rader
- underpunkter börjar med -
- kommentarer börjar med &
- inga rubriker, ingen inledning, ingen avslutning

Exempel:
Vakna 5m

Toa 5m
- ta med telefonen

Medicin 2m

Frukost 20m
- kolla inte skärm

& Om du vill hinna i tid kan det vara bra att lägga in 5 min buffert efter frukost.

Regler:
- Håll aktiviteterna korta och svenska, max 3 ord per namn
- Föreslå en rimlig ordning om användaren skriver saker huller om buller
- Lägg gärna till små saker som förberedelse, hämtning, paus eller ställtid om det gör planen mer realistisk
- Om något känns stressigt, skriv en kort kommentarrad med ett konkret tips
- Om något verkar saknas, fyll gärna på med 1-3 rimliga steg
- Var hjälpsam och tydlig, men håll formatet enkelt nog att kunna läsas i timern

---

[Klistra in dina aktiviteter här]`;

  const AI_PROMPT_AGENDA = `Du är en hjälpsam planeringsassistent för hela eller delar av en dag.

Ditt jobb är att göra planen realistisk, tydlig och snäll mot användarens energi.
Om användaren beskriver en lös idé, hjälper du till att strukturera dagen, lägga in pauser och föreslå bra övergångar.
Om något är oklart, gör ett klokt antagande och markera det kort i en kommentar.

Returnera BARA en dagplan i detta format:
- datumrad med @YYMMDD
- sessionsrubriker som #Rubrik HH:MM
- aktiviteter på egna rader med tid
- underpunkter börjar med -
- dagskommentarer börjar med &
- inga förklaringar eller extra text utanför formatet

Exempel:
@260509
#Morgonrutin 07:00
Vakna 5m
Toa 5m
Frukost 20m
- kolla inte skärm
Förberedelse 10m

#Arbetspass 09:00
Planering 10m
Epost 20m
Djuparbete 60m
- stäng av notiser
Paus 10m
Uppföljning 15m

& Det här upplägget ser hållbart ut, men lägg gärna in en kort paus efter första arbetspasset om dagen blir lång.

Regler:
- Var realistisk och gärna lite generös med tid
- Lägg till ställtid, pauser och övergångar när det förbättrar flödet
- Gör dagen begriplig, inte bara korrekt
- Om användaren verkar ha glömt något viktigt, lägg till det som ett kort råd i en &-rad
- Håll svenska namn korta, helst max 3 ord per aktivitet
- Behåll formatet strikt nog att appen kan läsa det

---

[Beskriv din dag här]`;

  const currentAiPrompt = $derived(
    s.agendaOpen && s.clockSpan === 720 ? AI_PROMPT_AGENDA : AI_PROMPT_PARTS
  );

  function syncPartsDraftFromState(force = false) {
    const source = serializeBlocks(s.blocks, s.dayTitle, s.extraInfo);
    if (force || !partsDraftDirty) {
      partsDraft = source;
      partsDraftDirty = false;
    }
  }

  function syncAgendaDraftFromState(force = false) {
    const currentDate = selectedDay?.date ?? activeAgendaDate() ?? localDateISO();
    const source = serializeSelectedAgendaDay(currentDate, agendaDays);
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

  onMount(() => {
    pageOrigin = window.location.origin;
    const handleViewport = () => {
      showAgendaOverlay = window.innerWidth > 980;
    };
    handleViewport();
    const helpShortcut = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.altKey && !e.ctrlKey && (e.code === 'KeyI' || e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        s.showHelpHints = !s.showHelpHints;
        appState.persist();
      }
    };
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

    const savedShare = readSessionValue(SHARE_TOKEN_STORAGE);
    const savedShareOwner = readSessionValue(SHARE_OWNER_STORAGE);
    const savedShareMode = readSessionValue(SHARE_MODE_STORAGE);
    if (savedShare && savedShareOwner) {
      shareToken = savedShare;
      shareOwnerToken = savedShareOwner;
      shareMode = (savedShareMode as ShareMode | null) ?? 'active-session-live';
    } else {
      clearPersistedShareState();
    }

    if (!localStorage.getItem('day_timer_v1')) {
      const d = new Date();
      s.startMin = d.getHours() * 60;
      s.showControls = true;
    }
    // On touch devices with narrow viewport (iPad portrait range), close agenda to avoid crowding
    if (navigator.maxTouchPoints > 1 && window.innerWidth < 1100 && window.innerWidth > 800) {
      s.agendaOpen = false;
      appState.persist();
    }
    syncBodyClasses();
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
      if (!sourceToken) return;
      const existingHashedToken = validateSyncToken(sourceToken) ? sourceToken : null;
      if (existingHashedToken) {
        s.syncKey = existingHashedToken;
        writeSessionValue(SYNC_TOKEN_STORAGE, existingHashedToken);
        localStorage.removeItem(SYNC_TOKEN_STORAGE);
        return;
      }
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
    };
    void migrateLegacyToken();
    const savedUser = localStorage.getItem('timer-login-user');
    if (savedUser) loggedInUser = savedUser;
    const savedAiConfig = localStorage.getItem(AI_CONFIG_STORAGE);
    if (savedAiConfig) {
      try { aiConfig = { ...aiConfig, ...JSON.parse(savedAiConfig) }; } catch { /* ignore */ }
    }
    const savedAiKey = readSessionValue(AI_KEY_SESSION_STORAGE) ?? localStorage.getItem('daytimer_ai_key');
    if (savedAiKey) {
      aiConfig = { ...aiConfig, apiKey: savedAiKey };
      writeSessionValue(AI_KEY_SESSION_STORAGE, savedAiKey);
      localStorage.removeItem('daytimer_ai_key');
    }
    renderEndControl();
    updateTimeFeedback();
    capturePanelBaseline('now');
    capturePanelBaseline('plan');
    calendarMonthCursor = monthKey(parseIsoDate(selectedDay?.date ?? localDateISO()));
    tick();
    const id = setInterval(tick, 1000);
    document.addEventListener('keydown', helpShortcut, true);
    document.addEventListener('keyup', helpShortcut, true);

    function handleOutsideClick(e: MouseEvent) {
      if (!(e.target as Element).closest('.mini-menu-shell')) optionsMenuOpen = false;
    }
    document.addEventListener('click', handleOutsideClick);

    function handleKeydown(e: KeyboardEvent) {
      if (e.altKey && e.shiftKey && (e.key === 'R' || e.key === 'r')) {
        e.preventDefault();
        if (confirm('Återställ timern? All sparad data raderas.')) appState.reset();
      }
      if (e.altKey && !e.ctrlKey && !e.shiftKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        if (!isViewMode) {
          const order = ['school', 'school+private', 'private', 'private+school'] as const;
          agendaDraft = '';
          s.agendaView = order[(order.indexOf(s.agendaView as typeof order[number]) + 1) % order.length];
          appState.persist();
        }
      }
    }
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('resize', handleViewport);

    return () => {
      clearInterval(id);
      if (viewPollId) clearInterval(viewPollId);
      if (viewVisibilityHandler) document.removeEventListener('visibilitychange', viewVisibilityHandler);
      resizeObservers.forEach(ro => ro.disconnect());
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', helpShortcut, true);
      document.removeEventListener('keyup', helpShortcut, true);
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
    if (s.activeSection === 'plan') {
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
    if (!shareToken || shareMode !== 'active-session-live') return;
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
    renderClock();
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
    s.dayTitle = active.flow.title;
    s.blocks = active.flow.parts.map((title, i) => ({
      id: uid(),
      title,
      minutes: active.flow.minutes[i] ?? 45,
      note: active.flow.notes?.[i] ?? '',
      warning: active.flow.warnings?.[i] ?? false,
      pinned: (active.flow.minutes[i] ?? 0) > 0,
    }));
    s.extraInfo = active.flow.extraInfo || '';
    s.startMin = active.flow.startMin ?? active.startMin;
    warnedSet.clear();
    activeAgendaFlowRef = selectedDay
      ? makeAgendaFlowRef(selectedDay.date ?? null, active.flow, s.startMin)
      : null;
    planSelectionExplicit = false;
    sessionSource = activeAgendaFlowRef
      ? { kind: 'agenda', date: selectedDay?.date ?? null, title: active.flow.title, startMin: s.startMin }
      : { kind: 'unscheduled' };
    updateTimeFeedback();
    renderEndControl();
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
    if (selectedAgendaDetails?.dayIdx === move.dayIdx) {
      const updatedDay = newDays[move.dayIdx];
      const updatedItems = buildAgendaItemsForDay(updatedDay, agendaDayStart);
      const updatedItem = updatedItems.find(item => item.flow.id === selectedAgendaDetails.flow.id) ?? updatedItems.find(item => item.flow.title === selectedAgendaDetails.flow.title);
      if (updatedItem) {
        activeAgendaFlowRef = makeAgendaFlowRef(updatedDay.date ?? null, updatedItem.flow, updatedItem.startMin);
      }
    }
    appState.persist();
    setTimeout(() => { agendaDragMoved = false; }, 0);
  }

  function loadAgendaFlow(flow: Flow, computedStart: number, targetSection: AppSection = 'plan', markExplicitSelection = true) {
    s.dayTitle = flow.title;
    s.blocks = flow.parts.map((title, i) => ({
      id: uid(),
      title,
      minutes: flow.minutes[i] ?? 45,
      note: flow.notes?.[i] ?? '',
      warning: flow.warnings?.[i] ?? false,
      pinned: flow.minutes[i] > 0,
    }));
    s.extraInfo = flow.extraInfo || '';
    s.startMin = flow.startMin ?? computedStart;
    s.clockSpan = 60;
    warnedSet.clear();
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
    updateTimeFeedback(); renderEndControl(); appState.persist();
  }

  function goToTimerNow() {
    const now = nowMinutes();
    if (agendaDays && selectedDay) {
      const flows = selectedDay.flows;
      // Derive day-start independently of s.startMin (which changes on manual loads).
      // Strategy: find the first flow with an explicit time and work backwards.
      let t: number;
      const firstExplicitIdx = flows.findIndex(f => f.startMin !== undefined);
      if (firstExplicitIdx >= 0) {
        t = flows[firstExplicitIdx].startMin!;
        for (let i = firstExplicitIdx - 1; i >= 0; i--) {
          t -= flows[i].minutes.reduce((a, b) => a + b, 0);
        }
      } else {
        t = agendaDayStart;
      }
      for (const flow of flows) {
        if (flow.startMin !== undefined) t = flow.startMin;
        const totalMin = flow.minutes.reduce((a, b) => a + b, 0);
        if (now >= t && now < t + totalMin) {
          loadAgendaFlow(flow, t, 'now', false);
          return;
        }
        t += totalMin;
      }
    }
    // No block covers now — create one from the current timer state
    const roundedNow = Math.round(now / 5) * 5;
    const newFlow: Flow = {
      id: uid(),
      title: s.dayTitle || 'Session',
      startMin: roundedNow,
      parts: s.blocks.map(b => b.title),
      minutes: s.blocks.map(b => b.minutes),
      warnings: s.blocks.map(b => b.warning),
      notes: s.blocks.map(b => b.note),
      extraInfo: s.extraInfo,
      lastUsed: Date.now(),
    };
    const today = localDateISO();
    const existingText = activeAgendaText();
    const days = existingText.trim() ? parseAgenda(existingText) : [];
    let todayEntry = days.find(d => d.date === today);
    if (!todayEntry) {
      todayEntry = { date: today, flows: [] };
      const insertAt = days.findIndex(d => d.date !== null && d.date > today);
      if (insertAt < 0) { days.push(todayEntry); }
      else { days.splice(insertAt, 0, todayEntry); }
    }
    const insertFlowAt = todayEntry.flows.findIndex(
      f => f.startMin !== undefined && f.startMin > roundedNow
    );
    if (insertFlowAt < 0) { todayEntry.flows.push(newFlow); }
    else { todayEntry.flows.splice(insertFlowAt, 0, newFlow); }
    setActiveAgendaText(serializeAgenda(days));
    setActiveAgendaDate(today);
    lastAutoLoadKey = '';
    loadAgendaFlow(newFlow, roundedNow, 'now', false);
    activeAgendaFlowRef = makeAgendaFlowRef(today, newFlow, roundedNow);
    sessionSource = { kind: 'agenda', date: today, title: newFlow.title, startMin: roundedNow };
    capturePanelBaseline('now');
    capturePanelBaseline('plan');
    appState.persist();
  }
</script>

<div class="app">
  <aside class="sidebar" bind:this={sidebarEl}>
    <div class="seglist">
      {#each s.blocks as b, i (b.id)}
        {@const elapsed = elapsedMin()}
        {@const ct = clockTheme(s.palette, s.dark)}
        {@const cumMin = s.blocks.slice(0, i).reduce((a, x) => a + x.minutes, 0)}
        {@const segEnd = cumMin + b.minutes}
        {@const isActive = elapsed >= cumMin && elapsed < segEnd}
        {@const isPast = elapsed >= segEnd}
        <div class="row" class:active={isActive} class:past={isPast}>
          <span class="dot" style="background:{ct.colors[i % 8]}"></span>
          {#if editingBlockId === b.id && editingBlockField === 'name'}
            <input class="inline-edit name-inp" use:focusOnMount
              value={b.title}
              onblur={(e) => { const v = (e.target as HTMLInputElement).value.trim(); if (v) b.title = v; commitBlockEdit(); }}
              onkeydown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur(); }}
              onclick={(e) => e.stopPropagation()} />
          {:else}
            <button class="name seg-inline-btn" type="button" onclick={() => startBlockEdit(b.id, 'name')}>{b.title}</button>
          {/if}
          {#if editingBlockId === b.id && editingBlockField === 'min'}
            <input class="inline-edit min-inp" type="number" min="1" use:focusOnMount
              value={b.minutes}
              onblur={(e) => { const v = parseInt((e.target as HTMLInputElement).value); if (v > 0) { b.minutes = v; b.pinned = true; } commitBlockEdit(); }}
              onkeydown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur(); }}
              onclick={(e) => e.stopPropagation()} />
          {:else if s.segMinutesMode === 'planned'}
            <button class="min seg-inline-btn" type="button" onclick={() => startBlockEdit(b.id, 'min')}>{b.minutes}m</button>
          {:else if s.segMinutesMode === 'remaining'}
            <button class="min seg-inline-btn" type="button" onclick={() => startBlockEdit(b.id, 'min')}>{isPast ? 0 : isActive ? Math.max(0, Math.ceil(segEnd - elapsed)) : b.minutes}m kvar</button>
          {/if}
        </div>
        {#if b.note && s.showSegNotes}
          <div class="note">{b.note}</div>
        {/if}
      {/each}
      {#if s.extraInfo && s.showExtraInfo}
        <div class="infobox">{s.extraInfo}</div>
      {/if}
      {#if !isViewMode}
        <div class="sidebar-add-row">
          <button class="seg-add-btn" onclick={addBlock}>+</button>
        </div>
      {/if}
    </div>
  </aside>

  <div class="resize-handle-sb" role="separator" aria-orientation="vertical" onpointerdown={startSidebarResize}></div>
  <button class="collapse-btn" onclick={toggleCollapse} title="Dölj panel">
    {s.sbCollapsed ? '›' : '‹'}
  </button>

  {#if isViewMode}
    <div class="live-badge">{shareMode === 'active-session-live' ? '● Live' : '◌ Snapshot'}</div>
  {/if}

  <main class="main">
    <div class="main-header">
      {#if !isViewMode && !locked}
        <input class="lesson-title lesson-title-editable hero-text"
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

    <div class="clock-wrap">
      <svg class="clock" viewBox="0 0 360 360" style="overflow:visible" bind:this={svgEl}></svg>
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
          <button class="icon" onclick={() => { s.showControls = !s.showControls; appState.persist(); }} title="Inställningar">✎</button>
          <button class="icon" onclick={(e) => { e.stopPropagation(); optionsMenuOpen = !optionsMenuOpen; }} title="Visningsalternativ">⚙︎</button>
          <button class="icon clock-span-btn" class:active={s.clockSpan === 720} onclick={cycleClockSpan} title="Klockvy">{s.clockSpan === 720 ? '12h' : '1h'}</button>
        </div>

        {#if !isViewMode}
          <button
            class="mini-menu-toggle toolbar-center"
            class:open={miniMenuOpen}
            type="button"
            onclick={(e) => { e.stopPropagation(); toggleMiniMenu(); }}
            title={miniMenuOpen ? 'Dölj meny' : 'Visa meny'}
          >
            <span>▾</span>
          </button>
        {/if}

        <div class="toolbar-side toolbar-side-right" class:collapsed={!miniMenuOpen}>
          <button class="icon" onclick={() => helpOpen = true} title="Hjälp">ⓘ</button>
          <button class="icon lock-btn" class:locked onclick={() => locked = !locked} title={locked ? 'Lås upp' : 'Lås sidan'}>{locked ? '○' : '⊠'}</button>
          <div class="warn-dots">
            {#each s.blocks as b, i (b.id)}
              {@const ct = clockTheme(s.palette, s.dark)}
              <button class="wd" class:on={b.warning} style={`--warn-color:${ct.colors[i % 8]}`}
                title="Plingar 3 minuter innan och vid aktivitetsbyte"
                onclick={() => { b.warning = !b.warning; syncTimerToAgenda(); appState.persist(); }}
              >♪</button>
            {/each}
          </div>
          {#if loggedInUser}
            <span style="font-size:11px;opacity:.55;padding:0 4px;font-weight:500;border-left:1px solid var(--border);">👤 {loggedInUser}</span>
          {/if}
        </div>
      </div>

      {#if optionsMenuOpen}
        <div class="options-menu" class:open={optionsMenuOpen}>
          <div class="menu-section">
            <div class="menu-section-head">
              <div>
                <div class="section-title">Tid</div>
                <div class="section-copy">Klockans läge och tidsvisningen i toppen.</div>
              </div>
              <button class="menu-i" type="button" onclick={() => menuHelpOpen = menuHelpOpen === 'tid' ? null : 'tid'} title="Mer om tid">i</button>
            </div>
            {#if menuHelpOpen === 'tid'}
              <div class="menu-help">Klockvyn kan växla mellan 1h och 12h. Resten styr bara hur tydligt tid visas.</div>
            {/if}
            <div class="menu-list">
              <button class="menu-row" type="button" class:on={s.clockSpan !== 60} onclick={cycleClockSpan}>
                <span>Klockvy</span>
                <span class="menu-row-state">{s.clockSpan === 60 ? '1h' : s.clockSpan === 120 ? '2h' : '12h'}</span>
              </button>
              <button class="menu-row" type="button" class:on={s.showLeft} onclick={() => { s.showLeft = !s.showLeft; appState.persist(); }}>
                <span>Tid kvar</span><span class="menu-row-state">{s.showLeft ? 'På' : 'Av'}</span>
              </button>
              <button class="menu-row" type="button" class:on={s.showCenterEnd} onclick={() => { s.showCenterEnd = !s.showCenterEnd; appState.persist(); }}>
                <span>Sluttid i mitten</span><span class="menu-row-state">{s.showCenterEnd ? 'På' : 'Av'}</span>
              </button>
            </div>
          </div>

          <div class="menu-section">
            <div class="menu-section-head">
              <div>
                <div class="section-title">Visning</div>
                <div class="section-copy">Små markeringar och läsbarhet i klockan.</div>
              </div>
              <button class="menu-i" type="button" onclick={() => menuHelpOpen = menuHelpOpen === 'visning' ? null : 'visning'} title="Mer om visning">i</button>
            </div>
            {#if menuHelpOpen === 'visning'}
              <div class="menu-help">Här stänger du av och på detaljnivån i visningen utan att ändra själva tiden.</div>
            {/if}
            <div class="menu-list">
              <button class="menu-row" type="button" class:on={s.hollow} onclick={() => { s.hollow = !s.hollow; appState.persist(); }}>
                <span>Ihålig mitt</span><span class="menu-row-state">{s.hollow ? 'På' : 'Av'}</span>
              </button>
              <button class="menu-row" type="button" class:on={s.textOutside} onclick={() => { s.textOutside = !s.textOutside; appState.persist(); }}>
                <span>Text utanför</span><span class="menu-row-state">{s.textOutside ? 'På' : 'Av'}</span>
              </button>
              <button class="menu-row" type="button" class:on={s.showQuarter} onclick={() => { s.showQuarter = !s.showQuarter; appState.persist(); }}>
                <span>Kvartmarkeringar</span><span class="menu-row-state">{s.showQuarter ? 'På' : 'Av'}</span>
              </button>
              <button class="menu-row" type="button" class:on={s.showFive} onclick={() => { s.showFive = !s.showFive; appState.persist(); }}>
                <span>5-minutersmarkeringar</span><span class="menu-row-state">{s.showFive ? 'På' : 'Av'}</span>
              </button>
              <button class="menu-row" type="button" class:on={s.showMin} onclick={() => { s.showMin = !s.showMin; appState.persist(); }}>
                <span>Minutmarkeringar</span><span class="menu-row-state">{s.showMin ? 'På' : 'Av'}</span>
              </button>
            </div>
          </div>

          <div class="menu-section">
            <div class="menu-section-head">
              <div>
                <div class="section-title">Sidopanel</div>
                <div class="section-copy">Vad som syns i vänsterpanelen under timern.</div>
              </div>
              <button class="menu-i" type="button" onclick={() => menuHelpOpen = menuHelpOpen === 'sidopanel' ? null : 'sidopanel'} title="Mer om sidopanel">i</button>
            </div>
            {#if menuHelpOpen === 'sidopanel'}
              <div class="menu-help">De här reglagen styr om noteringar och extra info visas i panelen bredvid timern.</div>
            {/if}
            <div class="menu-list">
              <button class="menu-row" type="button" class:on={s.segMinutesMode !== 'off'} onclick={() => {
                const order: ('off'|'planned'|'remaining')[] = ['off','planned','remaining'];
                s.segMinutesMode = order[(order.indexOf(s.segMinutesMode) + 1) % order.length];
                appState.persist();
              }}>
                <span>Minuter</span><span class="menu-row-state">{{ off:'Av', planned:'Planerade', remaining:'Kvar' }[s.segMinutesMode]}</span>
              </button>
              <button class="menu-row" type="button" class:on={s.showSegNotes} onclick={() => { s.showSegNotes = !s.showSegNotes; appState.persist(); }}>
                <span>Underrubriker</span><span class="menu-row-state">{s.showSegNotes ? 'På' : 'Av'}</span>
              </button>
              <button class="menu-row" type="button" class:on={s.showExtraInfo} onclick={() => { s.showExtraInfo = !s.showExtraInfo; appState.persist(); }}>
                <span>Info-ruta</span><span class="menu-row-state">{s.showExtraInfo ? 'På' : 'Av'}</span>
              </button>
              <button class="menu-row" type="button" class:on={s.showSegLabels} onclick={() => { s.showSegLabels = !s.showSegLabels; appState.persist(); }}>
                <span>Visa rubriker</span><span class="menu-row-state">{s.showSegLabels ? 'På' : 'Av'}</span>
              </button>
            </div>
          </div>

          <div class="menu-section">
            <div class="menu-section-head">
              <div>
                <div class="section-title">Agenda</div>
                <div class="section-copy">Dagplansläget och hur dagen delas upp.</div>
              </div>
              <button class="menu-i" type="button" onclick={() => menuHelpOpen = menuHelpOpen === 'agenda' ? null : 'agenda'} title="Mer om agenda">i</button>
            </div>
            {#if menuHelpOpen === 'agenda'}
              <div class="menu-help">Här finns det som påverkar själva dagplanen. I mobilvyn väljer du också direkt vilken flik som ska öppnas.</div>
            {/if}
            <div class="menu-list">
              {#if !isViewMode}
                <button class="menu-row" type="button" class:on={s.agendaView !== 'school'} onclick={() => {
                  const order = ['school', 'school+private', 'private', 'private+school'] as const;
                  agendaDraft = '';
                  s.agendaView = order[(order.indexOf(s.agendaView as typeof order[number]) + 1) % order.length];
                  appState.persist();
                }}>
                  <span>Jobb / fritid</span><span class="menu-row-state">{{ school: 'Jobb', 'school+private': 'Båda', private: 'Fritid', 'private+school': 'Fritid + jobb' }[s.agendaView]}</span>
                </button>
              {:else}
                <div class="menu-help" style="margin-top:0;">Visas som snapshot i delningsläge.</div>
              {/if}
            </div>
          </div>

          <div class="menu-section">
            <div class="menu-section-head">
              <div>
                <div class="section-title">Övrigt</div>
                <div class="section-copy">Snabbval som inte riktigt hör till en specifik vy.</div>
              </div>
              <button class="menu-i" type="button" onclick={() => menuHelpOpen = menuHelpOpen === 'ovrigt' ? null : 'ovrigt'} title="Mer om övrigt">i</button>
            </div>
            {#if menuHelpOpen === 'ovrigt'}
              <div class="menu-help">Lås, hjälp och andra snabbval ligger kvar i toppraden. Den här menyn samlar bara visningslägena.</div>
            {/if}
            <div class="menu-list">
              <button class="menu-row" type="button" class:on={s.sbCollapsed} onclick={toggleCollapse}>
                <span>Sidopanel i mobil</span><span class="menu-row-state">{s.sbCollapsed ? 'Av' : 'På'}</span>
              </button>
            </div>
          </div>
        </div>
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
        {:else}
          <SectionHero title={SECTION_LABELS[s.activeSection]} copy={sectionCopy} />
        {/if}

        {#if s.activeSection === 'now' || s.activeSection === 'plan'}
          <SessionEditorPanel
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
            {endMode}
            actionLabel={s.activeSection === 'plan' ? 'Spara' : 'Kör!'}
            actionHint={planActionHint}
            saveStatusLabel={activePanelStatusLabel}
            canRevert={canRevertPanel}
            showHelpHints={s.showHelpHints}
            showTitleHelp={helpVisible(sessionTitleHelpOpen)}
            showPartsHelp={helpVisible(sessionPartsHelpOpen)}
            showTimeHelp={helpVisible(sessionTimeHelpOpen)}
            targetDateLabel={targetDateLabel}
            sourceLabel={selectedAgendaSourceLabel}
            sourceHelp={selectedAgendaSourceHelp}
            showSourceHelp={helpVisible(planSourceHelpOpen)}
            {shareToken}
            {shareMode}
            {shareCopyText}
            shareUrl={shareToken && pageOrigin ? `${pageOrigin}/?view=${shareToken}` : ''}
            onTitleInput={(value) => { s.dayTitle = value; syncTimerToAgenda(); appState.persist(); notifyPanelMutation(s.activeSection === 'plan' ? 'plan' : 'now'); }}
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
                  syncTimerToAgenda();
                } else {
                  const targetDate = selectedDay?.date ?? activeAgendaDate() ?? localDateISO();
                  const flow: Flow = {
                    id: uid(),
                    title: s.dayTitle || 'Session',
                    startMin: s.startMin,
                    parts: s.blocks.map(b => b.title),
                    minutes: s.blocks.map(b => b.minutes),
                    warnings: s.blocks.map(b => b.warning),
                    notes: s.blocks.map(b => b.note),
                    extraInfo: s.extraInfo,
                  };
                  addFlowToAgendaDate(targetDate, flow, true, sessionAgendaMeta());
                  planSelectionExplicit = true;
                }
                capturePanelBaseline('plan');
                partsDraftDirty = false;
                notifyPanelMutation('plan');
                appState.persist();
                return;
              }
              const d = new Date();
              s.startMin = d.getHours() * 60 + d.getMinutes();
              warnedSet.clear(); renderEndControl(); updateTimeFeedback();
              const f: Flow = {
                id: uid(), title: s.dayTitle || 'Session',
                startMin: s.startMin,
                parts: s.blocks.map(b => b.title),
                minutes: s.blocks.map(b => b.minutes),
                warnings: s.blocks.map(b => b.warning),
                notes: s.blocks.map(b => b.note),
                extraInfo: s.extraInfo,
              };
              addFlowToAgendaToday(f, true, sessionAgendaMeta());
              lastAutoLoadKey = `${f.startMin}-${totalFlowMinutes(f)}-${f.title}-${f.parts.length}`;
              capturePanelBaseline('now');
              partsDraftDirty = false;
              notifyPanelMutation('now');
            }}
            onStartTimeInput={(value) => {
              const [h, m] = value.split(':').map(Number);
              if (isNaN(h) || isNaN(m)) return;
              s.startMin = h * 60 + m; warnedSet.clear();
              renderEndControl(); updateTimeFeedback();
              syncTimerToAgenda(); appState.persist(); notifyPanelMutation(s.activeSection === 'plan' ? 'plan' : 'now');
            }}
            onEndModeChange={(mode) => { endMode = mode; s.endMode = mode; renderEndControl(); appState.persist(); notifyPanelMutation(s.activeSection === 'plan' ? 'plan' : 'now'); }}
            onEndControlMount={(node) => { endControlEl = node ?? null!; renderEndControl(); }}
            onRevert={revertActivePanel}
            onToggleTitleHelp={() => sessionTitleHelpOpen = toggleHelpOverride(sessionTitleHelpOpen)}
            onTogglePartsHelp={() => sessionPartsHelpOpen = toggleHelpOverride(sessionPartsHelpOpen)}
            onToggleTimeHelp={() => sessionTimeHelpOpen = toggleHelpOverride(sessionTimeHelpOpen)}
            onToggleSourceHelp={() => planSourceHelpOpen = toggleHelpOverride(planSourceHelpOpen)}
            onCopyShareLink={copyShareLink}
            onStopSharing={stopSharing}
            onStartLiveShare={() => startSharing('active-session-live')}
            onSaveFlow={saveFlow}
            onStartSessionShare={() => startSharing('selected-session-snapshot')}
            onStartDayShare={() => startSharing('selected-day-snapshot')}
          />
          {#if s.activeSection === 'plan' && !isViewMode}
            <div class="agenda-section-note" style="margin-top:8px;">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
                <strong>Faktisk tid & lärande</strong>
                <button class="agenda-save-btn" style="margin:0;flex:0;" onclick={exportActualHistory}>Exportera historik (JSONL)</button>
              </div>
              <div class="feedback" style="margin-top:8px;">
                Kategori: <strong>{currentSubjectCategory}</strong>
                {#if suggestedDuration}
                  · Föreslagen tid: <strong>{suggestedDuration.minutes} min</strong> ({suggestedDuration.sampleSize} träffar)
                {:else}
                  · Ingen historik ännu för rekommendation
                {/if}
              </div>
              {#if pendingActualEntries.length > 0}
                <div class="feedback" style="margin-top:8px;">Obekräftade pass idag (autosparas vid nytt dygn):</div>
                {#each pendingActualEntries as entry, pi (`${entry.id}-${pi}`)}
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px;">
                    <span>{fmtHM(entry.startMin)} {entry.title} · {entry.durationActualMin} min</span>
                    <div style="display:flex;gap:6px;align-items:center;">
                      <button class="agenda-save-btn" style="margin:0;flex:0;" onclick={() => confirmActualEntry(entry.id)}>Bekräfta</button>
                      <button class="agenda-save-btn" style="margin:0;flex:0;" onclick={() => deleteActualEntry(entry.id)}>Ta bort</button>
                    </div>
                  </div>
                {/each}
              {/if}
            </div>
          {/if}
        {:else if s.activeSection === 'library'}
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
        {:else}
          <WorkspacePanel
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
        {/if}
        </div>
      {/if}
      </div>
    </div>
  </main>

  <div class="resize-handle-ag" role="separator" aria-orientation="vertical" onpointerdown={startAgendaResize}></div>
  <aside class="agenda" bind:this={agendaEl}>
    {#if !isViewMode && s.activeSection === 'plan'}
      <AgendaImportPanel
        {agendaInputOpen}
        {agendaDraft}
        draftStatus={agendaDraftStatus}
        selectedDateLabel={selectedDay?.date ? fmtAgendaDate(selectedDay.date) : 'Odaterad dag'}
        {savedAgendaMsg}
        {icsImportOpen}
        {icsDraft}
        icsSummary={icsPreviewSummary}
        {icsPreviewLines}
        icsError={icsImportError}
        icsHasPreview={icsPreviewEvents.length > 0}
        {icsCanImport}
        {copyAgendaPromptText}
        hasAiKey={!!aiApiKey}
        {agendaAiOpen}
        {agendaAiInput}
        aiPlanMode={aiConfig.planMode}
        {agendaAiError}
        {agendaAiLoading}
        showHelpHints={s.showHelpHints}
        showImportHelp={helpVisible(agendaImportHelpOpen)}
        showIcsHelp={helpVisible(agendaIcsHelpOpen)}
        onToggleOpen={() => agendaInputOpen = !agendaInputOpen}
        onDraftChange={(value) => { agendaDraft = value; agendaDraftDirty = true; agendaDraftDate = selectedDay?.date ?? activeAgendaDate() ?? localDateISO(); }}
        onDraftPaste={() => {}}
        onSave={saveAgenda}
        onToggleIcsOpen={() => icsImportOpen = !icsImportOpen}
        onIcsDraftChange={(value) => { icsDraft = value; resetIcsPreview(); }}
        onIcsFileChange={readIcsFile}
        onPreviewIcs={previewIcsImport}
        onImportIcs={importPreviewedIcs}
        onCopyPrompt={() => {
          navigator.clipboard.writeText(AI_PROMPT_AGENDA).then(() => {
            copyAgendaPromptText = '✓ Kopierad';
            setTimeout(() => { copyAgendaPromptText = 'AI-prompt'; }, 1500);
          });
        }}
        onToggleAi={() => agendaAiOpen = !agendaAiOpen}
        onAgendaAiInputChange={(value) => agendaAiInput = value}
        onSetStrictMode={() => { aiConfig.planMode = 'strict'; saveAiConfig(); }}
        onSetHelpfulMode={() => { aiConfig.planMode = 'helpful'; saveAiConfig(); }}
        onRunAi={runAiAgenda}
        onToggleImportHelp={() => agendaImportHelpOpen = toggleHelpOverride(agendaImportHelpOpen)}
        onToggleIcsHelp={() => agendaIcsHelpOpen = toggleHelpOverride(agendaIcsHelpOpen)}
      />
    {/if}

    <div class="agenda-calendar" class:collapsed={!agendaCalendarOpen}>
      <div class="agenda-input-header" style="margin-bottom:8px;">
        <span class="agenda-input-label">Kalender</span>
        <button class="agenda-input-toggle" onclick={() => agendaCalendarOpen = !agendaCalendarOpen}>
          {agendaCalendarOpen ? '△' : '▽'}
        </button>
      </div>
      {#if agendaCalendarOpen}
        <div class="agenda-calendar-head">
          <button class="agenda-nav-btn" onclick={() => calendarMonthCursor = shiftMonth(calendarMonthCursor || monthKey(parseIsoDate(selectedDay?.date ?? localDateISO())), -1)}>‹</button>
          <span class="agenda-date-label">{monthLabel(calendarMonthCursor || monthKey(parseIsoDate(selectedDay?.date ?? localDateISO())))}</span>
          <button class="agenda-nav-btn" onclick={() => calendarMonthCursor = shiftMonth(calendarMonthCursor || monthKey(parseIsoDate(selectedDay?.date ?? localDateISO())), 1)}>›</button>
        </div>
        <div class="agenda-calendar-weekdays">
          {#each ['S','M','T','O','T','F','L'] as weekday}
            <span>{weekday}</span>
          {/each}
        </div>
        <div class="agenda-calendar-grid">
          {#each calendarCells as cell (cell.iso)}
            <button
              class="agenda-calendar-day"
              class:muted={!cell.inMonth}
              class:selected={cell.isSelected}
              class:has-content={cell.hasContent}
              onclick={() => selectAgendaDate(cell.iso)}
            >
              <span>{cell.label}</span>
              <span class="agenda-calendar-density" style={`opacity:${cell.density}`}></span>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    {#if selectedDay}
      <div class="agenda-nav">
        <button class="agenda-nav-btn" onclick={prevDay} disabled={!agendaDays || selectedDayIdx <= 0}>‹</button>
        <span class="agenda-date-label">{fmtAgendaDate(selectedDay?.date ?? null)}</span>
        {#if !schoolPrimary() && !isViewMode}
          <span class="agenda-mode-badge">Fritid</span>
        {/if}
        <button class="agenda-nav-btn" onclick={nextDay} disabled={!agendaDays || selectedDayIdx >= (agendaDays.length - 1)}>›</button>
      </div>
    {/if}

    {#if agendaItems.length === 0}
      <p class="agenda-empty">{selectedDay?.date ? `Ingen plan sparad för ${fmtAgendaDate(selectedDay.date)} än.` : 'Skriv in dagplanen ovan, eller spara flöden via ✎-panelen.'}</p>
      <button class="quickstart agenda-plan-link" onclick={() => setActiveSection('plan')}>Gå till Planera</button>
    {:else}
      {@const windowStart = Math.floor(agendaItems[0].startMin / 60) * 60}
      <div class="agenda-timeline" class:has-overlay={overlayItems.length > 0} bind:this={timelineEl}>
        {#if agendaMoveState && agendaMoveState.previewValid && agendaMoveState.previewStart !== null}
          {@const previewTop = ((agendaMoveState.previewStart - windowStart) / 720 * 100).toFixed(3)}
          <div class="agenda-drop-indicator" style="top: {previewTop}%"></div>
        {/if}
        {#each agendaItems as item, ai (`${item.startMin}-${item.totalMin}-${item.flow.id ?? item.flow.title}-${ai}`)}
          {@const itemColor = sectorColors[ai % sectorColors.length]}
          {@const isPast = nowMinLive >= item.startMin + item.totalMin}
          {@const isActive = nowMinLive >= item.startMin && nowMinLive < item.startMin + item.totalMin}
          {@const topPct = ((item.startMin - windowStart) / 720 * 100).toFixed(3)}
          {@const heightPct = (item.totalMin / 720 * 100).toFixed(3)}
          {@const itemMeta = item.fromText && selectedDay ? s.agendaMeta[makeAgendaMetaKeyForFlow(selectedDay.date ?? null, item.flow, item.startMin)] ?? null : null}
          <div class="agenda-block"
               role="button"
               tabindex="0"
               class:past={isPast}
               class:active={isActive}
               class:dragging={agendaMoveState?.dayIdx === selectedDayIdx && agendaMoveState?.flowIdx === ai}
               style="top: {topPct}%; height: {heightPct}%; border-left-color: {itemColor}"
              onclick={() => { if (!agendaDragMoved) item.fromText ? loadAgendaFlow(item.flow, item.startMin) : loadFlow(item.flow.id); }}
               onkeydown={(e) => {
                 if (e.key === 'Enter' || e.key === ' ') {
                   e.preventDefault();
                   if (!agendaDragMoved) item.fromText ? loadAgendaFlow(item.flow, item.startMin, 'plan', true) : loadFlow(item.flow.id);
                 }
               }}>
            <span class="agenda-time">{fmtHM(item.startMin)}–{fmtHM(item.startMin + item.totalMin)}</span>
            {#if itemMeta}
              <span class="agenda-source-badge" class:template={itemMeta.source === 'template'} class:ai={itemMeta.source === 'ai'} class:imported={itemMeta.source === 'import'} title={agendaMetaLabel(itemMeta)}>
                {agendaMetaBadge(itemMeta)}
              </span>
            {/if}
            <span class="agenda-name">{item.flow.title || '(utan rubrik)'}</span>
            {#if item.fromText && !isViewMode}
              {#if s.activeSection !== 'now'}
                <button
                  class="agenda-move-btn"
                  onclick={(e) => e.stopPropagation()}
                  onpointerdown={(e) => startAgendaMove(e, ai)}
                  title="Flytta block i ordningen"
                >⋮⋮</button>
              {/if}
              <button class="agenda-del-btn" onclick={(e) => { e.stopPropagation(); deleteAgendaItem(ai); }} title="Ta bort block">🗑</button>
              <div class="agenda-drag-top" role="separator" aria-orientation="horizontal" onpointerdown={(e) => startAgendaDrag(e, ai, 'top')}></div>
              <div class="agenda-drag-bottom" role="separator" aria-orientation="horizontal" onpointerdown={(e) => startAgendaDrag(e, ai, 'bottom')}></div>
            {/if}
          </div>
        {/each}
        {#each overlayItems as item, oi (`${item.startMin}-${item.totalMin}-${item.flow.id ?? item.flow.title}-overlay-${oi}`)}
          {@const itemEnd = item.startMin + item.totalMin}
          {@const visStart = Math.max(item.startMin, windowStart)}
          {@const visEnd = Math.min(itemEnd, windowStart + 720)}
          {#if visEnd > visStart}
            {@const topPct = ((visStart - windowStart) / 720 * 100).toFixed(3)}
            {@const heightPct = ((visEnd - visStart) / 720 * 100).toFixed(3)}
            <div class="agenda-block ghost"
                 style="top: {topPct}%; height: {heightPct}%; border-left-color: var(--muted)">
              <span class="agenda-time">{fmtHM(item.startMin)}–{fmtHM(itemEnd)}</span>
              <span class="agenda-name">{item.flow.title || '(utan rubrik)'}</span>
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  </aside>

  <button class="agenda-toggle-btn" onclick={toggleAgenda} title="Dagagenda">
    {s.agendaOpen ? '›' : '‹'}
  </button>

  <nav class="mobile-tabs">
    <button class:active={s.activeSection === 'now' && mobileTab === 'timer'} onclick={() => setActiveSection('now')}>
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

<div class="theme-dots" class:open={themePickerOpen}
  use:clickOutside={() => { themePickerOpen = false; }}>
  <button class="theme-trigger"
    aria-label={`Tema: ${PALETTE_LABELS[s.palette]}`}
    onclick={() => themePickerOpen = !themePickerOpen}
    title={`Tema: ${PALETTE_LABELS[s.palette]}`}>
    <span class="theme-trigger-swatch" style="background:{PALETTE_COLORS[s.palette]}"></span>
    <span class="theme-trigger-caret">▾</span>
  </button>
  <div class="theme-panel">
    {#each PALETTES as p}
      <button class="theme-dot" class:active={s.palette === p}
        style="background:{PALETTE_COLORS[p]}" title={PALETTE_LABELS[p]}
        onclick={() => { s.palette = p; syncBodyClasses(); appState.persist(); themePickerOpen = false; }}
      ></button>
    {/each}
    <button id="darkToggle" class:active={s.dark} title="Dag/Natt"
      onclick={() => { if (s.palette !== 'psychedelic') { s.dark = !s.dark; syncBodyClasses(); appState.persist(); } }}
    >{s.dark ? '☾' : '☀'}</button>
  </div>
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
    <h2>Så här använder du Day Timer</h2>

    <h3>Grunderna</h3>
    <ul>
      <li><b>Nu</b> är snabbvägen: skriv rubrik och delar, eller ladda en mall, och tryck sedan <b>Kör!</b>.</li>
      <li><b>Planera</b> är dagläget: välj datum i kalendern, skriv eller klistra in dagtext och spara längst ner.</li>
      <li><b>Alt+i</b> visar eller gömmer hjälp globalt. Lokala <span class="ico">i</span>-knappar kan ändå öppna eller stänga just sin ruta.</li>
      <li><b>Allt sparas automatiskt</b> i webbläsaren tills du klickar <b>Spara</b> i dagplanen eller ändrar något i timern.</li>
    </ul>

    <h3>Inmatningsformat</h3>
    <ul>
      <li><code>#Rubrik</code> — sätter dag­titeln (visas i klockan och sidopanelen)</li>
      <li><code>Frukost 20m</code> — aktivitet med fast tid (pinnad)</li>
      <li><code>Promenad</code> — aktivitet utan tid (fördelas automatiskt)</li>
      <li><code>- ta med vatten</code> — undernotering på föregående aktivitet</li>
      <li><code>&amp; Kom ihåg möte kl 9</code> — kommentar som sparas i dagplanen eller Planera</li>
    </ul>

    <h3>Klockvyer</h3>
    <ul>
      <li><b>1h-vy</b> (standard) — visar kommande timme, minutvisare.</li>
      <li><b>2h-vy</b> — slå på i <span class="ico">⚙︎</span>. Visar två timmar.</li>
      <li><b>12h-vy</b> — slå på i <span class="ico">⚙︎</span>. Visar hela dagen med timvisare. Kombinera med Dagplan.</li>
    </ul>

    <h3>Dagplan (agenda)</h3>
    <ul>
      <li>Öppna agendan med <b>▷</b>-knappen till höger om klockan. Kalendern kan fällas ihop och visar en kompakt översikt.</li>
      <li>Klicka en dag i kalendern för att visa just den dagtexten. Tom dag går också att välja och skriva på.</li>
      <li>I tidslinjen kan du klicka ett block för att ladda det i timern, dra i över- och underkant för tid och dra i flytthandtaget för ordningen.</li>
      <li>Status som <b>Mall</b>, <b>Import</b> och <b>AI</b> visas diskret och blir tydligare vid hover eller i planeringsläget.</li>
    </ul>

    <h3>AI-planering</h3>
    <ul>
      <li>Öppna <span class="ico">✎</span> och scrolla ner till <b>AI-planering</b>.</li>
      <li>Välj provider: <b>Claude</b>, <b>GPT</b>, <b>Gemini</b> eller <b>Anpassad</b> (valfri OpenAI-kompatibel, t.ex. Mistral, Groq).</li>
      <li>Klistra in din API-nyckel — sparas lokalt, skickas till vår server enbart för att nå vald AI-leverantör.</li>
      <li>Klicka <b>▽ Planera med AI</b> under aktivitetsfältet → beskriv på fritt språk → schemat fylls i automatiskt.</li>
      <li>I agendapanelen: klicka <b>✨ AI-dagplan</b> för att generera dagtext för vald dag.</li>
      <li><b>AI-prompt</b>-knappen bredvid aktivitetsfältet kopierar en prompt du kan klistra in i valfritt AI-verktyg manuellt.</li>
    </ul>

    <h3>Flöden &amp; synkronisering</h3>
    <ul>
      <li><b>Spara som mall</b> 💾 sparar det aktuella schemat som en återanvändbar mall i Bibliotek.</li>
      <li>Mallnamnet laddar mallen i <b>Planera</b> eller <b>Nu</b> beroende på var du är. <b>＋</b> lägger till mallen på vald dag.</li>
      <li><b>☁ Ladda / ☁ Spara</b> hämtar eller skickar mallar och dagplaner till molnet.</li>
    </ul>

    <h3>Utseende</h3>
    <ul>
      <li><b>Paletter</b> — färgpunkterna längst ner till höger byter tema.</li>
      <li><b>Mörkt läge</b> — ☽/☀-knappen bredvid paletterna.</li>
      <li><b>Toggle-pills</b> (<span class="ico">⚙︎</span>) styr vad som visas: tid kvar, etiketter, markeringar m.m.</li>
      <li><b>Mobilvy</b> — flikarna Nu / Planera / Bibliotek / Konto längst ner på skärmen.</li>
    </ul>

    <p class="help-foot" style="margin-top:12px">Genväg: <code>Alt+i</code> visar eller gömmer hjälp. <code>Alt+Shift+R</code> återställer timern (all data raderas).</p>
    <p class="help-foot">Klockan följer faktisk klocktid — visaren är alltid rätt.</p>
    <p class="help-foot">Frågor? Mejla <a href="mailto:timer@ximon.se">timer@ximon.se</a></p>
  </div>
</div>
