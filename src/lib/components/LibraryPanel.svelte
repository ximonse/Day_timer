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
  <div class="field-label">Mallar</div>
  <button class="quickstart" onclick={onSaveFlow}
    title="Sparar nuvarande schema som en ateranvandbar mall">
    <span class="ico">💾︎</span> {savedFlowMsg || 'Spara som mall'}
  </button>
  <p class="flows-hint">Här sparar du återanvändbara upplägg. Ladda dem i planeringen eller lägg in dem direkt på vald dag.</p>
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
            <button class="flow-name" onclick={() => onLoadFlow(f.id)} title="Ladda mallen i den valda planeringsytan">{f.title || '(utan rubrik)'}</button>
            <button class="flow-add" onclick={() => onAddToAgenda(f.id)} title="Lägg till mallen på vald dag">＋</button>
            <button class="flow-del" onclick={() => onDeleteFlow(f.id)}><span class="ico">🗑︎</span></button>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>
