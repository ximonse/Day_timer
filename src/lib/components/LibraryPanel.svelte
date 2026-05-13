<script lang="ts">
  import type { Flow } from '$lib/state.svelte.js';

  let {
    savedFlowMsg,
    flows,
    flowsOpen,
    onSaveFlow,
    onToggleFlows,
    onLoadFlow,
    onAddToAgenda,
    onDeleteFlow
  }: {
    savedFlowMsg: string;
    flows: Flow[];
    flowsOpen: boolean;
    onSaveFlow: () => void;
    onToggleFlows: () => void;
    onLoadFlow: (id: string) => void;
    onAddToAgenda: (id: string) => void;
    onDeleteFlow: (id: string) => void;
  } = $props();
</script>

<div class="flows">
  <label>Mallar</label>
  <button class="quickstart" onclick={onSaveFlow}
    title="Sparar nuvarande schema som en ateranvandbar mall">
    <span class="ico">💾︎</span> {savedFlowMsg || 'Spara som mall'}
  </button>
  <p class="flows-hint">Har sparar du ateranvandbara upplagg. Ladda i timern eller lagg till direkt i dagens plan.</p>
  {#if flows.length === 0}
    <p class="flows-hint">Inga mallar sparade annu.</p>
  {:else}
    <button class="flows-toggle" onclick={onToggleFlows}>
      Sparade mallar {flowsOpen ? '▾' : '▸'}
    </button>
    {#if flowsOpen}
      <div class="flow-list">
        {#each [...flows].sort((a, b) => (b.lastUsed ?? 0) - (a.lastUsed ?? 0)) as f (f.id)}
          <div class="flow-item">
            <button class="flow-name" onclick={() => onLoadFlow(f.id)} title="Ladda mallen i timern utan att andra dagplanen">{f.title || '(utan rubrik)'}</button>
            <button class="flow-add" onclick={() => onAddToAgenda(f.id)} title="Lagg till mallen i dagens dagplan">＋</button>
            <button class="flow-del" onclick={() => onDeleteFlow(f.id)}><span class="ico">🗑︎</span></button>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>
