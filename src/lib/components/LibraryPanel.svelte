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
    onDeleteFlow
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
  } = $props();
</script>

<div class="plan-editor">
  <button class="quickstart" onclick={onSaveFlow}
    title="Sparar nuvarande schema — rubrik, aktiviteter och tid — som en återanvändbar mall i biblioteket.">
    <span class="ico">💾︎</span> {savedFlowMsg || 'Spara som mall'}
  </button>

  {#if flows.length === 0}
    <p class="flows-hint">Inga mallar ännu. Spara ett pass från Nu eller Planera.</p>
  {:else}
    <button class="flows-toggle" onclick={onToggleFlows}>
      Sparade mallar {flowsOpen ? '▾' : '▸'}
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
