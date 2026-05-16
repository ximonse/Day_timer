<script lang="ts">
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

  let reliabilityOpen = $state(false);
  let aiConfigOpen = $state(false);
</script>

<div class="section-card">
  <div class="section-card-head">
    <strong>Översikt</strong>
  </div>
  <div class="section-copy"><strong>Konto & AI</strong> samlar sådant som hör till konto, delad drift och AI-stöd snarare än till ett enskilt block.</div>
  <div class="section-chip-row">
    <span class="section-chip" class:on={syncReady}>{syncReady ? 'Synk aktiv' : 'Bara lokalt'}</span>
    <span class="section-chip" class:on={aiReady}>{aiReady ? 'AI redo' : 'AI av'}</span>
    <span class="section-chip">{reliabilityLevel} tillförlitlighet</span>
  </div>
</div>

<div class="section-card">
  <div class="section-card-head">
    <strong>Hjälpläge</strong>
    <button class="quickstart" onclick={onToggleHelpHints}>{showHelpHints ? 'Dölj hjälp' : 'Visa hjälp'} · Alt+i</button>
  </div>
  <div class="section-copy">Global hjälp visar förklarande texter där de finns. Lokala <code>i</code>-knappar fungerar alltid även när hjälpläget är av.</div>
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
        <button class="ai-key-btn" onclick={onClearAiConfig}>✕</button>
      </div>
      <div class="section-copy muted">Nyckeln används bara i den här sessionen.</div>
      {#if aiKeyVisible}
        <input type="password" class="sync-input" placeholder={aiKeyPlaceholders[aiProvider]}
          value={aiApiKey}
          onchange={(e) => onAiApiKeyChange((e.target as HTMLInputElement).value.trim())} />
      {/if}
    {:else}
      <input type="password" class="sync-input" placeholder={aiKeyPlaceholders[aiProvider]}
        onchange={(e) => onAiApiKeyChange((e.target as HTMLInputElement).value.trim())} />
      <div class="sync-status" style="color:var(--muted)">Klistra in din API-nyckel för att aktivera AI-planering</div>
    {/if}
    {#if aiProvider === 'custom'}
      <input type="text" class="sync-input" placeholder="Bas-URL, t.ex. https://api.mistral.ai/v1"
        value={aiBaseUrl}
        onchange={(e) => onAiBaseUrlChange((e.target as HTMLInputElement).value.trim())} />
      <input type="text" class="sync-input" placeholder="Modell, t.ex. mistral-small-latest"
        value={aiCustomModel}
        onchange={(e) => onAiCustomModelChange((e.target as HTMLInputElement).value.trim())} />
    {/if}
  {/if}
</div>

<style>
  .beta-tag {
    font-size: 9px;
    background: var(--accent);
    color: var(--bg);
    padding: 1px 4px;
    border-radius: 4px;
    vertical-align: middle;
    font-weight: 800;
    margin-left: 4px;
    opacity: 0.8;
  }
</style>

<div class="section-card">
  <div class="section-card-head">
    <strong>Tidsdata & tillförlitlighet <span class="beta-tag">BETA</span></strong>
    <button class="quickstart" onclick={() => reliabilityOpen = !reliabilityOpen}>{reliabilityOpen ? '▲' : '▼'}</button>
  </div>
  
  {#if reliabilityOpen}
    <div class="section-copy muted" style="margin-bottom:8px;">
      Den här funktionen är under utveckling och tanken är att den ska hjälpa med tidsuppskattningen av framtida pass. 
      Om man ändrar och bekräftar sina pass tidsåtgång så kommer den över tid ge tidsförslag när du skriver samma pass eller aktivitet i planeringen. 
      Observera att funktionen fortfarande slipas på.
    </div>
    <div class="section-copy">Bekräftade pass: <strong>{confirmedActualCount}</strong> · Obekräftade idag: <strong>{pendingActualCount}</strong></div>
    <div style="margin-top:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--muted);margin-bottom:4px;">
        <span>Tillförlitlighet</span>
        <span><strong>{reliabilityLevel}</strong> ({reliabilityPercent}%)</span>
      </div>
      <div style="height:10px;border-radius:999px;border:1px solid var(--border);background:var(--pill);overflow:hidden;">
        <div style="height:100%;width:{reliabilityPercent}%;background:color-mix(in srgb, var(--pill-on) 75%, var(--accent) 25%);"></div>
      </div>
      <div class="section-copy" style="margin-top:6px;">{reliabilityHint}</div>
    </div>
  {/if}
</div>
