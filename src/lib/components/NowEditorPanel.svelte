<script lang="ts">
  let textareaEl = $state<HTMLTextAreaElement | null>(null);

  $effect(() => {
    if (textareaEl && textareaEl.value !== partsValue) {
      textareaEl.value = partsValue;
    }
  });

  let {
    titleValue,
    partsValue,
    partsFeedbackText,
    onTitleInput,
    onPartsInput,
    onPartsKeyDown,
    onAction,
    actionLabel,
    activeShareUrl,
    shareCopyText,
    isCopyingActive,
    onCopyActiveShare,
    onStopActiveShare,
    onStartLiveShare,
    onSaveFlow,
    savedFlowMsg,
    showTitleHelp,
    showPartsHelp,
    onToggleTitleHelp,
    onTogglePartsHelp
  }: {
    titleValue: string;
    partsValue: string;
    partsFeedbackText: string;
    onTitleInput: (value: string) => void;
    onPartsInput: (value: string) => void;
    onPartsKeyDown: (e: KeyboardEvent) => void;
    onAction: () => void;
    actionLabel: string;
    activeShareUrl: string;
    shareCopyText: string;
    isCopyingActive: boolean;
    onCopyActiveShare: () => void;
    onStopActiveShare: () => void;
    onStartLiveShare: () => void;
    onSaveFlow: () => void;
    savedFlowMsg: string;
    showTitleHelp: boolean;
    showPartsHelp: boolean;
    onToggleTitleHelp: () => void;
    onTogglePartsHelp: () => void;
  } = $props();
</script>

<div class="step-section">
  <div class="step-num">1</div>
  <div class="step-body">
    <div class="field-head">
      <div class="field-label">Rubrik</div>
      <button class="info-btn" type="button" onclick={onToggleTitleHelp}>i</button>
    </div>
    {#if showTitleHelp}
      <div class="feedback">Rubriken styr vad som syns i klockan, i sidopanelen och i delningsläget.</div>
    {/if}
    <input type="text" placeholder="Matematik"
      value={titleValue}
      oninput={(e) => onTitleInput((e.target as HTMLInputElement).value)} />
  </div>
</div>

<div class="step-section">
  <div class="step-num">2</div>
  <div class="step-body">
    <div class="field-head">
      <div class="field-label">Aktiviteter</div>
      <button class="info-btn" type="button" onclick={onTogglePartsHelp}>i</button>
    </div>
    {#if showPartsHelp}
      <div class="feedback">En rad per aktivitet. Tider som slutar med <code>m</code> låses, övriga delar fördelas automatiskt. Börja en rad med <code>#</code> för rubrik, <code>-</code> för underpunkt och <code>&amp;</code> för kommentar. <code>Tab</code> gör underpunkt och <code>Enter</code> ny rad.</div>
    {/if}
    <textarea id="now-activities-input" placeholder="Genomgång&#10;Eget arbete&#10;Avslut"
      bind:this={textareaEl}
      oninput={(e) => onPartsInput((e.target as HTMLTextAreaElement).value)}
      onkeydown={onPartsKeyDown}></textarea>
    <div class="feedback">{partsFeedbackText}</div>
  </div>
</div>

<div class="step-section step-section--action">
  <div class="step-num">3</div>
  <div class="step-body">
    <button id="quickStartBtn" class="quickstart" style="width:100%" onclick={onAction}><span class="ico">⚡︎</span> {actionLabel}</button>
  </div>
</div>

<div class="share-section">
  <div class="field-label">Dela</div>
  {#if activeShareUrl}
    <div class="share-link-box">
      <span class="share-link-text">{activeShareUrl}</span>
      <div class="share-link-actions">
        <span class="section-chip">Live</span>
        <button class="ai-key-btn" onclick={onCopyActiveShare}>{isCopyingActive ? shareCopyText : 'Kopiera länk'}</button>
      </div>
    </div>
    <div class="section-copy muted">Aktiva sessionen delas live — uppdateringar syns för mottagaren.</div>
    <button class="quickstart" onclick={onStopActiveShare}>Sluta dela</button>
  {:else}
    <button id="now-share-btn" class="quickstart" onclick={onStartLiveShare}>Dela aktiv session</button>
  {/if}
  <button id="now-save-template-btn" class="quickstart quickstart-subtle" onclick={onSaveFlow}>
    <span class="ico">💾︎</span> {savedFlowMsg || 'Spara som mall'}
  </button>
</div>
