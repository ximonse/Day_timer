<script lang="ts">
  import { createVoiceService } from '$lib/voice.js';
  import { AI_AGENDA_PROMPT_MODE_HELP, AI_AGENDA_PROMPT_MODE_LABELS, aiPlanMetadataItems, type AiAgendaPromptMode, type AiPlanResponse } from '$lib/ai-plan-engine.js';
  import { fade } from 'svelte/transition';

  let textareaEl: HTMLTextAreaElement | null = $state(null);
  let aiTextareaEl: HTMLTextAreaElement | null = $state(null);

  const voice = createVoiceService();
  const promptModeOptions = Object.entries(AI_AGENDA_PROMPT_MODE_LABELS) as [AiAgendaPromptMode, string][];
  let isRecording = $state(false);
  let recordingTarget: 'parts' | 'ai' | null = $state(null);

  $effect(() => {
    if (textareaEl && textareaEl.value !== partsValue) {
      textareaEl.value = partsValue;
    }
  });

  let {
    userLevel,
    aiProvider,
    aiApiKey,
    onApplySuggestedDuration,
    hasSelection,
    targetDateLabel,
    sourceLabel,
    sourceHelp,
    showSourceHelp,
    onToggleSourceHelp,
    titleValue,
    onTitleInput,
    showTitleHelp,
    onToggleTitleHelp,
    partsValue,
    onPartsInput,
    onPartsKeyDown,
    partsFeedbackText,
    onCopyPrompt,
    copyBtnText,
    showPartsHelp,
    onTogglePartsHelp,
    hasAiKey,
    aiPanelOpen,
    planMainOpen,
    planTimeOpen,
    planShareOpen,
    onToggleAiPanel,
    onTogglePlanMain,
    onTogglePlanTime,
    onTogglePlanShare,
    aiInput,
    onAiInputChange,
    aiPromptMode,
    aiLastResponse,
    onSetAiPromptMode,
    aiError,
    aiQuestionText,
    onRunAi,
    aiLoading,
    actualHistoryOpen,
    onToggleActualHistory,
    currentSubjectCategory,
    suggestedDuration,
    pendingActualEntries,
    onConfirmActualEntry,
    onDeleteActualEntry,
    onExportActualHistory,
    startTimeValue,
    onStartTimeInput,
    endTimeValue,
    onEndTimeInput,
    totalMinutesValue,
    onTotalMinutesInput,
    minTotalMinutes,
    endMode,
    onEndModeChange,
    onToggleTimeHelp,
    showTimeHelp,
    timeFeedbackText,
    onAction,
    onCreateNew,
    actionLabel,
    actionHint,
    saveStatusLabel,
    onRevert,
    canRevert,
    sessionShareUrl,
    dayShareUrl,
    sessionShareDisabled,
    shareCopyText,
    isCopyingSession,
    isCopyingDay,
    onCopySessionShare,
    onCopyDayShare,
    onStopSessionShare,
    onStopDayShare,
    onStartSessionShare,
    onStartDayShare,
    onSaveFlow,
    savedFlowMsg
  }: {
    userLevel: number;
    aiProvider: string;
    aiApiKey: string;
    onApplySuggestedDuration: (mins: number) => void;
    hasSelection: boolean;
    targetDateLabel: string;
    sourceLabel: string;
    sourceHelp: string;
    showSourceHelp: boolean;
    onToggleSourceHelp: () => void;
    titleValue: string;
    onTitleInput: (value: string) => void;
    showTitleHelp: boolean;
    onToggleTitleHelp: () => void;
    partsValue: string;
    onPartsInput: (value: string) => void;
    onPartsKeyDown: (e: KeyboardEvent) => void;
    partsFeedbackText: string;
    onCopyPrompt: () => void;
    copyBtnText: string;
    showPartsHelp: boolean;
    onTogglePartsHelp: () => void;
    hasAiKey: boolean;
    aiPanelOpen: boolean;
    planMainOpen: boolean;
    planTimeOpen: boolean;
    planShareOpen: boolean;
    onToggleAiPanel: () => void;
    onTogglePlanMain: () => void;
    onTogglePlanTime: () => void;
    onTogglePlanShare: () => void;
    aiInput: string;
    onAiInputChange: (value: string) => void;
    aiPromptMode: AiAgendaPromptMode;
    aiLastResponse: AiPlanResponse | null;
    onSetAiPromptMode: (mode: AiAgendaPromptMode) => void;
    aiError: string;
    aiQuestionText: string;
    onRunAi: () => void;
    aiLoading: boolean;
    actualHistoryOpen: boolean;
    onToggleActualHistory: () => void;
    currentSubjectCategory: string;
    suggestedDuration: { minutes: number; sampleSize: number } | null;
    pendingActualEntries: any[];
    onConfirmActualEntry: (id: string) => void;
    onDeleteActualEntry: (id: string) => void;
    onExportActualHistory: () => void;
    startTimeValue: string;
    onStartTimeInput: (value: string) => void;
    endTimeValue: string;
    onEndTimeInput: (value: string) => void;
    totalMinutesValue: number;
    onTotalMinutesInput: (value: number) => void;
    minTotalMinutes: number;
    endMode: 'end' | 'len';
    onEndModeChange: (mode: 'end' | 'len') => void;
    onToggleTimeHelp: () => void;
    showTimeHelp: boolean;
    timeFeedbackText: string;
    onAction: () => void;
    onCreateNew: () => void;
    actionLabel: string;
    actionHint: string;
    saveStatusLabel: string;
    onRevert: () => void;
    canRevert: boolean;
    sessionShareUrl: string;
    dayShareUrl: string;
    sessionShareDisabled: boolean;
    shareCopyText: string;
    isCopyingSession: boolean;
    isCopyingDay: boolean;
    onCopySessionShare: () => void;
    onCopyDayShare: () => void;
    onStopSessionShare: () => void;
    onStopDayShare: () => void;
    onStartSessionShare: () => void;
    onStartDayShare: () => void;
    onSaveFlow: () => void;
    savedFlowMsg: string;
  } = $props();

  function startRecording(target: 'parts' | 'ai') {
    if (isRecording) {
      voice.stop();
      isRecording = false;
      recordingTarget = null;
      return;
    }

    isRecording = true;
    recordingTarget = target;
    voice.start({
      useWhisper: aiProvider === 'openai' && hasAiKey,
      apiKey: aiApiKey,
      onResult: (text) => {
        if (target === 'parts') onPartsInput(partsValue ? partsValue + '\n' + text : text);
        else onAiInputChange(aiInput ? aiInput + ' ' + text : text);
        isRecording = false;
        recordingTarget = null;
      },
      onError: (err) => {
        console.error('Voice error:', err);
        isRecording = false;
        recordingTarget = null;
      }
    });
  }

  const showRecSuggestion = $derived(
    userLevel >= 2 && 
    suggestedDuration && 
    Math.abs(suggestedDuration.minutes - totalMinutesValue) >= 2
  );
  const aiInputPlaceholder = $derived(
    aiPromptMode === 'calendar'
      ? 'Klistra in kalendertext som ska bli aktivitetsrader för passet...'
      : aiPromptMode === 'strict-format'
      ? 'Klistra in texten som ska formatteras utan att AI:n lägger till något...'
      : aiPromptMode === 'helpful-questions'
      ? 'Beskriv passet. AI:n ställer frågor först om något viktigt saknas...'
      : 'Beskriv vad som ska rymmas i passet...'
  );

</script>

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

  <button class="write-section-toggle" type="button" style="border-top:0; padding-top:2px;" onclick={onTogglePlanMain}>
    <span>Rubrik, innehåll & tid</span>
    <span>{planMainOpen ? '▲' : '▼'}</span>
  </button>
  {#if planMainOpen}
  <div class="write-section-body">
    <div class="field-head">
      <div class="field-label">Rubrik</div>
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
      <div class="field-label">Aktiviteter</div>
      <div class="field-head-actions">
        {#if userLevel >= 2}
          <button class="micro-btn" class:recording={isRecording && recordingTarget === 'parts'} onclick={() => startRecording('parts')} title="Röst-till-Plan">
            🎤
          </button>
        {/if}
        <button class="micro-btn" onclick={onCopyPrompt}>{copyBtnText}</button>
        <button class="info-btn" type="button" onclick={onTogglePartsHelp}>i</button>
      </div>
    </div>
    {#if showPartsHelp}
      <div class="feedback">Skriv eller klistra in aktiviteter här. En per rad. <code>Tab</code> gör underpunkt och <code>Enter</code> ny rad.</div>
    {/if}
    <textarea id="plan-activities-input" placeholder="Genomgång&#10;Eget arbete&#10;Avslut"
      bind:this={textareaEl}
      oninput={(e) => onPartsInput((e.target as HTMLTextAreaElement).value)}
      onkeydown={onPartsKeyDown}></textarea>
    <div class="feedback">{partsFeedbackText}</div>
    {#if userLevel >= 2 && hasAiKey}
      <div class="ai-panel">
        <button class="ai-panel-toggle" onclick={onToggleAiPanel}>
          {aiPanelOpen ? '▲' : '▼'} Planera med AI <span class="beta-tag">BETA</span>
        </button>
        {#if aiPanelOpen}
          <div class="feedback" style="margin-bottom:8px; opacity:0.8;">
            Används på egen risk. Din API-nyckel används enbart för att skicka instruktioner direkt till AI-leverantör.
          </div>
          <div style="position:relative;">
            <textarea class="ai-input" placeholder={aiInputPlaceholder}
              bind:this={aiTextareaEl}
              value={aiInput}
              oninput={(e) => onAiInputChange((e.target as HTMLTextAreaElement).value)}></textarea>
            <button class="mic-overlay-btn" class:recording={isRecording && recordingTarget === 'ai'} onclick={() => startRecording('ai')} title="Prata in instruktion">
              🎤
            </button>
          </div>
          <div class="ai-mode-row">
            {#each promptModeOptions as [mode, label]}
              <button class="ai-mode-btn" class:on={aiPromptMode === mode} onclick={() => onSetAiPromptMode(mode)} title={AI_AGENDA_PROMPT_MODE_HELP[mode]}>{label}</button>
            {/each}
          </div>
          {#if aiError}<div class="ai-error">{aiError}</div>{/if}
          {#if aiQuestionText}
            <div class="feedback" style="margin-bottom:8px; white-space:pre-line;">
              {aiQuestionText}
            </div>
          {/if}
          {#if aiLastResponse && aiPlanMetadataItems(aiLastResponse).length}
            <div class="ai-meta-list">
              {#each aiPlanMetadataItems(aiLastResponse) as item}
                <span class={`ai-meta-chip ai-meta-chip--${item.kind}`}>{item.text}</span>
              {/each}
            </div>
          {/if}
          <button class="quickstart ai-generate-btn" onclick={onRunAi} disabled={aiLoading || !aiInput.trim()}>
            {aiLoading ? 'Tänker...' : 'Generera ▶'}
          </button>
        {/if}
      </div>
    {/if}

    {#if userLevel >= 2}
      <div class="ai-panel" style="margin-top:10px;">
        <button class="ai-panel-toggle" onclick={onToggleActualHistory}>
          {actualHistoryOpen ? '▲' : '▼'} Faktisk tid & lärande <span class="beta-tag">BETA</span>
        </button>
        {#if actualHistoryOpen}
          <div class="feedback" style="margin-bottom:8px; opacity:0.8;">
            Funktion under utveckling. Sparar din faktiska tidsåtgång för att ge bättre förslag framöver.
          </div>
          <div class="agenda-section-note" style="background:transparent; padding:0; border:0; margin-top:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
              <strong>Historik</strong>
              <button class="agenda-save-btn" style="margin:0;flex:0;" onclick={onExportActualHistory}>Exportera (JSONL)</button>
            </div>
            <div class="feedback" style="margin-top:8px;">
              Kategori: <strong>{currentSubjectCategory}</strong>
              {#if suggestedDuration}
                · Föreslagen tid: <strong>{suggestedDuration.minutes} min</strong> ({suggestedDuration.sampleSize} träffar)
              {:else}
                · Ingen historik ännu för rekommendation
              {/if}
            </div>
            {#if pendingActualEntries.length > 0}
              <div class="feedback" style="margin-top:8px;">Obekräftade pass idag (autosparas vid nytt dygn):</div>
              {#each pendingActualEntries as entry, pi (`${entry.id}-${pi}`)}
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px;">
                  <span>{startTimeValue} {titleValue} · {entry.durationActualMin} min</span>
                  <div style="display:flex;gap:6px;align-items:center;">
                    <button class="agenda-save-btn" style="margin:0;flex:0;" onclick={() => onConfirmActualEntry(entry.id)}>Bekräfta</button>
                    <button class="agenda-save-btn" style="margin:0;flex:0;" onclick={() => onDeleteActualEntry(entry.id)}>Ta bort</button>
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  </div>
    <div class="write-section-body">
      <div id="plan-time-row" class="row2">
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
          {#if endMode === 'end'}
            <input type="time" value={endTimeValue}
              oninput={(e) => onEndTimeInput((e.target as HTMLInputElement).value)} />
          {:else}
            <input type="number" min={minTotalMinutes} value={totalMinutesValue}
              oninput={(e) => onTotalMinutesInput(Number((e.target as HTMLInputElement).value))} />
          {/if}
        </div>
      </div>
      <div class="mode-toggle">
        <button class:on={endMode === 'end'} onclick={() => onEndModeChange('end')}>Sluttid</button>
        <button class:on={endMode === 'len'} onclick={() => onEndModeChange('len')}>Längd</button>
      </div>

      {#if showRecSuggestion}
        <div class="rec-suggestion" transition:fade>
          <span class="ico">✨</span> Tidigare har {titleValue || 'detta'} tagit <strong>{suggestedDuration?.minutes} min</strong>.
          <button class="rec-apply-btn" onclick={() => onApplySuggestedDuration(suggestedDuration!.minutes)}>Använd</button>
        </div>
      {/if}

      {#if showTimeHelp}
        <div class="feedback">Tiden sparas på vald dag. Välj en annan dag i kalendern först om blocket ska hamna där.</div>
      {/if}
      <div class="feedback">{timeFeedbackText}</div>
    </div>
  {/if}

  <div class="plan-editor-bottom">
    <div style="display:flex; gap:6px;">
      <button id="quickStartBtn" class="quickstart" style="flex:1;" onclick={onAction}><span class="ico">✓</span> {actionLabel}</button>
      <button class="quickstart" style="flex:1;" onclick={onCreateNew} title="Skapa nytt block med aktuella värden"><span class="ico">＋</span> Nytt</button>
    </div>
    <div class="feedback">{actionHint}</div>
    <div class="feedback" style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
      <span>{saveStatusLabel}</span>
      <button class="ai-key-btn" type="button" onclick={onRevert} disabled={!canRevert}>Återställ</button>
    </div>

    <button class="quickstart quickstart-subtle" style="width:100%; margin-top:4px;" onclick={onSaveFlow}>
      <span class="ico">💾︎</span> {savedFlowMsg || 'Spara som mall'}
    </button>

    <button class="write-section-toggle" type="button" onclick={onTogglePlanShare}>
      <span>Delning</span>
      <span>{planShareOpen ? '▲' : '▼'}</span>
    </button>
    {#if planShareOpen}
      <div class="write-section-body">
        <div class="share-section">
          <div class="field-label">Dela vald session</div>
          {#if sessionShareUrl}
            <div class="share-link-box">
              <span class="share-link-text">{sessionShareUrl}</span>
              <div class="share-link-actions">
                <span class="section-chip">Pass</span>
                <button class="ai-key-btn" onclick={onCopySessionShare}>{isCopyingSession ? shareCopyText : 'Kopiera länk'}</button>
              </div>
            </div>
            <button class="quickstart" onclick={onStopSessionShare}>Sluta dela passet</button>
          {:else}
            <button id="plan-share-session-btn" class="quickstart" onclick={onStartSessionShare} disabled={sessionShareDisabled} style="width:100%;">Dela vald session</button>
          {/if}
        </div>

        <div class="share-section" style="margin-top:8px;">
          <div class="field-label">Dela hela dagen</div>
          {#if dayShareUrl}
            <div class="share-link-box">
              <span class="share-link-text">{dayShareUrl}</span>
              <div class="share-link-actions">
                <span class="section-chip">Dag</span>
                <button class="ai-key-btn" onclick={onCopyDayShare}>{isCopyingDay ? shareCopyText : 'Kopiera länk'}</button>
              </div>
            </div>
            <button class="quickstart" onclick={onStopDayShare}>Sluta dela dagen</button>
          {:else}
            <button id="plan-share-day-btn" class="quickstart" onclick={onStartDayShare} style="width:100%;">Dela hela dagen</button>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>

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
  .mic-overlay-btn {
    position: absolute;
    right: 10px;
    bottom: 10px;
    background: var(--menu-pill);
    border: 1px solid var(--menu-border);
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
    z-index: 10;
  }
  .mic-overlay-btn:hover { background: var(--menu-surface); }
  .mic-overlay-btn.recording {
    background: #ff4444;
    color: white;
    border-color: #ff4444;
    animation: pulse 1.5s infinite;
  }
  .rec-suggestion {
    background: color-mix(in srgb, var(--accent) 8%, var(--menu-surface));
    border: 1px solid color-mix(in srgb, var(--accent) 20%, var(--menu-border));
    border-radius: 10px;
    padding: 8px 12px;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
  }
  .rec-apply-btn {
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 6px;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    margin-left: auto;
  }
</style>
