<script lang="ts">
  import { createVoiceService } from '$lib/voice.js';

  let textareaEl = $state<HTMLTextAreaElement | null>(null);

  const voice = createVoiceService();
  let isRecording = $state(false);

  $effect(() => {
    if (textareaEl && textareaEl.value !== partsValue) {
      textareaEl.value = partsValue;
    }
  });

  let {
    userLevel,
    aiProvider,
    aiApiKey,
    hasAiKey,
    titleValue,
    partsValue,
    partsFeedbackText,
    nowMainOpen,
    nowQuickStartOpen,
    nowShareOpen,
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
    quickStartTitle,
    quickStartText,
    onQuickStartTitleInput,
    onQuickStartTextInput,
    onQuickStart,
    onToggleNowMain,
    onToggleNowQuickStart,
    onToggleNowShare,
    onToggleTitleHelp,
    onTogglePartsHelp
  }: {
    userLevel: number;
    aiProvider: string;
    aiApiKey: string;
    hasAiKey: boolean;
    titleValue: string;
    partsValue: string;
    partsFeedbackText: string;
    nowMainOpen: boolean;
    nowQuickStartOpen: boolean;
    nowShareOpen: boolean;
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
    quickStartTitle: string;
    quickStartText: string;
    onQuickStartTitleInput: (value: string) => void;
    onQuickStartTextInput: (value: string) => void;
    onQuickStart: () => void;
    onToggleNowMain: () => void;
    onToggleNowQuickStart: () => void;
    onToggleNowShare: () => void;
    onToggleTitleHelp: () => void;
    onTogglePartsHelp: () => void;
  } = $props();

  const quickStartOnly = $derived(titleValue === 'Inget pass just nu' && !partsValue.trim());

  function startRecording() {
    if (isRecording) {
      voice.stop();
      isRecording = false;
      return;
    }

    isRecording = true;
    voice.start({
      useWhisper: aiProvider === 'openai' && hasAiKey,
      apiKey: aiApiKey,
      onResult: (text) => {
        onPartsInput(partsValue ? partsValue + '\n' + text : text);
        isRecording = false;
      },
      onError: (err) => {
        console.error('Voice error:', err);
        isRecording = false;
      }
    });
  }
</script>

{#if quickStartOnly}
  <button class="write-section-toggle" type="button" onclick={onToggleNowQuickStart}>
    <span>Snabbstart</span>
    <span>{nowQuickStartOpen ? '−' : '+'}</span>
  </button>
  {#if nowQuickStartOpen}
    <div class="quick-now-panel">
      <div>
        <div class="quick-now-title">Starta något nu</div>
        <div class="quick-now-copy">Skriv en snabb session och kör direkt.</div>
      </div>
      <input type="text" placeholder="Rubrik, t.ex. Röja köket"
        value={quickStartTitle}
        oninput={(e) => onQuickStartTitleInput((e.target as HTMLInputElement).value)} />
      <textarea class="quick-now-text" placeholder="Aktivitet 15m&#10;- valfri underpunkt"
        value={quickStartText}
        oninput={(e) => onQuickStartTextInput((e.target as HTMLTextAreaElement).value)}></textarea>
      <button class="quickstart" style="width:100%" onclick={onQuickStart}>Starta nu</button>
    </div>
  {/if}
{:else}
  <button class="write-section-toggle" type="button" onclick={onToggleNowMain}>
    <span>Rubrik & innehåll</span>
    <span>{nowMainOpen ? '−' : '+'}</span>
  </button>
  {#if nowMainOpen}
    <div class="write-section-body">
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
            <div class="field-head-actions">
              {#if userLevel >= 2}
                <button class="micro-btn" class:recording={isRecording} onclick={startRecording} title="Röst-till-Plan">
                  ⏺
                </button>
              {/if}
              <button class="info-btn" type="button" onclick={onTogglePartsHelp}>i</button>
            </div>
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
    </div>
  {/if}

  <button class="write-section-toggle" type="button" onclick={onToggleNowShare}>
    <span>Delning</span>
    <span>{nowShareOpen ? '−' : '+'}</span>
  </button>
  {#if nowShareOpen}
    <div class="write-section-body">
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
    </div>
  {/if}
{/if}

<style>
  .micro-btn.recording {
    background: #ff4444 !important;
    color: white !important;
    box-shadow: 0 0 8px rgba(255, 68, 68, 0.4);
    animation: pulse 1.5s infinite;
  }
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.7; }
    100% { opacity: 1; }
  }
  .quick-now-panel {
    display:flex;
    flex-direction:column;
    gap:10px;
    padding:12px;
    border:1px solid var(--line);
    border-radius:8px;
    margin-bottom:12px;
    background: color-mix(in srgb, var(--paper) 82%, var(--pill) 18%);
  }
  .quick-now-title { font-weight:800; color:var(--text); }
  .quick-now-copy { color:var(--muted); font-size:13px; line-height:1.35; }
  .quick-now-text { min-height:76px; }
</style>
