<script lang="ts">
  import { appState } from '$lib/state.svelte.js';
  import type { AiProvider } from '$lib/ai.js';
  let {
    loggedInUser,
    syncStatusText,
    syncStatusError,
    loginName,
    loginPass,
    aiProvider,
    aiProviderLabels,
    aiKeyPlaceholders,
    aiApiKey,
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
    onLogin,
    onLoginNameChange,
    onLoginPassChange,
    onToggleHelpHints,
    onProviderChange,
    onToggleAiKeyVisible,
    onClearAiConfig,
    onAiApiKeyChange,
    onAiBaseUrlChange,
    onAiCustomModelChange
  }: {
    loggedInUser: string;
    syncStatusText: string;
    syncStatusError: boolean;
    loginName: string;
    loginPass: string;
    aiProvider: string;
    aiProviderLabels: Record<string, string>;
    aiKeyPlaceholders: Record<string, string>;
    aiApiKey: string;
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
    onLogin: () => void;
    onLoginNameChange: (value: string) => void;
    onLoginPassChange: (value: string) => void;
    onToggleHelpHints: () => void;
    onProviderChange: (value: string) => void;
    onToggleAiKeyVisible: () => void;
    onClearAiConfig: () => void;
    onAiApiKeyChange: (value: string) => void;
    onAiBaseUrlChange: (value: string) => void;
    onAiCustomModelChange: (value: string) => void;
  } = $props();

  let aiConfigOpen = $state(false);
</script>

<div class="ai-key-section" style="margin-bottom:24px;">
  <div class="field-label">Introduktionsguide</div>
  <div class="section-copy muted" style="margin-top:4px;">Få en guidad tur genom appens viktigaste funktioner.</div>
  
  <div style="display:flex; flex-direction:column; gap:8px; margin-top:12px;">
    <button class="quickstart" style="width:100%; justify-content:center; background:var(--accent); color:white;" onclick={() => appState.value.onboardingStep = 1}>
      Starta hela guiden
    </button>
    
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
      <button class="quickstart quickstart-subtle" style="font-size:12px; padding: 6px;" onclick={() => appState.value.onboardingStep = 1}>1. Grunderna</button>
      <button class="quickstart quickstart-subtle" style="font-size:12px; padding: 6px;" onclick={() => { appState.value.activeSection = 'now'; appState.value.onboardingStep = 7; }}>2. Nu-läget</button>
      <button class="quickstart quickstart-subtle" style="font-size:12px; padding: 6px;" onclick={() => { appState.value.activeSection = 'plan'; appState.value.onboardingStep = 10; }}>3. Planera</button>
      <button class="quickstart quickstart-subtle" style="font-size:12px; padding: 6px;" onclick={() => { appState.value.activeSection = 'plan'; appState.value.onboardingStep = 13; }}>4. Avancerat</button>
    </div>
  </div>
</div>

<div class="ai-key-section" style="margin-bottom:20px;">
  <div class="field-label">
    Hjälpläge
    <button class="quickstart" onclick={onToggleHelpHints} style="margin-left:auto; width:auto; padding: 2px 8px; font-size:11px;">
      {showHelpHints ? 'Dölj hjälp' : 'Visa hjälp'} · Alt+i
    </button>
  </div>
  <div class="section-copy muted" style="margin-top:4px;">Global hjälp visar förklarande texter. Lokala <code>i</code>-knappar fungerar alltid.</div>
</div>

<div class="login-form">
  <div class="section-copy muted">Synk gäller mallar, dagplaner och faktisk tid. Inloggningen sparas bara för den här webbläsarsessionen.</div>
  {#if loggedInUser}
    <div class="field-label">Synkronisering</div>
    <div class="logged-in-row">
      <span class="username">👤 {loggedInUser}</span>
      <button class="logout-btn" onclick={onLogout}>Logga ut</button>
    </div>
    <div class="sync-row">
      <button class="quickstart sync-btn" onclick={onSyncLoad}>☁ Ladda</button>
      <button class="quickstart sync-btn" onclick={onSyncSave}>☁ Spara</button>
    </div>
  {:else}
    <div class="field-label">Synkronisering</div>
    <input type="text" class="sync-input"
      value={loginName}
      oninput={(e) => onLoginNameChange((e.target as HTMLInputElement).value)}
      placeholder="Namn" autocomplete="username" spellcheck="false" />
    <input type="password" class="sync-input"
      value={loginPass}
      oninput={(e) => onLoginPassChange((e.target as HTMLInputElement).value)}
      placeholder="Lösenord" autocomplete="current-password" />
    <button class="quickstart" onclick={onLogin}>Logga in & synka</button>
  {/if}
  {#if syncStatusText}
    <div class="sync-status" class:error={syncStatusError}>{syncStatusText}</div>
  {/if}
</div>

<div class="ai-key-section">
  <div class="field-label">
    AI-planering <span class="beta-tag">BETA</span>
    <button class="ai-panel-toggle" onclick={() => aiConfigOpen = !aiConfigOpen} style="margin-left:4px;">
      {aiConfigOpen ? '▲' : '▼'}
    </button>
  </div>
  
  {#if aiConfigOpen}
    <div class="section-copy muted" style="margin-bottom:8px;">
      Används på egen risk. Var väldigt försiktig med att skriva in din API-nyckel på nätet. 
      Här används nyckeln enbart för att skicka förfrågningar direkt till vald AI-leverantör från din webbläsare, 
      och den sparas enbart lokalt i den här sessionen.
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
        <span class="ai-key-masked">🔑 {aiApiKey.slice(0, 8)}···{aiApiKey.slice(-4)}</span>
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

    {#if aiProvider === 'custom'}
      <div class="field-label" style="margin-top:12px;">Base URL</div>
      <input type="text" class="sync-input" 
        value={aiBaseUrl}
        oninput={(e) => onAiBaseUrlChange((e.target as HTMLInputElement).value)}
        placeholder="https://api.openai.com/v1" />
      <div class="field-label" style="margin-top:8px;">Model name</div>
      <input type="text" class="sync-input" 
        value={aiCustomModel}
        oninput={(e) => onAiCustomModelChange((e.target as HTMLInputElement).value)}
        placeholder="gpt-4o" />
    {/if}
  {/if}
</div>

<div class="ai-key-section" style="margin-top:16px;">
  <div class="field-label">
    Tidsdata & Lärande <span class="beta-tag">BETA</span>
    <button class="ai-panel-toggle" onclick={onToggleTimeData} style="margin-left:4px;">
      {timeDataOpen ? '▲' : '▼'}
    </button>
  </div>
  
  {#if timeDataOpen}
    <div class="section-copy muted" style="margin-bottom:8px;">
      Baserat på {confirmedActualCount} bekräftade pass.
    </div>
    <div class="reliability-box">
      <div class="rel-head">
        <span>Tillförlitlighet: <strong>{reliabilityLevel}</strong></span>
        <span class="rel-percent">{reliabilityPercent}%</span>
      </div>
      <div class="rel-bar"><div class="rel-progress" style="width: {reliabilityPercent}%"></div></div>
      <div class="rel-hint">{reliabilityHint}</div>
    </div>
    {#if pendingActualCount > 0}
      <div class="section-copy muted" style="margin-top:8px;">
        Du har <strong>{pendingActualCount}</strong> obekräftade pass. Gå till Planera för att granska dem.
      </div>
    {/if}
  {/if}
</div>
