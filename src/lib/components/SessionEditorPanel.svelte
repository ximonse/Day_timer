<script lang="ts">
  let {
    mode,
    hasSelection,
    savedFlowMsg,
    titleValue,
    partsValue,
    extraInfoValue,
    copyBtnText,
    partsFeedbackText,
    timeFeedbackText,
    hasAiKey,
    aiPanelOpen,
    aiInput,
    aiError,
    aiLoading,
    aiPlanMode,
    startTimeValue,
    endMode,
    actionLabel,
    actionHint,
    saveStatusLabel,
    canRevert,
    showHelpHints,
    showTitleHelp,
    showPartsHelp,
    showTimeHelp,
    targetDateLabel,
    sourceLabel,
    sourceHelp,
    showSourceHelp,
    shareToken,
    shareMode,
    shareCopyText,
    shareUrl,
    onTitleInput,
    onPartsInput,
    onCopyPrompt,
    onToggleAiPanel,
    onAiInputChange,
    onSetStrictMode,
    onSetHelpfulMode,
    onRunAi,
    onAction,
    onExtraInfoInput,
    onStartTimeInput,
    onEndModeChange,
    onEndControlMount,
    onRevert,
    onToggleTitleHelp,
    onTogglePartsHelp,
    onToggleTimeHelp,
    onToggleSourceHelp,
    onCopyShareLink,
    onStopSharing,
    onStartLiveShare,
    onSaveFlow,
    onStartSessionShare,
    onStartDayShare
  }: {
    mode: 'now' | 'plan';
    hasSelection: boolean;
    savedFlowMsg: string;
    titleValue: string;
    partsValue: string;
    extraInfoValue: string;
    copyBtnText: string;
    partsFeedbackText: string;
    timeFeedbackText: string;
    hasAiKey: boolean;
    aiPanelOpen: boolean;
    aiInput: string;
    aiError: string;
    aiLoading: boolean;
    aiPlanMode: 'strict' | 'helpful';
    startTimeValue: string;
    endMode: 'end' | 'len';
    actionLabel: string;
    actionHint: string;
    saveStatusLabel: string;
    canRevert: boolean;
    showHelpHints: boolean;
    showTitleHelp: boolean;
    showPartsHelp: boolean;
    showTimeHelp: boolean;
    targetDateLabel: string;
    sourceLabel: string;
    sourceHelp: string;
    showSourceHelp: boolean;
    shareToken: string;
    shareMode: 'active-session-live' | 'selected-session-snapshot' | 'selected-day-snapshot' | null;
    shareCopyText: string;
    shareUrl: string;
    onTitleInput: (value: string) => void;
    onPartsInput: (value: string) => void;
    onCopyPrompt: () => void;
    onToggleAiPanel: () => void;
    onAiInputChange: (value: string) => void;
    onSetStrictMode: () => void;
    onSetHelpfulMode: () => void;
    onRunAi: () => void;
    onAction: () => void;
    onExtraInfoInput: (value: string) => void;
    onStartTimeInput: (value: string) => void;
    onEndModeChange: (mode: 'end' | 'len') => void;
    onEndControlMount: (node: HTMLElement | null) => void;
    onRevert: () => void;
    onToggleTitleHelp: () => void;
    onTogglePartsHelp: () => void;
    onToggleTimeHelp: () => void;
    onToggleSourceHelp: () => void;
    onCopyShareLink: () => void;
    onStopSharing: () => void;
    onStartLiveShare: () => void;
    onSaveFlow: () => void;
    onStartSessionShare: () => void;
    onStartDayShare: () => void;
  } = $props();

  let endControlHost = $state<HTMLElement | null>(null);

  $effect(() => {
    onEndControlMount(endControlHost);
  });

  const shareSummary = $derived.by(() => {
    if (shareMode === 'active-session-live') return 'Aktiv session delas live.';
    if (shareMode === 'selected-day-snapshot') return 'Vald dag delas som snapshot.';
    if (shareMode === 'selected-session-snapshot') return 'Vald session delas som snapshot.';
    return '';
  });

  const shareModeLabel = $derived.by(() => {
    if (shareMode === 'active-session-live') return 'Live';
    if (shareMode === 'selected-day-snapshot') return 'Dag';
    if (shareMode === 'selected-session-snapshot') return 'Pass';
    return '';
  });
</script>

{#if mode === 'now'}
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
        <div class="feedback">En rad per del. Tider som slutar med <code>m</code> låses, övriga delar fördelas automatiskt. Börja en rad med <code>-</code> för underpunkt och <code>&amp;</code> för kommentar.</div>
      {/if}
      <textarea placeholder="Genomgång&#10;Eget arbete&#10;Avslut"
        value={partsValue}
        oninput={(e) => onPartsInput((e.target as HTMLTextAreaElement).value)}></textarea>
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
{:else}
  <div class="plan-editor">
    <div class="section-copy field-head" style="justify-content:space-between;">
      <span><strong>Vald dag:</strong> {targetDateLabel}</span>
      <button class="info-btn" type="button" onclick={onToggleSourceHelp}>i</button>
    </div>
    {#if showSourceHelp}
      <div class="feedback">
        {hasSelection
          ? `Ändringar sparas tillbaka till det markerade blocket. Källa: ${sourceLabel}. ${sourceHelp}`
          : 'När inget block är valt sparar Planera ett nytt block på den dag som är markerad i kalendern.'}
      </div>
    {/if}

    <div>
      <div class="field-head">
        <div class="field-label">Blockrubrik</div>
        <button class="info-btn" type="button" onclick={onToggleTitleHelp}>i</button>
      </div>
      {#if showTitleHelp}
        <div class="feedback">Rubriken blir blockets namn i agendan och i timern.</div>
      {/if}
      <input type="text" placeholder="Matematik"
        value={titleValue}
        oninput={(e) => onTitleInput((e.target as HTMLInputElement).value)} />
    </div>

    <div>
      <div class="field-head field-head--wrap">
        <div class="field-label">Blockinnehåll</div>
        <div class="field-head-actions">
          <button class="micro-btn" onclick={onCopyPrompt}>{copyBtnText}</button>
          <button class="info-btn" type="button" onclick={onTogglePartsHelp}>i</button>
        </div>
      </div>
      {#if showPartsHelp}
        <div class="feedback">Skriv eller klistra in hela blocket här om du vill planera med text i stället för att dra i tidslinjen.</div>
      {/if}
      <textarea placeholder="Genomgång&#10;Eget arbete&#10;Avslut"
        value={partsValue}
        oninput={(e) => onPartsInput((e.target as HTMLTextAreaElement).value)}></textarea>
      <div class="feedback">{partsFeedbackText}</div>
      {#if hasAiKey}
        <div class="ai-panel">
          <button class="ai-panel-toggle" onclick={onToggleAiPanel}>
            {aiPanelOpen ? '▲' : '▼'} Planera med AI
          </button>
          {#if aiPanelOpen}
            <textarea class="ai-input" placeholder="Beskriv vad du vill planera..."
              value={aiInput}
              oninput={(e) => onAiInputChange((e.target as HTMLTextAreaElement).value)}></textarea>
            <div class="ai-mode-row">
              <button class="ai-mode-btn" class:on={aiPlanMode === 'strict'} onclick={onSetStrictMode}>Strikt</button>
              <button class="ai-mode-btn" class:on={aiPlanMode === 'helpful'} onclick={onSetHelpfulMode}>Hjälpsam</button>
              <span class="ai-mode-hint">
                {aiPlanMode === 'strict' ? 'Bara det du skriver, inga tillägg' : 'Lägger till marginaler, ställtid och pauser'}
              </span>
            </div>
            {#if aiError}<div class="ai-error">{aiError}</div>{/if}
            <button class="quickstart ai-generate-btn" onclick={onRunAi} disabled={aiLoading || !aiInput.trim()}>
              {aiLoading ? 'Tänker...' : 'Generera ▶'}
            </button>
          {/if}
        </div>
      {/if}
    </div>

    <div>
      <div class="field-label">Kommentar för blocket</div>
      <textarea placeholder="T.ex. material, plats eller påminnelse"
        value={extraInfoValue}
        oninput={(e) => onExtraInfoInput((e.target as HTMLTextAreaElement).value)}></textarea>
    </div>

    <div class="row2">
      <div>
        <div class="field-head">
          <div class="field-label">Starttid</div>
          <button class="info-btn" type="button" onclick={onToggleTimeHelp}>i</button>
        </div>
        <input type="time" value={startTimeValue}
          oninput={(e) => onStartTimeInput((e.target as HTMLInputElement).value)} />
      </div>
      <div>
        <div class="field-label">{endMode === 'end' ? 'Sluttid' : 'Längd (min)'}</div>
        <div bind:this={endControlHost}></div>
      </div>
    </div>
    <div class="mode-toggle">
      <button class:on={endMode === 'end'} onclick={() => onEndModeChange('end')}>Sluttid</button>
      <button class:on={endMode === 'len'} onclick={() => onEndModeChange('len')}>Längd</button>
    </div>
    {#if showTimeHelp}
      <div class="feedback">Tiden sparas på vald dag. Välj en annan dag i kalendern först om blocket ska hamna där.</div>
    {/if}
    <div class="feedback">{timeFeedbackText}</div>

    <div class="plan-editor-bottom">
      <button id="quickStartBtn" class="quickstart" style="width:100%" onclick={onAction}><span class="ico">✓</span> {actionLabel}</button>
      <div class="feedback">{actionHint}</div>
      <div class="feedback" style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <span>{saveStatusLabel}</span>
        <button class="ai-key-btn" type="button" onclick={onRevert} disabled={!canRevert}>Återställ</button>
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
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="quickstart" onclick={onStartSessionShare} disabled={!hasSelection}>Dela vald session</button>
            <button class="quickstart" onclick={onStartDayShare}>Dela hela dagen</button>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
