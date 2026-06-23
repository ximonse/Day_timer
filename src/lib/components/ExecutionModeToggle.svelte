<script lang="ts">
  let {
    enabled,
    disabled = false,
    onChange
  }: {
    enabled: boolean;
    disabled?: boolean;
    onChange: (enabled: boolean) => void;
  } = $props();
</script>

<button
  class="execution-mode-toggle"
  class:on={enabled}
  type="button"
  role="switch"
  aria-checked={enabled}
  aria-label="Flödesläge"
  disabled={disabled}
  title={disabled
    ? 'Stoppa körläget för att byta'
    : enabled
      ? 'Flödesläge: aktiviteter avslutas med bocken'
      : 'Tidsstyrt läge: aktiviteter byts när tiden är slut'}
  onclick={(event) => {
    event.stopPropagation();
    onChange(!enabled);
  }}
>
  <span class="execution-mode-thumb">{enabled ? '✓' : ''}</span>
</button>

<style>
  .execution-mode-toggle {
    width: 34px;
    height: 18px;
    padding: 2px;
    border: 1px solid color-mix(in srgb, var(--border) 76%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, var(--muted) 20%, transparent);
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    cursor: pointer;
    transition: background .16s, border-color .16s, opacity .16s;
  }

  .execution-mode-toggle.on {
    justify-content: flex-end;
    background: color-mix(in srgb, var(--accent) 28%, var(--panel));
    border-color: color-mix(in srgb, var(--accent) 62%, var(--border));
  }

  .execution-mode-toggle:disabled {
    cursor: default;
    opacity: .48;
  }

  .execution-mode-thumb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--panel);
    color: var(--accent);
    box-shadow: 0 1px 3px rgba(0, 0, 0, .22);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 8px;
    font-weight: 800;
    line-height: 1;
  }
</style>
