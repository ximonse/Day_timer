<script lang="ts">
  import { createVoiceService } from '$lib/voice.js';
  import { AI_AGENDA_PROMPT_MODE_HELP, AI_AGENDA_PROMPT_MODE_LABELS, AI_FLEXIBILITY_LABELS, aiPlanMetadataItems, type AiAgendaPromptMode, type AiFlexibilityLevel, type AiPlanResponse } from '$lib/ai-plan-engine.js';
  import { fade } from 'svelte/transition';

  let textareaEl: HTMLTextAreaElement | null = $state(null);

  const voice = createVoiceService();
  const promptModeOptions = Object.entries(AI_AGENDA_PROMPT_MODE_LABELS) as [AiAgendaPromptMode, string][];
  let isRecording = $state(false);
  let recordingTarget: 'parts' | 'ai' | 'voice-plan' | null = $state(null);

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
    savedFlowMsg,
    onRunAiWithText,
    whisperApiKey = '',
    aiFlexibilityLevel = 2,
    onFlexibilityChange = () => {}
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
    aiFlexibilityLevel?: AiFlexibilityLevel;
    onFlexibilityChange?: (level: AiFlexibilityLevel) => void;
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
    onRunAiWithText: (text: string) => void;
    whisperApiKey?: string;
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

  function startVoicePlan(key: string) {
    if (isRecording) {
      voice.stop();
      isRecording = false;
      recordingTarget = null;
      return;
    }
    isRecording = true;
    recordingTarget = 'voice-plan';
    voice.start({
      useWhisper: true,
      apiKey: key,
      onResult: (text) => {
        isRecording = false;
        recordingTarget = null;
        onRunAiWithText(text);
      },
      onError: (err) => {
        console.error('Voice plan error:', err);
        isRecording = false;
        recordingTarget = null;
      }
    });
  }

  const effectiveWhisperKey = $derived(whisperApiKey || (aiProvider === 'openai' ? aiApiKey : ''));

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
  <div class="plan-section-title">Planera ett pass</div>
  <div class="section-copy" style="font-size:12px;color:var(--menu-muted);" title={hasSelection ? `Ändringar sparas tillbaka till det markerade blocket. Källa: ${sourceLabel}. ${sourceHelp}` : 'Sparas som ett nytt block på den dag som är vald i kalendern.'}>
    {targetDateLabel}
  </div>

  <input type="text" placeholder="Rubrik" title="Blir blockets namn i agendan och i timern."
    value={titleValue}
    oninput={(e) => onTitleInput((e.target as HTMLInputElement).value)} />

  <div>
    <div class="field-head-actions" style="justify-content:flex-end; margin-bottom:4px;">
      {#if userLevel >= 2}
        <button class="micro-btn" class:recording={isRecording && recordingTarget === 'parts'} onclick={() => startRecording('parts')} title="Röst-till-text – klistras in i aktivitetsfältet">🎤</button>
      {/if}
      {#if userLevel >= 2 && hasAiKey && effectiveWhisperKey}
        <button class="micro-btn voice-plan-btn" class:recording={recordingTarget === 'voice-plan'}
          disabled={aiLoading && recordingTarget !== 'voice-plan'}
          onclick={() => startVoicePlan(effectiveWhisperKey)}
          title="Prata in hela passet – Whisper transkriberar och AI strukturerar aktiviteterna direkt">
          {recordingTarget === 'voice-plan' ? '⏹' : '🎙'}
        </button>
      {/if}
      <button class="micro-btn" onclick={onCopyPrompt} title="Kopiera AI-prompt">{copyBtnText}</button>
    </div>
    <textarea id="plan-activities-input" placeholder="Aktiviteter – en per rad" title="En aktivitet per rad. Tab gör underpunkt, Enter ny rad."
      bind:this={textareaEl}
      oninput={(e) => onPartsInput((e.target as HTMLTextAreaElement).value)}
      onkeydown={onPartsKeyDown}></textarea>
    <div class="feedback">{partsFeedbackText}</div>
    {#if userLevel >= 2 && hasAiKey}
      <div class="ai-panel">
        <button class="ai-panel-toggle" onclick={onToggleAiPanel}>
          {aiPanelOpen ? '▲' : '▼'} Hjälp av AI
        </button>
        {#if aiPanelOpen}
          <div class="ai-flex-slider">
            <input type="range" min="0" max="3" step="1"
              value={aiFlexibilityLevel}
              oninput={(e) => onFlexibilityChange(Number((e.target as HTMLInputElement).value) as AiFlexibilityLevel)}
              class="flex-range"
            />
            <div class="flex-labels">
              {#each [0, 1, 2, 3] as level}
                <span class="flex-label" class:active={aiFlexibilityLevel === level}>{AI_FLEXIBILITY_LABELS[level as AiFlexibilityLevel]}</span>
              {/each}
            </div>
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
          <button class="quickstart ai-generate-btn" onclick={onRunAi} disabled={aiLoading}>
            {aiLoading ? 'Tänker...' : 'Planera med AI ▶'}
          </button>
        {/if}
      </div>
    {/if}

  </div>
    <div class="write-section-body">
      <div id="plan-time-row" class="row2">
        <div>
          <input type="time" value={startTimeValue} title="Starttid"
            oninput={(e) => onStartTimeInput((e.target as HTMLInputElement).value)} />
        </div>
        <div>
          {#if endMode === 'end'}
            <input type="time" value={endTimeValue} title="Sluttid"
              oninput={(e) => onEndTimeInput((e.target as HTMLInputElement).value)} />
          {:else}
            <input type="number" min={minTotalMinutes} value={totalMinutesValue} title="Längd i minuter"
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

      <div class="feedback">{timeFeedbackText}</div>
    </div>

  <div class="plan-editor-bottom">
    <div style="display:flex; gap:6px; align-items:stretch;">
      <button id="quickStartBtn" class="quickstart" style="flex:1;" onclick={onAction} title={actionHint}><span class="ico">✓</span> {actionLabel}</button>
      <button class="quickstart" style="flex:1;" onclick={onCreateNew} title="Skapa nytt block med aktuella värden"><span class="ico">＋</span> Nytt</button>
      <button class="ai-key-btn" type="button" style="flex:0 0 auto;" onclick={onRevert} disabled={!canRevert} title={saveStatusLabel || 'Återställ ändringar'}>↺</button>
    </div>

    <button class="quickstart quickstart-subtle" style="width:100%; margin-top:4px;" onclick={onSaveFlow} title="Spara passet som återanvändbar mall i Biblioteket">
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
  .ai-flex-slider { margin-bottom: 8px; }
  .flex-range { width: 100%; accent-color: var(--accent); cursor: pointer; }
  .flex-labels { display: flex; justify-content: space-between; margin-top: 2px; }
  .flex-label { font-size: 11px; color: var(--menu-muted); transition: color 0.15s; }
  .flex-label.active { color: var(--accent); font-weight: 600; }
  .plan-section-title { font-size: 13px; font-weight: 600; color: var(--menu-fg); margin-bottom: 8px; }
</style>
