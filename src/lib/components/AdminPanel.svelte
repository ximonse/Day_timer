<script lang="ts">
  let {
    adminPassword,
    onGenerateInvite,
    inviteCodeResult
  }: {
    adminPassword: string;
    onGenerateInvite: (code: string, multi: boolean) => void;
    inviteCodeResult: string;
  } = $props();

  let newCode = $state('');
  let isMulti = $state(false);
</script>

<div class="admin-panel">
  <div class="step-section">
    <div class="field-label">Generera inbjudningskod</div>
    <div class="feedback">Skapa en kod som låser upp Nivå 2 (AI-funktioner) för en användare.</div>
    
    <input type="text" placeholder="Kod (t.ex. BETA-2024)" bind:value={newCode} />
    
    <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 14px; cursor: pointer;">
      <input type="checkbox" bind:checked={isMulti} />
      Flergångskod (kan användas av flera)
    </label>

    <button class="quickstart" onclick={() => { onGenerateInvite(newCode, isMulti); newCode = ''; }} disabled={!newCode.trim()}>
      Skapa kod
    </button>

    {#if inviteCodeResult}
      <div class="feedback" style="margin-top: 12px; font-weight: bold; color: var(--accent);">
        Kod skapad: {inviteCodeResult}
      </div>
    {/if}
  </div>

  <div class="step-section" style="margin-top: 24px;">
    <div class="field-label">Admin-info</div>
    <div class="feedback">Inloggad som administratör. Koderna lagras i Redis och valideras vid aktivering.</div>
  </div>
</div>

<style>
  .admin-panel {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
</style>
