<script lang="ts">
  import { appState } from '$lib/state.svelte.js';
  import { PALETTES, PALETTE_COLORS, PALETTE_LABELS } from '$lib/theme.js';
  import { clickOutside } from '$lib/actions.js';

  let {
    open = $bindable(),
    onSyncBodyClasses
  }: {
    open: boolean;
    onSyncBodyClasses: () => void;
  } = $props();

  const s = appState.value;
</script>

<div style="position:relative; display:flex; align-items:center;"
  use:clickOutside={() => { open = false; }}>
  <button class="icon"
    aria-label={`Tema: ${PALETTE_LABELS[s.palette]}`}
    onclick={(e) => { e.stopPropagation(); open = !open; }}
    title={`Tema: ${PALETTE_LABELS[s.palette]}`}>
    <span class="theme-trigger-swatch" style="background:{PALETTE_COLORS[s.palette]}; width:12px; height:12px; border-radius:50%; border:1px solid rgba(0,0,0,0.1); display:inline-block;"></span>
  </button>
  {#if open}
    <div class="warnings-popup theme-popup-new" role="none" onclick={(e) => e.stopPropagation()}>
      <div class="field-label" style="font-size:10px;margin-bottom:8px;opacity:.7;">Teman</div>
      <div class="warn-dots-grid" style="gap:8px;">
        {#each PALETTES as p}
          <button class="wd on"
            style={`--warn-color:${PALETTE_COLORS[p]}; width:24px; height:24px;`}
            title={PALETTE_LABELS[p]}
            onclick={() => { s.palette = p; onSyncBodyClasses(); appState.persist(); open = false; }}
          >●</button>
        {/each}
      </div>
      <div style="margin-top:12px; padding-top:8px; border-top:1px solid var(--menu-border); display:flex; justify-content:center;">
        <button id="darkToggle" class:active={s.dark} title="Dag/Natt"
          style="width:40px; height:22px; border-radius:11px; font-size:12px; display:flex; align-items:center; justify-content:center; padding:0; border: 1px solid color-mix(in srgb, var(--menu-border) 40%, transparent);"
          onclick={() => { if (s.palette !== 'psychedelic') { s.dark = !s.dark; onSyncBodyClasses(); appState.persist(); } }}>
          {#if s.dark}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          {:else}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="4"></line>
              <line x1="12" y1="20" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="6.34" y2="6.34"></line>
              <line x1="17.66" y1="17.66" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="4" y2="12"></line>
              <line x1="20" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="6.34" y2="17.66"></line>
              <line x1="17.66" y1="6.34" x2="19.78" y2="4.22"></line>
            </svg>
          {/if}
        </button>
      </div>
    </div>
  {/if}
</div>
