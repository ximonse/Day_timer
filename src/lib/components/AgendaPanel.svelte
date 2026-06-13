<script lang="ts">
  import { appState, type Flow, type AgendaFlowMeta } from '$lib/state.svelte.js';
  import { fmtAgendaDate, shiftMonth, monthKey, parseIsoDate, monthLabel, localDateISO } from '$lib/date.js';
  import { fmtHM } from '$lib/clock.js';
  import { type AgendaDay } from '$lib/parse.js';
  import { AGENDA_DAY_WINDOW_END, agendaAutoScrollTop, availableGapAfterAgendaItem, canInsertAgendaItemAfter } from '$lib/agenda.js';
  import { AGENDA_COMPACT_ITEM_MINUTES, type AgendaLayout } from '$lib/agenda-layout.js';
  import { parseMarkdownHtml } from '$lib/markdown.js';
  import { colorForSegment, stripColorDirective } from '$lib/title-color.js';

  let {
    selectedFlowId,
    sectorColors,
    isViewMode,
    runMode,
    selectedDay,
    agendaDays,
    selectedDayIdx,
    agendaItems,
    agendaLayout,
    overlayItems,
    agendaMoveState,
    nowMinLive,
    agendaDragMoved,
    calendarCells,
    activeAgendaDate,
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
    onSetActiveSection,
    onRenameAgendaItem,
    onAddAgendaItem,
    agendaEl = $bindable(),
    timelineEl = $bindable(),
    agendaCalendarOpen = $bindable(),
    calendarMonthCursor = $bindable()
  }: {
    selectedFlowId: string | null;
    sectorColors: string[];
    isViewMode: boolean;
    runMode: boolean;
    selectedDay: AgendaDay | null;
    agendaDays: AgendaDay[] | null;
    selectedDayIdx: number;
    agendaItems: any[];
    agendaLayout: AgendaLayout;
    overlayItems: any[];
    agendaMoveState: any;
    nowMinLive: number;
    agendaDragMoved: boolean;
    calendarCells: any[];
    activeAgendaDate: () => string | null;
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
    onSetActiveSection: (s: any) => void;
    onRenameAgendaItem: (flowIdx: number, title: string) => void;
    onAddAgendaItem: (placement?: { startMin: number; duration: number }) => { id: string; startMin: number } | void;
    agendaEl: HTMLElement;
    timelineEl: HTMLElement;
    agendaCalendarOpen: boolean;
    calendarMonthCursor: string;
  } = $props();

  const s = appState.value;

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

  let pressTimer: ReturnType<typeof setTimeout> | null = null;
  let pressStartX = 0;
  let pressStartY = 0;
  let pressEvent: PointerEvent | null = null;
  let suppressNextClick = false;
  let editingAgendaTitleKey = $state('');
  let agendaTitleDraft = $state('');
  let pendingEditAgendaFlowId = $state<string | null>(null);
  let suppressAgendaTitleBlur = false;
  let lastAutoScrollKey = '';

  function agendaEditKey(item: any, idx: number) {
    return `${selectedDay?.date ?? ''}:${item.startMin}:${item.flow.id ?? item.flow.title}:${idx}`;
  }

  $effect(() => {
    if (!agendaEl || !timelineEl || !agendaItems.length || agendaDragMoved) return;
    const key = `${selectedDay?.date ?? ''}:has-items`;
    if (key === lastAutoScrollKey) return;
    lastAutoScrollKey = key;
    const targetTop = agendaAutoScrollTop(agendaLayout.window, timelineEl.offsetTop);
    requestAnimationFrame(() => {
      agendaEl.scrollTo({ top: targetTop, left: 0, behavior: 'auto' });
    });
  });

  function startAgendaTitleEdit(item: any, idx: number, e: Event) {
    e.stopPropagation();
    if (isViewMode || runMode || !item.fromText) return;
    editingAgendaTitleKey = agendaEditKey(item, idx);
    agendaTitleDraft = stripColorDirective(item.flow.title || '');
  }

  function commitAgendaTitle(idx: number) {
    if (!editingAgendaTitleKey) return;
    const title = agendaTitleDraft.trim() || 'Utan rubrik';
    onRenameAgendaItem(idx, title);
    editingAgendaTitleKey = '';
    agendaTitleDraft = '';
  }

  function placementAfter(idx: number) {
    const item = agendaItems[idx];
    const gap = availableGapAfterAgendaItem(agendaItems, idx);
    if (!item || gap < 30) return undefined;
    return { startMin: item.startMin + item.totalMin, duration: Math.min(45, gap) };
  }

  function addAgendaItemAndEdit(placement?: { startMin: number; duration: number }) {
    const added = onAddAgendaItem(placement);
    if (added?.id) pendingEditAgendaFlowId = added.id;
  }

  function commitAgendaTitleAndAddNext(idx: number) {
    const placement = placementAfter(idx);
    commitAgendaTitle(idx);
    if (placement) addAgendaItemAndEdit(placement);
  }

  function handleAgendaTitleBlur(idx: number) {
    if (suppressAgendaTitleBlur) {
      suppressAgendaTitleBlur = false;
      return;
    }
    commitAgendaTitle(idx);
  }

  function focusTitleInput(node: HTMLInputElement) {
    requestAnimationFrame(() => {
      node.focus();
      node.select();
    });
  }

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
    if (runMode) return;
    if (suppressNextClick) {
      suppressNextClick = false;
      e.preventDefault();
      return;
    }
    if (agendaDragMoved) return;
    item.fromText ? loadAgendaFlow(item.flow, item.startMin) : loadFlow(item.flow.id);
  }

  $effect(() => {
    if (!pendingEditAgendaFlowId) return;
    const idx = agendaItems.findIndex(item => item.flow.id === pendingEditAgendaFlowId);
    if (idx < 0) return;
    const item = agendaItems[idx];
    editingAgendaTitleKey = agendaEditKey(item, idx);
    agendaTitleDraft = stripColorDirective(item.flow.title || '');
    pendingEditAgendaFlowId = null;
  });
</script>

<aside id="agenda-panel" class="agenda" bind:this={agendaEl}>
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
      <p class="agenda-empty">{selectedDay?.date ? `Ingen plan sparad för ${fmtAgendaDate(selectedDay.date)} än.` : 'Skriv in dagplanen i Planera, eller spara flöden via ✎-panelen.'}</p>
      {#if !isViewMode && !runMode}
        <div class="agenda-add-row">
          <button class="agenda-add-inline" onclick={() => addAgendaItemAndEdit()} title="Lägg till block">+</button>
        </div>
      {:else}
        <button class="quickstart agenda-plan-link" onclick={() => onSetActiveSection('plan')}>Gå till Planera</button>
      {/if}
    {:else}
      {@const windowStart = agendaLayout.window.start}
      {@const windowMinutes = agendaLayout.window.minutes}
      <div id="agenda-timeline" class="agenda-timeline" class:has-overlay={overlayItems.length > 0} style="height: {agendaLayout.window.heightPx}px" bind:this={timelineEl}>
        {#if agendaMoveState && agendaMoveState.previewValid && agendaMoveState.previewStart !== null}
          {@const previewTop = ((agendaMoveState.previewStart - windowStart) / windowMinutes * 100).toFixed(3)}
          <div class="agenda-drop-indicator" style="top: {previewTop}%"></div>
        {/if}
        {#each agendaItems as item, ai (`${item.startMin}-${item.totalMin}-${item.flow.id ?? item.flow.title}-${ai}`)}
          {@const itemTitle = stripColorDirective(item.flow.title || '(utan rubrik)')}
          {@const layoutItem = agendaLayout.items[ai]}
          {@const itemColor = colorForSegment(item.flow.title || '(utan rubrik)', sectorColors, ai)}
          {@const itemEnd = item.startMin + item.totalMin}
          {@const today = localDateISO()}
          {@const itemDate = selectedDay?.date || today}
          {@const isPast = itemDate < today || (itemDate === today && nowMinLive >= itemEnd)}
          {@const isActive = itemDate === today && nowMinLive >= item.startMin && nowMinLive < itemEnd}
          {@const topPct = (layoutItem?.topPct ?? ((item.startMin - windowStart) / windowMinutes * 100)).toFixed(3)}
          {@const heightPct = (layoutItem?.heightPct ?? (item.totalMin / windowMinutes * 100)).toFixed(3)}
          {@const itemMeta = item.fromText && selectedDay ? s.agendaMeta[makeAgendaMetaKeyForFlow(selectedDay.date ?? null, item.flow, item.startMin)] ?? null : null}
          <div class="agenda-block"
               role="button"
               tabindex="0"
               title="{itemTitle} {fmtHM(item.startMin)}–{fmtHM(itemEnd)}"
               class:past={isPast}
               class:active={isActive}
               class:compact={layoutItem?.compact ?? item.totalMin < AGENDA_COMPACT_ITEM_MINUTES}
               class:dragging={agendaMoveState?.dayIdx === selectedDayIdx && agendaMoveState?.flowIdx === ai}
               style="top: {topPct}%; height: {heightPct}%; border-left-color: {itemColor}"
              onclick={(e) => handleBlockClick(item, ai, e)}
               onkeydown={(e) => {
                 if (e.key === 'Enter' || e.key === ' ') {
                   e.preventDefault();
                   if (!runMode && !agendaDragMoved) item.fromText ? loadAgendaFlow(item.flow, item.startMin, 'plan', true) : loadFlow(item.flow.id);
                 }
               }}>
            <span class="agenda-time">{fmtHM(item.startMin)}–{fmtHM(itemEnd)}</span>
            {#if itemMeta}
              <span class="agenda-source-badge" class:template={itemMeta.source === 'template'} class:ai={itemMeta.source === 'ai'} class:imported={itemMeta.source === 'import'} title={agendaMetaLabel(itemMeta)}>
                {agendaMetaBadge(itemMeta)}
              </span>
            {/if}
            {#if editingAgendaTitleKey === agendaEditKey(item, ai)}
              <input
                class="agenda-title-input"
                value={agendaTitleDraft}
                use:focusTitleInput
                oninput={(e) => agendaTitleDraft = (e.target as HTMLInputElement).value}
                onblur={() => handleAgendaTitleBlur(ai)}
                onkeydown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    suppressAgendaTitleBlur = true;
                    editingAgendaTitleKey = '';
                    agendaTitleDraft = '';
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    suppressAgendaTitleBlur = true;
                    commitAgendaTitleAndAddNext(ai);
                  }
                }}
                onclick={(e) => e.stopPropagation()}
                onpointerdown={(e) => e.stopPropagation()}
              />
            {:else}
              <button class="agenda-name agenda-name-btn" type="button" onclick={(e) => startAgendaTitleEdit(item, ai, e)} title="Ändra blocknamn">
                {#if isPast}
                  <del>{@html parseMarkdownHtml(itemTitle)}</del>
                {:else}
                  {@html parseMarkdownHtml(itemTitle)}
                {/if}
              </button>
            {/if}
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
              <button
                class="agenda-insert-after-btn"
                class:available={canInsertAgendaItemAfter(agendaItems, ai)}
                disabled={!canInsertAgendaItemAfter(agendaItems, ai)}
                onclick={(e) => {
                  e.stopPropagation();
                  const placement = placementAfter(ai);
                  if (placement) addAgendaItemAndEdit(placement);
                }}
                title={canInsertAgendaItemAfter(agendaItems, ai) ? 'Lägg till block efter' : 'För lite utrymme efter blocket'}
              >+</button>
              <div class="agenda-drag-top" role="separator" aria-orientation="horizontal" onpointerdown={(e) => startAgendaDrag(e, ai, 'top')}></div>
              <div class="agenda-drag-bottom" role="separator" aria-orientation="horizontal" onpointerdown={(e) => startAgendaDrag(e, ai, 'bottom')}></div>
              {#if s.activeSection !== 'now'}
                <div class="agenda-zone-left" aria-hidden="true"></div>
                <div class="agenda-zone-resize-top" aria-hidden="true"
                     onpointerdown={(e) => startAgendaDrag(e, ai, 'top')}></div>
                <div class="agenda-zone-resize-bottom" aria-hidden="true"
                     onpointerdown={(e) => startAgendaDrag(e, ai, 'bottom')}></div>
                <div class="agenda-zone-right"
                     role="presentation"
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
          {@const visEnd = Math.min(itemEnd, AGENDA_DAY_WINDOW_END)}
          {#if visEnd > visStart}
            {@const itemTitle = stripColorDirective(item.flow.title || '(utan rubrik)')}
            {@const topPct = ((visStart - windowStart) / windowMinutes * 100).toFixed(3)}
            {@const heightPct = ((visEnd - visStart) / windowMinutes * 100).toFixed(3)}
            <div class="agenda-block ghost"
                 class:past={isPast}
                 class:compact={item.totalMin < AGENDA_COMPACT_ITEM_MINUTES}
                 title="{itemTitle} {fmtHM(item.startMin)}–{fmtHM(itemEnd)}"
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
      {#if !isViewMode && !runMode}
        <div class="agenda-add-row">
          <button class="agenda-add-inline" onclick={() => addAgendaItemAndEdit()} title="Lägg till block">+</button>
        </div>
      {/if}
    {/if}
  </aside>
