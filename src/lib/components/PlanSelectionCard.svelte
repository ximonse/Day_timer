<script lang="ts">
  let {
    hasSelection,
    title,
    dateLabel,
    timeRange,
    saveLabel,
    sourceLabel,
    sourceHelp,
    agendaOpen,
    canDetach,
    onToggleAgenda,
    onDetach
  }: {
    hasSelection: boolean;
    title: string;
    dateLabel: string;
    timeRange: string;
    saveLabel: string;
    sourceLabel: string;
    sourceHelp: string;
    agendaOpen: boolean;
    canDetach: boolean;
    onToggleAgenda: () => void;
    onDetach: () => void;
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
    <div class="section-copy muted">Andringar i falten nedan sparas tillbaka till det markerade blocket.</div>
    <div class="section-copy"><strong>Källa:</strong> {sourceLabel}</div>
    <div class="section-copy muted">{sourceHelp}</div>
    {#if canDetach}
      <div class="section-copy">
        <button class="ai-key-btn" onclick={onDetach}>Gör till manuellt block</button>
      </div>
    {/if}
    <div class="section-copy"><strong>Status:</strong> {saveLabel}</div>
  {:else}
    <div class="section-copy">Klicka pa ett block i dagplanen till hoger for att borja redigera ett specifikt pass.</div>
  {/if}
</div>
