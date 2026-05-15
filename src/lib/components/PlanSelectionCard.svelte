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
    shareToken,
    shareMode,
    shareCopyText,
    shareUrl,
    onToggleAgenda,
    onDetach,
    onToggleSourceHelp,
    onCopyShareLink,
    onStopSharing,
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
    shareToken: string;
    shareMode: 'active-session-live' | 'selected-session-snapshot' | 'selected-day-snapshot' | null;
    shareCopyText: string;
    shareUrl: string;
    onToggleAgenda: () => void;
    onDetach: () => void;
    onToggleSourceHelp: () => void;
    onCopyShareLink: () => void;
    onStopSharing: () => void;
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
      <label>Dela från planering</label>
      {#if shareToken}
        <div class="share-link-box">
          <span class="share-link-text">{shareUrl}</span>
          <div class="share-link-actions">
            <span class="section-chip">{shareMode === 'selected-day-snapshot' ? 'Dag' : 'Pass'}</span>
            <button class="ai-key-btn" onclick={onCopyShareLink}>{shareCopyText}</button>
          </div>
        </div>
        <div class="section-copy muted">
          {shareMode === 'selected-day-snapshot'
            ? 'Hela dagen delas som snapshot av vald agendadag.'
            : shareMode === 'selected-session-snapshot'
              ? 'Vald session delas som snapshot.'
              : 'En annan delning är redan aktiv.'}
        </div>
        <button class="quickstart" onclick={onStopSharing}>Sluta dela</button>
      {:else}
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="quickstart" onclick={onStartSessionShare}>Dela vald session</button>
          <button class="quickstart" onclick={onStartDayShare}>Dela hela dagen</button>
        </div>
      {/if}
    </div>
  {:else}
    <div class="section-copy">Klicka på ett block i dagplanen till höger för att börja redigera ett specifikt pass.</div>
    <div class="section-copy muted">När inget block är valt används fälten nedan för att skapa ett nytt block på vald dag.</div>
  {/if}
</div>
