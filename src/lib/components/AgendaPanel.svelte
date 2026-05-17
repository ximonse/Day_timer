<script lang="ts">
  import { appState, uid, type Flow, type AgendaFlowMeta } from '$lib/state.svelte.js';
  import { fmtAgendaDate, shiftMonth, monthKey, parseIsoDate, monthLabel, localDateISO } from '$lib/date.js';
  import { fmtHM } from '$lib/clock.js';
  import { type AgendaDay } from '$lib/parse.js';
  import { AI_PROMPT_AGENDA, AI_PROMPT_CALENDAR_CONVERT } from '$lib/ai.js';
  import AgendaImportPanel from './AgendaImportPanel.svelte';

  let {
    sectorColors,
    isViewMode,
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
    saveAiConfig,
    onSetActiveSection,
    agendaEl = $bindable(),
    timelineEl = $bindable(),
    agendaInputOpen = $bindable(),
    agendaCalendarOpen = $bindable(),
    calendarMonthCursor = $bindable(),
    agendaDraft = $bindable(),
    agendaDraftDirty = $bindable(),
    agendaDraftDate = $bindable(),
    icsDraft = $bindable(),
    icsImportOpen = $bindable(),
    copyAgendaPromptText = $bindable(),
    agendaAiOpen = $bindable(),
    agendaAiInput = $bindable()
  }: {
    sectorColors: string[];
    isViewMode: boolean;
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
    saveAiConfig: () => void;
    onSetActiveSection: (s: any) => void;
    agendaEl: HTMLElement;
    timelineEl: HTMLElement;
    agendaInputOpen: boolean;
    agendaCalendarOpen: boolean;
    calendarMonthCursor: string;
    agendaDraft: string;
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

</script>

<aside id="agenda-panel" class="agenda" bind:this={agendaEl}>
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
