<script lang="ts">
  import { appState } from '$lib/state.svelte.js';
  import type { AiProvider } from '$lib/ai.js';
  let {
    userLevel,
    onUpgrade,
    loggedInUser,
    syncStatusText,
    syncStatusError,
    loginName,
    loginPass,
    aiProvider,
    aiProviderLabels,
    aiKeyPlaceholders,
    aiApiKey,
    aiRememberApiKey,
    aiKeyVisible,
    aiBaseUrl,
    aiCustomModel,
    syncReady,
    aiReady,
    showHelpHints,
    confirmedActualCount,
    pendingActualCount,
    reliabilityPercent,
    reliabilityLevel,
    reliabilityHint,
    timeDataOpen,
    onToggleTimeData,
    onLogout,
    onSyncLoad,
    onSyncSave,
    onLoadSnapshots,
    onRestoreSnapshot,
    onLogin,
    syncProbeText,
    syncProbeState,
    workspaceSnapshots,
    workspaceSnapshotsLoading,
    onLoginNameChange,
    onLoginPassChange,
    onToggleHelpHints,
    onProviderChange,
    onToggleAiKeyVisible,
    onClearAiConfig,
    onAiApiKeyChange,
    onAiRememberApiKeyChange,
    onAiBaseUrlChange,
    onAiCustomModelChange,
    whisperKey,
    onWhisperKeyChange
  }: {
    userLevel: number;
    onUpgrade: (code: string) => void;
    loggedInUser: string;
    syncStatusText: string;
    syncStatusError: boolean;
    loginName: string;
    loginPass: string;
    aiProvider: string;
    aiProviderLabels: Record<string, string>;
    aiKeyPlaceholders: Record<string, string>;
    aiApiKey: string;
    aiRememberApiKey: boolean;
    aiKeyVisible: boolean;
    aiBaseUrl: string;
    aiCustomModel: string;
    syncReady: boolean;
    aiReady: boolean;
    showHelpHints: boolean;
    confirmedActualCount: number;
    pendingActualCount: number;
    reliabilityPercent: number;
    reliabilityLevel: string;
    reliabilityHint: string;
    timeDataOpen: boolean;
    onToggleTimeData: () => void;
    onLogout: () => void;
    onSyncLoad: () => void;
    onSyncSave: () => void;
    onLoadSnapshots: () => void;
    onRestoreSnapshot: (snapshotId: string) => void;
    onLogin: () => void;
    syncProbeText: string;
    syncProbeState: 'idle' | 'queued' | 'loading' | 'saving' | 'ok' | 'error' | 'conflict';
    workspaceSnapshots: { id: string; revision: number; createdAt: string; reason: 'manual-save' | 'restore' }[];
    workspaceSnapshotsLoading: boolean;
    onLoginNameChange: (value: string) => void;
    onLoginPassChange: (value: string) => void;
    onToggleHelpHints: () => void;
    onProviderChange: (value: string) => void;
    onToggleAiKeyVisible: () => void;
    onClearAiConfig: () => void;
    onAiApiKeyChange: (value: string) => void;
    onAiRememberApiKeyChange: (value: boolean) => void;
    onAiBaseUrlChange: (value: string) => void;
    onAiCustomModelChange: (value: string) => void;
    whisperKey: string;
    onWhisperKeyChange: (value: string) => void;
  } = $props();

  let aiConfigOpen = $state(false);
  let inviteCode = $state('');

  function snapshotLabel(createdAt: string) {
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return createdAt;
    return date.toLocaleString('sv-SE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
</script>

<div class="ws-stack">

<div class="plan-editor">
  {#if loggedInUser}
    <div class="logged-in-row">
      <span class="username">👤 {loggedInUser}</span>
      <button class="logout-btn" onclick={onLogout}>Logga ut</button>
    </div>
    <div class="sync-row">
      <button class="quickstart sync-btn" onclick={onSyncLoad}>☁ Ladda</button>
      <button class="quickstart sync-btn" onclick={() => onSyncSave()}>☁ Spara</button>
    </div>
    <div class="snapshot-panel">
      <button class="quickstart quickstart-subtle snapshot-load" onclick={onLoadSnapshots}>
        {workspaceSnapshotsLoading ? 'Laddar...' : 'Tidigare versioner'}
      </button>
      {#if workspaceSnapshots.length > 0}
        <div class="snapshot-list">
          {#each workspaceSnapshots as snapshot}
            <div class="snapshot-row">
              <span>
                {snapshotLabel(snapshot.createdAt)}
                <small>rev {snapshot.revision}</small>
              </span>
              <button class="snapshot-restore" onclick={() => onRestoreSnapshot(snapshot.id)}>Återställ</button>
            </div>
          {/each}
        </div>
      {/if}
    </div>
    {#if syncProbeText}
      <div class="sync-probe" class:error={syncProbeState === 'error'} class:conflict={syncProbeState === 'conflict'}>
        <span class="probe-dot" class:active={['loading', 'saving'].includes(syncProbeState)}></span>
        {syncProbeText}
      </div>
    {/if}
    {#if syncProbeState === 'conflict'}
      <div class="section-copy" style="color:var(--accent); font-weight:600; font-size:11px;">
        Välj "Ladda" för att hämta molnets version.
      </div>
    {/if}
  {:else}
    <input type="text" class="sync-input"
      value={loginName}
      oninput={(e) => onLoginNameChange((e.target as HTMLInputElement).value)}
      placeholder="Namn" autocomplete="username" spellcheck="false" />
    <input type="password" class="sync-input"
      value={loginPass}
      oninput={(e) => onLoginPassChange((e.target as HTMLInputElement).value)}
      placeholder="Lösenord" autocomplete="current-password" />
    <button class="quickstart" onclick={onLogin}
      title="Synkar mallar, dagplaner och faktisk tid. Inloggningen sparas bara i denna webbläsarsession.">
      Logga in & synka
    </button>
  {/if}
  {#if syncStatusText}
    <div class="sync-status" class:error={syncStatusError}>{syncStatusText}</div>
  {/if}
</div>

{#if userLevel >= 2}
  <div class="plan-editor">
    <button class="ai-panel-toggle" onclick={() => aiConfigOpen = !aiConfigOpen}>
      {aiConfigOpen ? '−' : '+'} AI-planering <span class="beta-tag">BETA</span>
    </button>
    {#if aiConfigOpen}
      <div class="section-copy muted" style="font-size:11px;">
        Nyckeln skickas enbart direkt till vald leverantör — sparas aldrig på server.
      </div>

      <select class="sync-input ai-provider-select"
        value={aiProvider}
        onchange={(e) => onProviderChange((e.target as HTMLSelectElement).value)}>
        {#each Object.entries(aiProviderLabels) as [val, label]}
          <option value={val}>{label}</option>
        {/each}
      </select>

      {#if aiApiKey}
        <div class="ai-key-row">
          <span class="ai-key-masked">◆ {aiApiKey.slice(0, 8)}···{aiApiKey.slice(-4)}</span>
          <button class="ai-key-btn" onclick={onToggleAiKeyVisible}>{aiKeyVisible ? 'Dölj' : 'Ändra'}</button>
          <button class="ai-key-btn" onclick={onClearAiConfig}>Rensa</button>
        </div>
        {#if aiKeyVisible}
          <input type="password" class="sync-input"
            value={aiApiKey}
            oninput={(e) => onAiApiKeyChange((e.target as HTMLInputElement).value)}
            placeholder={aiKeyPlaceholders[aiProvider]} />
        {/if}
      {:else}
        <input type="password" class="sync-input"
          value={aiApiKey}
          oninput={(e) => onAiApiKeyChange((e.target as HTMLInputElement).value)}
          placeholder={aiKeyPlaceholders[aiProvider]} />
      {/if}

      <label class="remember-key-row">
        <input
          type="checkbox"
          checked={aiRememberApiKey}
          onchange={(e) => onAiRememberApiKeyChange((e.target as HTMLInputElement).checked)}
        />
        <span title="Slå bara på detta på egen dator eller mobil.">Kom ihåg nyckel på denna enhet</span>
      </label>

      {#if aiProvider === 'custom'}
        <input type="text" class="sync-input"
          value={aiBaseUrl}
          oninput={(e) => onAiBaseUrlChange((e.target as HTMLInputElement).value)}
          placeholder="Base URL (t.ex. https://api.openai.com/v1)" />
        <input type="text" class="sync-input"
          value={aiCustomModel}
          oninput={(e) => onAiCustomModelChange((e.target as HTMLInputElement).value)}
          placeholder="Modellnamn (t.ex. gpt-4o)" />
      {/if}

      {#if aiProvider !== 'openai'}
        <input type="password" class="sync-input"
          value={whisperKey}
          oninput={(e) => onWhisperKeyChange((e.target as HTMLInputElement).value)}
          placeholder="OpenAI-nyckel för röst (Whisper) – valfri"
          title="Lägg till en OpenAI-nyckel enbart för röstigenkänning med Whisper. Din AI-leverantör för planering påverkas inte." />
      {/if}
    {/if}
  </div>
{/if}

<div class="plan-editor">
  <button class="ai-panel-toggle" onclick={onToggleTimeData}>
    {timeDataOpen ? '−' : '+'} Tidsdata & Lärande <span class="beta-tag">BETA</span>
  </button>
  {#if timeDataOpen}
    <div class="section-copy muted" style="font-size:11px;">
      Baserat på {confirmedActualCount} bekräftade pass.
    </div>
    <div class="rel-box">
      <div class="rel-head">
        <span>Tillförlitlighet: <strong>{reliabilityLevel}</strong></span>
        <span class="rel-percent">{reliabilityPercent}%</span>
      </div>
      <div class="rel-bar"><div class="rel-fill" style="width: {reliabilityPercent}%"></div></div>
      <div class="rel-hint">{reliabilityHint}</div>
    </div>
    {#if pendingActualCount > 0}
      <div class="section-copy muted" style="font-size:11px;">
        Du har <strong>{pendingActualCount}</strong> obekräftade pass. Gå till Planera för att granska dem.
      </div>
    {/if}
  {/if}
</div>

<div class="plan-editor">
  <button class="quickstart" style="justify-content:center; background:var(--accent); color:white;"
    onclick={() => appState.value.onboardingStep = 1}
    title="Starta en guidad tur genom appens viktigaste funktioner.">
    Starta hela guiden
  </button>
  <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
    <button class="quickstart quickstart-subtle" style="font-size:12px; padding:6px; justify-content:center;"
      onclick={() => appState.value.onboardingStep = 1}>1. Grunderna</button>
    <button class="quickstart quickstart-subtle" style="font-size:12px; padding:6px; justify-content:center;"
      onclick={() => { appState.value.activeSection = 'now'; appState.value.onboardingStep = 7; }}>2. Nu-läget</button>
    <button class="quickstart quickstart-subtle" style="font-size:12px; padding:6px; justify-content:center;"
      onclick={() => { appState.value.activeSection = 'plan'; appState.value.onboardingStep = 10; }}>3. Planera</button>
    <button class="quickstart quickstart-subtle" style="font-size:12px; padding:6px; justify-content:center;"
      onclick={() => { appState.value.activeSection = 'plan'; appState.value.onboardingStep = 13; }}>4. Avancerat</button>
  </div>
  <button class="write-section-toggle" type="button" onclick={onToggleHelpHints}
    title="Visar förklarande hjälptexter i hela appen. Lokala i-knappar fungerar alltid. · Alt+i">
    <span>Hjälpläge</span>
    <span class="state-chip" class:on={showHelpHints}>{showHelpHints ? 'på' : 'av'}</span>
  </button>
</div>

</div><!-- ws-stack -->

<div style="padding-top:24px; display:flex; justify-content:flex-end;">
  <input
    type="text"
    bind:value={inviteCode}
    onkeydown={(e) => { if (e.key === 'Enter') { onUpgrade(inviteCode); inviteCode = ''; } }}
    style="opacity:0.15; background:transparent; border:none; width:80px; color:currentColor; font-size:11px; cursor:default; transition:opacity 0.2s;"
    title="Unlock Level 2"
  />
</div>

<style>
  .ws-stack {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .state-chip {
    font-size: 10px;
    font-weight: 700;
    color: var(--menu-muted);
    background: var(--menu-pill);
    padding: 2px 8px;
    border-radius: 999px;
  }
  .state-chip.on {
    background: var(--menu-pill-on);
    color: var(--menu-pill-on-fg);
  }
  .rel-box {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 12px;
    background: color-mix(in srgb, var(--menu-pill) 52%, transparent);
    border: 1px solid color-mix(in srgb, var(--menu-border) 70%, transparent);
    border-radius: 10px;
  }
  .rel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    color: var(--menu-fg);
  }
  .rel-percent {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .rel-bar {
    height: 5px;
    background: color-mix(in srgb, var(--menu-border) 60%, transparent);
    border-radius: 999px;
    overflow: hidden;
  }
  .rel-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 999px;
    transition: width 0.4s ease;
  }
  .rel-hint {
    font-size: 11px;
    color: var(--menu-muted);
  }
  .sync-probe {
    font-size: 11px;
    color: var(--menu-muted);
    display: flex;
    align-items: center;
    gap: 6px;
    font-variant-numeric: tabular-nums;
  }
  .sync-probe.error { color: #a12d21; }
  .sync-probe.conflict { color: var(--accent); font-weight: 600; }
  .snapshot-panel {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .snapshot-load {
    width: 100%;
    justify-content: center;
    font-size: 12px;
  }
  .snapshot-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .snapshot-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 12px;
    color: var(--menu-text);
  }
  .snapshot-row small {
    color: var(--menu-muted);
    margin-left: 4px;
  }
  .snapshot-restore {
    border: 1px solid var(--menu-line);
    background: transparent;
    color: var(--menu-text);
    border-radius: 6px;
    padding: 3px 7px;
    font-size: 11px;
    cursor: pointer;
    font-family: inherit;
  }
  .snapshot-restore:hover {
    border-color: var(--accent);
  }
  .remember-key-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--menu-text);
    cursor: pointer;
  }
  .remember-key-row input {
    width: auto;
  }
  .probe-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--menu-muted);
    opacity: 0.3;
    flex-shrink: 0;
  }
  .probe-dot.active {
    background: var(--accent);
    opacity: 1;
    animation: pulse 1s infinite alternate;
  }
  @keyframes pulse {
    from { opacity: 0.4; transform: scale(0.8); }
    to { opacity: 1; transform: scale(1.1); }
  }
</style>
