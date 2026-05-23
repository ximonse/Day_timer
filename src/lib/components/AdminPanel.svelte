<script lang="ts">
  let {
    adminPassword,
    onAdminPasswordChange,
    onGenerateInvite,
    inviteCodeResult
  }: {
    adminPassword: string;
    onAdminPasswordChange: (value: string) => void;
    onGenerateInvite: (code: string, multi: boolean) => void;
    inviteCodeResult: string;
  } = $props();

  let newCode = $state('');
  let isMulti = $state(false);
</script>

<div class="admin-panel">
  <div class="admin-card">
    <div class="field-label">Generera inbjudningskod</div>
    <div class="feedback" style="margin-bottom: 4px;">Skapa en kod som låser upp Nivå 2 (AI-funktioner) för en användare.</div>
    
    <div class="admin-form">
      <input type="password" class="admin-input" placeholder="Adminlösenord" value={adminPassword} oninput={(e) => onAdminPasswordChange((e.target as HTMLInputElement).value)} />
      <input type="text" class="admin-input" placeholder="Kod (t.ex. BETA-2024)" bind:value={newCode} />
      
      <label class="multi-use-label">
        <input type="checkbox" bind:checked={isMulti} />
        <span>Flergångskod (flera användare)</span>
      </label>

      <button class="quickstart" onclick={() => { onGenerateInvite(newCode, isMulti); newCode = ''; }} disabled={!newCode.trim()} style="width: 100%;">
        Skapa kod
      </button>
    </div>

    {#if inviteCodeResult}
      <div class="success-msg">
        Kod skapad: <strong>{inviteCodeResult}</strong>
      </div>
    {/if}
  </div>

  <div class="admin-card" style="opacity: 0.7;">
    <div class="field-label">System-info</div>
    <div class="feedback">Koderna lagras i Redis och valideras vid aktivering i fliken Konto.</div>
  </div>
</div>

<style>
  .admin-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
    box-sizing: border-box;
  }
  .admin-card {
    background: var(--menu-surface);
    border: 1px solid var(--menu-border);
    border-radius: 14px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    box-sizing: border-box;
  }
  .admin-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 4px;
    width: 100%;
  }
  .admin-input {
    width: 100% !important;
    box-sizing: border-box !important;
  }
  .multi-use-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    cursor: pointer;
    user-select: none;
    padding: 2px 0;
  }
  .multi-use-label span {
    opacity: 0.8;
  }
  .success-msg {
    margin-top: 8px;
    font-size: 13px;
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 10%, transparent);
    padding: 10px;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
    text-align: center;
  }
  .field-label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 700;
    color: var(--menu-muted);
  }
  .feedback {
    font-size: 13px;
    line-height: 1.4;
    color: var(--menu-fg);
    opacity: 0.9;
  }
</style>
