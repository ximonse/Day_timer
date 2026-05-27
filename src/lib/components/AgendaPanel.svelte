<script lang="ts">
  import { appState, uid, type Flow, type AgendaFlowMeta } from '$lib/state.svelte.js';
  import { fmtAgendaDate, shiftMonth, monthKey, parseIsoDate, monthLabel, localDateISO } from '$lib/date.js';
  import { fmtHM } from '$lib/clock.js';
  import { type AgendaDay } from '$lib/parse.js';
  import { getAiPromptAgenda, AI_PROMPT_CALENDAR_CONVERT } from '$lib/ai.js';
  import type { AiPlanResponse, AiPlanningMode } from '$lib/ai-plan-engine.js';
  import { parseMarkdownHtml } from '$lib/markdown.js';
  import { colorForSegment, stripColorDirective } from '$lib/title-color.js';
  import AgendaImportPanel from './AgendaImportPanel.svelte';

  let {
    selectedFlowId,
    sectorColors,
    isViewMode,
    runMode,
    agendaDraftStatus,
    savedAgendaMsg,
    icsPreviewSummary,
    icsPreviewLines,
    icsImportError,
    icsCanImport,
    agendaAiError,
    agendaAiLoading,
    selectedDay,
    agendaDays,
    selectedDayIdx,
    agendaItems,
    overlayItems,
    agendaMoveState,
    nowMinLive,
    agendaDragMoved,
    calendarCells,
    aiApiKey,
    aiConfig,
    aiPlanningMode,
    aiLastResponse,
    icsPreviewEvents,
    activeAgendaDate,
    saveAgenda,
    resetIcsPreview,
    readIcsFile,
    previewIcsImport,
    importPreviewedIcs,
    runAiAgenda,
    toggleHelpOverride,
    selectAgendaDate,
    prevDay,
    nextDay,
    loadAgendaFlow,
    loadFlow,
    startAgendaMove,
    deleteAgendaItem,
    startAgendaDrag,
    schoolPrimary,
    agendaDimPast,
    saveAiConfig,
    onSetAiPlanningMode,
    onSetActiveSection,
    agendaEl = $bindable(),
    timelineEl = $bindable(),
    agendaInputOpen = $bindable(),
    agendaCalendarOpen = $bindable(),
    calendarMonthCursor = $bindable(),
    agendaDraft = $bindable(),
    agendaDraftSource = 'manual',
    agendaDraftDirty = $bindable(),
    agendaDraftDate = $bindable(),
    icsDraft = $bindable(),
    icsImportOpen = $bindable(),
    copyAgendaPromptText = $bindable(),
    agendaAiOpen = $bindable(),
    agendaAiInput = $bindable()
  }: {
    selectedFlowId: string | null;
    sectorColors: string[];
    isViewMode: boolean;
    runMode: boolean;
    agendaDraftStatus: string;
    savedAgendaMsg: string;
    icsPreviewSummary: string;
    icsPreviewLines: string[];
    icsImportError: string;
    icsCanImport: boolean;
    agendaAiError: string;
    agendaAiLoading: boolean;
    selectedDay: AgendaDay | null;
    agendaDays: AgendaDay[] | null;
    selectedDayIdx: number;
    agendaItems: any[];
    overlayItems: any[];
    agendaMoveState: any;
    nowMinLive: number;
    agendaDragMoved: boolean;
    calendarCells: any[];
    aiApiKey: string;
    aiConfig: any;
    aiPlanningMode: AiPlanningMode;
    aiLastResponse: AiPlanResponse | null;
    icsPreviewEvents: any[];
    activeAgendaDate: () => string | null;
    saveAgenda: () => void;
    resetIcsPreview: () => void;
    readIcsFile: (e: Event) => void;
    previewIcsImport: () => void;
    importPreviewedIcs: () => void;
    runAiAgenda: () => void;
    toggleHelpOverride: (c: any) => any;
    selectAgendaDate: (d: string) => void;
    prevDay: () => void;
    nextDay: () => void;
    loadAgendaFlow: (f: Flow, s: number, sect?: any, explicit?: boolean) => void;
    loadFlow: (id: string, sect?: any) => void;
    startAgendaMove: (e: PointerEvent, i: number) => void;
    deleteAgendaItem: (i: number) => void;
    startAgendaDrag: (e: PointerEvent, i: number, edge: 'top' | 'bottom') => void;
    schoolPrimary: () => boolean;
    agendaDimPast: boolean;
    saveAiConfig: () => void;
    onSetAiPlanningMode: (mode: AiPlanningMode) => void;
    onSetActiveSection: (s: any) => void;
    agendaEl: HTMLElement;
    timelineEl: HTMLElement;
    agendaInputOpen: boolean;
    agendaCalendarOpen: boolean;
    calendarMonthCursor: string;
    agendaDraft: string;
    agendaDraftSource: 'manual' | 'ai';
    agendaDraftDirty: boolean;
    agendaDraftDate: string | null;
    icsDraft: string;
    icsImportOpen: boolean;
    copyAgendaPromptText: string;
    agendaAiOpen: boolean;
    agendaAiInput: string;
  } = $props();

  const s = appState.value;

  function helpVisible(override: any) {
    if (override === 'show') return true;
    if (override === 'hide') return false;
    return s.showHelpHints;
  }

  function makeAgendaMetaKeyForFlow(date: string | null, flow: Flow, startMin: number): string {
    return `${date ?? ''}:${flow.title}:${startMin}`;
  }

  function agendaMetaLabel(meta: AgendaFlowMeta): string {
    if (meta.source === 'template') return 'Från mall';
    if (meta.source === 'ai') return 'AI-genererad';
    if (meta.source === 'import') return 'Importerad';
    return 'Manuell';
  }

  function agendaMetaBadge(meta: AgendaFlowMeta): string {
    if (meta.source === 'template') return 'M';
    if (meta.source === 'ai') return 'AI';
    if (meta.source === 'import') return 'IMP';
    return '';
  }

  let agendaImportHelpOpen = $state<any>('inherit');
  let agendaIcsHelpOpen = $state<any>('inherit');

  // Touch: long-press on right zone of agenda block to move
  let pressTimer: ReturnType<typeof setTimeout> | null = null;
  let pressStartX = 0;
  let pressStartY = 0;
  let pressEvent: PointerEvent | null = null;
  let suppressNextClick = false;

  function rightZonePointerDown(e: PointerEvent, i: number) {
    if (e.pointerType === 'mouse') return;
    if (s.activeSection === 'now' || isViewMode) return;
    pressStartX = e.clientX;
    pressStartY = e.clientY;
    pressEvent = e;
    if (pressTimer) clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
      pressTimer = null;
      if (pressEvent) {
        suppressNextClick = true;
        startAgendaMove(pressEvent, i);
      }
    }, 350);
  }

  function rightZonePointerMove(e: PointerEvent) {
    if (!pressTimer) return;
    const dx = e.clientX - pressStartX;
    const dy = e.clientY - pressStartY;
    if (Math.hypot(dx, dy) > 8) {
      clearTimeout(pressTimer);
      pressTimer = null;
      pressEvent = null;
    }
  }

  function rightZonePointerUp() {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    pressEvent = null;
  }

  function handleBlockClick(item: any, ai: number, e: MouseEvent) {
    if (suppressNextClick) {
      suppressNextClick = false;
      e.preventDefault();
      return;
    }
    if (agendaDragMoved) return;
    item.fromText ? loadAgendaFlow(item.flow, item.startMin) : loadFlow(item.flow.id);
  }
</script>

<aside id="agenda-panel" class="agenda" bind:this={agendaEl}>
    {#if !isViewMode && !runMode && s.activeSection === 'plan'}
      <AgendaImportPanel
        {agendaInputOpen}
        {agendaDraft}
        agendaDraftSource={agendaDraftDirty ? agendaDraftSource : 'manual'}
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
        hasAiKey={!!aiApiKey}
        {agendaAiOpen}
        {agendaAiInput}
        {aiPlanningMode}
        {aiLastResponse}
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
        onCopyPrompt={async (type) => {
          const prompt = type === 'plan' ? getAiPromptAgenda(localDateISO()) : AI_PROMPT_CALENDAR_CONVERT;
          await navigator.clipboard.writeText(prompt);
        }}
        onToggleAi={() => agendaAiOpen = !agendaAiOpen}
        onAgendaAiInputChange={(value) => agendaAiInput = value}
        {onSetAiPlanningMode}
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
          {#each ['M','T','O','T','F','L','S'] as weekday}
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
          <span class="agenda-mode-badge">Eget</span>
        {/if}
        <button class="agenda-nav-btn" onclick={nextDay} disabled={!agendaDays || selectedDayIdx >= (agendaDays.length - 1)}>›</button>
      </div>
    {/if}

    {#if agendaItems.length === 0}
      <p class="agenda-empty">{selectedDay?.date ? `Ingen plan sparad för ${fmtAgendaDate(selectedDay.date)} än.` : 'Skriv in dagplanen ovan, eller spara flöden via ✎-panelen.'}</p>    
      <button class="quickstart agenda-plan-link" onclick={() => onSetActiveSection('plan')}>Gå till Planera</button>
    {:else}
      {@const windowStart = Math.floor(agendaItems[0].startMin / 60) * 60}
      <div id="agenda-timeline" class="agenda-timeline" class:has-overlay={overlayItems.length > 0} bind:this={timelineEl}>
        {#if agendaMoveState && agendaMoveState.previewValid && agendaMoveState.previewStart !== null}
          {@const previewTop = ((agendaMoveState.previewStart - windowStart) / 720 * 100).toFixed(3)}
          <div class="agenda-drop-indicator" style="top: {previewTop}%"></div>
        {/if}
        {#each agendaItems as item, ai (`${item.startMin}-${item.totalMin}-${item.flow.id ?? item.flow.title}-${ai}`)}
          {@const itemTitle = stripColorDirective(item.flow.title || '(utan rubrik)')}
          {@const itemColor = colorForSegment(item.flow.title || '(utan rubrik)', sectorColors, ai)}
          {@const itemEnd = item.startMin + item.totalMin}
          {@const today = localDateISO()}
          {@const itemDate = selectedDay?.date || today}
          {@const isPast = itemDate < today || (itemDate === today && nowMinLive >= itemEnd)}
          {@const isActive = itemDate === today && nowMinLive >= item.startMin && nowMinLive < itemEnd}
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
              onclick={(e) => handleBlockClick(item, ai, e)}
               onkeydown={(e) => {
                 if (e.key === 'Enter' || e.key === ' ') {
                   e.preventDefault();
                   if (!agendaDragMoved) item.fromText ? loadAgendaFlow(item.flow, item.startMin, 'plan', true) : loadFlow(item.flow.id);
                 }
               }}>
            <span class="agenda-time">{fmtHM(item.startMin)}–{fmtHM(itemEnd)}</span>
            {#if itemMeta}
              <span class="agenda-source-badge" class:template={itemMeta.source === 'template'} class:ai={itemMeta.source === 'ai'} class:imported={itemMeta.source === 'import'} title={agendaMetaLabel(itemMeta)}>
                {agendaMetaBadge(itemMeta)}
              </span>
            {/if}
            <span class="agenda-name">
              {#if isPast}
                <del>{@html parseMarkdownHtml(itemTitle)}</del>
              {:else}
                {@html parseMarkdownHtml(itemTitle)}
              {/if}
            </span>
            {#if item.flow.id === selectedFlowId}
              <span class="agenda-editing-badge" title="Redigeras i panelen">✎</span>
            {/if}
            {#if item.fromText && !isViewMode && !runMode}
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
              {#if s.activeSection !== 'now'}
                <div class="agenda-zone-left" aria-hidden="true"></div>
                <div class="agenda-zone-resize-top" aria-hidden="true"
                     onpointerdown={(e) => startAgendaDrag(e, ai, 'top')}></div>
                <div class="agenda-zone-resize-bottom" aria-hidden="true"
                     onpointerdown={(e) => startAgendaDrag(e, ai, 'bottom')}></div>
                <div class="agenda-zone-right"
                     onpointerdown={(e) => rightZonePointerDown(e, ai)}
                     onpointermove={rightZonePointerMove}
                     onpointerup={rightZonePointerUp}
                     onpointercancel={rightZonePointerUp}><span>⋮⋮</span></div>
              {/if}
            {/if}
          </div>
        {/each}
        {#each overlayItems as item, oi (`${item.startMin}-${item.totalMin}-${item.flow.id ?? item.flow.title}-overlay-${oi}`)}
          {@const itemEnd = item.startMin + item.totalMin}
          {@const today = localDateISO()}
          {@const activeDate = activeAgendaDate() || today}
          {@const isPast = activeDate < today || (activeDate === today && nowMinLive >= itemEnd)}
          {@const visStart = Math.max(item.startMin, windowStart)}
          {@const visEnd = Math.min(itemEnd, windowStart + 720)}
          {#if visEnd > visStart}
            {@const itemTitle = stripColorDirective(item.flow.title || '(utan rubrik)')}
            {@const topPct = ((visStart - windowStart) / 720 * 100).toFixed(3)}
            {@const heightPct = ((visEnd - visStart) / 720 * 100).toFixed(3)}
            <div class="agenda-block ghost"
                 class:past={isPast}
                 style="top: {topPct}%; height: {heightPct}%; border-left-color: var(--muted)">
              <span class="agenda-time">{fmtHM(item.startMin)}–{fmtHM(itemEnd)}</span>
              <span class="agenda-name">
                {#if isPast}
                  <del>{@html parseMarkdownHtml(itemTitle)}</del>
                {:else}
                  {@html parseMarkdownHtml(itemTitle)}
                {/if}
              </span>
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  </aside>
