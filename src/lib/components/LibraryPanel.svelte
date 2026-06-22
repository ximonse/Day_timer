<script lang="ts">
  import type { Flow } from '$lib/state.svelte.js';

  let {
    savedFlowMsg,
    flows,
    flowsOpen,
    describeFlow,
    formatLastUsed,
    onSaveFlow,
    onToggleFlows,
    onLoadFlow,
    onAddToAgenda,
    onDeleteFlow,
    showInfo = true
  }: {
    savedFlowMsg: string;
    flows: Flow[];
    flowsOpen: boolean;
    describeFlow: (flow: Flow) => string;
    formatLastUsed: (timestamp?: number) => string;
    onSaveFlow: () => void;
    onToggleFlows: () => void;
    onLoadFlow: (id: string) => void;
    onAddToAgenda: (id: string) => void;
    onDeleteFlow: (id: string) => void;
    showInfo?: boolean;
  } = $props();

  let showSaveInfo = $state(showInfo);
  $effect(() => { showSaveInfo = showInfo; });
</script>

<div class="library-menu-workspace">
  <div class="plan-editor library-menu-primary">
    <div class="lib-section-title">
      <span>Spara mall</span>
      <button class="menu-i" class:active={showSaveInfo}
        onclick={() => showSaveInfo = !showSaveInfo}
        title={showSaveInfo ? 'Dölj förklaring' : 'Visa förklaring'}>i</button>
    </div>
    {#if showSaveInfo}
      <div class="planner-card-copy">Gör nuvarande pass återanvändbart. Mallen sparar rubrik, aktiviteter, tider och kommentarer.</div>
    {/if}
    <button class="quickstart" onclick={onSaveFlow}
      title="Sparar nuvarande schema — rubrik, aktiviteter och tid — som en återanvändbar mall i biblioteket.">
      <span class="ico">💾︎</span> {savedFlowMsg || 'Spara som mall'}
    </button>
  </div>

  <div class="plan-editor library-menu-list">
    <div class="lib-section-title">
      <span>Sparade mallar</span>
    </div>
    {#if flows.length === 0}
      <p class="flows-hint">Inga mallar ännu. Spara ett pass från Nu eller Planera.</p>
    {:else}
      <button class="flows-toggle" onclick={onToggleFlows}>
        {flows.length} mall{flows.length === 1 ? '' : 'ar'} {flowsOpen ? '▾' : '▸'}
      </button>
      {#if flowsOpen}
        <div class="flow-list">
          {#each [...flows].sort((a, b) => (b.lastUsed ?? 0) - (a.lastUsed ?? 0)) as f (f.id)}
            <div class="flow-item">
              <div class="flow-main">
                <button class="flow-name" onclick={() => onLoadFlow(f.id)} title="Ladda mallen i den valda planeringsytan">{f.title || '(utan rubrik)'}</button>
                <div class="flow-meta">
                  <span>{describeFlow(f)}</span>
                  <span>{formatLastUsed(f.lastUsed)}</span>
                </div>
              </div>
              <div class="flow-actions">
                <button class="flow-add" onclick={() => onAddToAgenda(f.id)} title="Lägg till mallen på vald dag">＋</button>
                <button class="flow-del" onclick={() => onDeleteFlow(f.id)}><span class="ico">🗑︎</span></button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .library-menu-workspace {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr));
    gap: 12px;
    align-items: start;
  }
  .library-menu-primary,
  .library-menu-list {
    min-width: 0;
  }
  .library-menu-primary {
    position: sticky;
    top: 0;
  }
  .lib-section-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--menu-fg);
    margin-bottom: 4px;
  }
  @container (max-width: 480px) {
    .library-menu-primary { position: static; }
  }
</style>
