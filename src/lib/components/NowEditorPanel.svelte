<script lang="ts">
  let {
    titleValue,
    partsValue,
    partsFeedbackText,
    onTitleInput,
    onPartsInput,
    onPartsKeyDown,
    onAction,
    actionLabel,
    shareToken,
    shareUrl,
    shareModeLabel,
    shareCopyText,
    shareSummary,
    onCopyShareLink,
    onStopSharing,
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
    shareToken: string;
    shareUrl: string;
    shareModeLabel: string;
    shareCopyText: string;
    shareSummary: string;
    onCopyShareLink: () => void;
    onStopSharing: () => void;
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
      <div class="field-label">Lektionsdelar (en per rad)</div>
      <button class="info-btn" type="button" onclick={onTogglePartsHelp}>i</button>
    </div>
    {#if showPartsHelp}
      <div class="feedback">En rad per del. Tider som slutar med <code>m</code> låses, övriga delar fördelas automatiskt. Börja en rad med <code>#</code> för rubrik, <code>-</code> för underpunkt och <code>&amp;</code> för kommentar. <code>Tab</code> gör underpunkt och <code>Enter</code> ny rad.</div>
    {/if}
    <textarea placeholder="Genomgång&#10;Eget arbete&#10;Avslut"
      value={partsValue}
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
  {#if shareToken}
    <div class="share-link-box">
      <span class="share-link-text">{shareUrl}</span>
      <div class="share-link-actions">
        {#if shareModeLabel}<span class="section-chip">{shareModeLabel}</span>{/if}
        <button class="ai-key-btn" onclick={onCopyShareLink}>{shareCopyText}</button>
      </div>
    </div>
    <div class="section-copy muted">{shareSummary}</div>
    <button class="quickstart" onclick={onStopSharing}>Sluta dela</button>
  {:else}
    <button class="quickstart" onclick={onStartLiveShare}>Dela aktiv session</button>
  {/if}
  <button class="quickstart quickstart-subtle" onclick={onSaveFlow}>
    <span class="ico">💾︎</span> {savedFlowMsg || 'Spara som mall'}
  </button>
</div>
