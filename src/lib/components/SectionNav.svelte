<script lang="ts">
  import type { AppSection } from '$lib/state.svelte.js';

  let {
    activeSection,
    labels,
    onSelect
  }: {
    activeSection: AppSection;
    labels: Partial<Record<AppSection, string>>;
    onSelect: (section: AppSection) => void;
  } = $props();
</script>

<nav class="section-nav" aria-label="Appsektioner">
  {#each (Object.keys(labels) as AppSection[]) as section}
    <button class="section-tab" class:active={activeSection === section} onclick={() => onSelect(section)}>
      {labels[section]}
    </button>
  {/each}
</nav>
