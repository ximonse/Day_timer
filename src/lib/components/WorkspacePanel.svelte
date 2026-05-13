<script lang="ts">
  let {
    loggedInUser,
    syncStatusText,
    syncStatusError,
    loginName,
    loginPass,
    shareToken,
    shareCopyText,
    shareUrl,
    aiProvider,
    aiProviderLabels,
    aiKeyPlaceholders,
    aiApiKey,
    aiKeyVisible,
    aiBaseUrl,
    aiCustomModel,
    onLogout,
    onSyncLoad,
    onSyncSave,
    onLogin,
    onLoginNameChange,
    onLoginPassChange,
    onCopyShareLink,
    onStopSharing,
    onStartSharing,
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
    shareToken: string;
    shareCopyText: string;
    shareUrl: string;
    aiProvider: string;
    aiProviderLabels: Record<string, string>;
    aiKeyPlaceholders: Record<string, string>;
    aiApiKey: string;
    aiKeyVisible: boolean;
    aiBaseUrl: string;
    aiCustomModel: string;
    onLogout: () => void;
    onSyncLoad: () => void;
    onSyncSave: () => void;
    onLogin: () => void;
    onLoginNameChange: (value: string) => void;
    onLoginPassChange: (value: string) => void;
    onCopyShareLink: () => void;
    onStopSharing: () => void;
    onStartSharing: () => void;
    onProviderChange: (value: string) => void;
    onToggleAiKeyVisible: () => void;
    onClearAiConfig: () => void;
    onAiApiKeyChange: (value: string) => void;
    onAiBaseUrlChange: (value: string) => void;
    onAiCustomModelChange: (value: string) => void;
  } = $props();
</script>

<div class="section-card">
  <div class="section-card-head">
    <strong>Synk och arbetsyta</strong>
  </div>
  <div class="section-copy">Har ligger sant som hor till kontot och appens infrastruktur, inte till ett enskilt block.</div>
</div>

<div class="login-form">
  {#if loggedInUser}
    <label>Synkronisering</label>
    <div class="logged-in-row">
      <span class="username">👤 {loggedInUser}</span>
      <button class="logout-btn" onclick={onLogout}>Logga ut</button>
    </div>
    <div class="sync-row">
      <button class="quickstart sync-btn" onclick={onSyncLoad}>☁ Ladda</button>
      <button class="quickstart sync-btn" onclick={onSyncSave}>☁ Spara</button>
    </div>
  {:else}
    <label>Synkronisering</label>
    <input type="text" class="sync-input"
      value={loginName}
      oninput={(e) => onLoginNameChange((e.target as HTMLInputElement).value)}
      placeholder="Namn" autocomplete="username" spellcheck="false" />
    <input type="password" class="sync-input"
      value={loginPass}
      oninput={(e) => onLoginPassChange((e.target as HTMLInputElement).value)}
      placeholder="Losenord" autocomplete="current-password" />
    <button class="quickstart" onclick={onLogin}>Logga in & synka</button>
  {/if}
  <div class="sync-status" style="color:{syncStatusError ? '#c0392b' : 'var(--muted)'}">{syncStatusText}</div>
</div>

<div class="share-section">
  <label>Dela session</label>
  {#if shareToken}
    <div class="share-link-row">
      <span class="share-link-text">{shareUrl}</span>
      <button class="ai-key-btn" onclick={onCopyShareLink}>{shareCopyText}</button>
    </div>
    <button class="quickstart" onclick={onStopSharing}>Sluta dela</button>
  {:else}
    <button class="quickstart" onclick={onStartSharing}>Starta delning</button>
  {/if}
</div>

<div class="ai-key-section">
  <label>AI-planering</label>
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
      <button class="ai-key-btn" onclick={onToggleAiKeyVisible}>{aiKeyVisible ? 'Dolj' : 'Andra'}</button>
      <button class="ai-key-btn" onclick={onClearAiConfig}>✕</button>
    </div>
    {#if aiKeyVisible}
      <input type="password" class="sync-input" placeholder={aiKeyPlaceholders[aiProvider]}
        value={aiApiKey}
        onchange={(e) => onAiApiKeyChange((e.target as HTMLInputElement).value.trim())} />
    {/if}
  {:else}
    <input type="password" class="sync-input" placeholder={aiKeyPlaceholders[aiProvider]}
      onchange={(e) => onAiApiKeyChange((e.target as HTMLInputElement).value.trim())} />
    <div class="sync-status" style="color:var(--muted)">Klistra in din API-nyckel for att aktivera AI-planering</div>
  {/if}
  {#if aiProvider === 'custom'}
    <input type="text" class="sync-input" placeholder="Bas-URL, t.ex. https://api.mistral.ai/v1"
      value={aiBaseUrl}
      onchange={(e) => onAiBaseUrlChange((e.target as HTMLInputElement).value.trim())} />
    <input type="text" class="sync-input" placeholder="Modell, t.ex. mistral-small-latest"
      value={aiCustomModel}
      onchange={(e) => onAiCustomModelChange((e.target as HTMLInputElement).value.trim())} />
  {/if}
</div>
