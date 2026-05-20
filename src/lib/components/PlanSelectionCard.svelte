<script lang="ts">
  let {
    hasSelection,
    title,
    dateLabel,
    timeRange,
    saveLabel,
    sourceLabel,
    sourceHelp,
    showHelpHints,
    showSourceHelp,
    agendaOpen,
    canDetach,
    sessionShareUrl,
    dayShareUrl,
    sessionShareDisabled,
    shareCopyText,
    isCopyingSession,
    isCopyingDay,
    onToggleAgenda,
    onDetach,
    onToggleSourceHelp,
    onCopySessionShare,
    onCopyDayShare,
    onStopSessionShare,
    onStopDayShare,
    onStartSessionShare,
    onStartDayShare
  }: {
    hasSelection: boolean;
    title: string;
    dateLabel: string;
    timeRange: string;
    saveLabel: string;
    sourceLabel: string;
    sourceHelp: string;
    showHelpHints: boolean;
    showSourceHelp: boolean;
    agendaOpen: boolean;
    canDetach: boolean;
    sessionShareUrl: string;
    dayShareUrl: string;
    sessionShareDisabled: boolean;
    shareCopyText: string;
    isCopyingSession: boolean;
    isCopyingDay: boolean;
    onToggleAgenda: () => void;
    onDetach: () => void;
    onToggleSourceHelp: () => void;
    onCopySessionShare: () => void;
    onCopyDayShare: () => void;
    onStopSessionShare: () => void;
    onStopDayShare: () => void;
    onStartSessionShare: () => void;
    onStartDayShare: () => void;
  } = $props();
</script>

<div class="section-card">
  <div class="section-card-head">
    <strong>Valt dagplansblock</strong>
    <button class="ai-key-btn" onclick={onToggleAgenda}>
      {agendaOpen ? 'Dölj tidslinje' : 'Visa tidslinje'}
    </button>
  </div>
  {#if hasSelection}
    <div class="section-copy">{title} • {dateLabel} • {timeRange}</div>
    <div class="section-copy muted">Ändringar i fälten nedan sparas tillbaka till det markerade blocket.</div>
    <div class="section-copy" style="display:flex;align-items:center;gap:8px;justify-content:space-between;">
      <span><strong>Källa:</strong> <span class="section-chip on">{sourceLabel}</span></span>
      <button class="ai-key-btn" onclick={onToggleSourceHelp}>{showSourceHelp ? 'Dölj info' : 'i'}</button>
    </div>
    {#if showHelpHints || showSourceHelp}
      <div class="section-copy muted">{sourceHelp}</div>
    {/if}
    {#if canDetach}
      <div class="section-copy">
        <button class="ai-key-btn" onclick={onDetach}>Gör till manuellt block</button>
      </div>
    {/if}
    <div class="section-copy"><strong>Status:</strong> {saveLabel}</div>
    <div class="share-section" style="padding-top:8px;">
      <span class="share-label">Dela vald session</span>
      {#if sessionShareUrl}
        <div class="share-link-box">
          <span class="share-link-text">{sessionShareUrl}</span>
          <div class="share-link-actions">
            <span class="section-chip">Pass</span>
            <button class="ai-key-btn" onclick={onCopySessionShare}>{isCopyingSession ? shareCopyText : 'Kopiera länk'}</button>
          </div>
        </div>
        <button class="quickstart" onclick={onStopSessionShare}>Sluta dela passet</button>
      {:else}
        <button class="quickstart" onclick={onStartSessionShare} disabled={sessionShareDisabled} style="width:100%;">Dela vald session</button>
      {/if}
    </div>
    <div class="share-section" style="padding-top:8px;">
      <span class="share-label">Dela hela dagen</span>
      {#if dayShareUrl}
        <div class="share-link-box">
          <span class="share-link-text">{dayShareUrl}</span>
          <div class="share-link-actions">
            <span class="section-chip">Dag</span>
            <button class="ai-key-btn" onclick={onCopyDayShare}>{isCopyingDay ? shareCopyText : 'Kopiera länk'}</button>
          </div>
        </div>
        <button class="quickstart" onclick={onStopDayShare}>Sluta dela dagen</button>
      {:else}
        <button class="quickstart" onclick={onStartDayShare} style="width:100%;">Dela hela dagen</button>
      {/if}
    </div>
  {:else}
    <div class="section-copy">Klicka på ett block i dagplanen till höger för att börja redigera ett specifikt pass.</div>
    <div class="section-copy muted">När inget block är valt används fälten nedan för att skapa ett nytt block på vald dag.</div>
  {/if}
</div>
