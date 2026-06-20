<script lang="ts">
  import { AI_AGENDA_PROMPT_MODE_HELP, AI_AGENDA_PROMPT_MODE_LABELS, AI_FLEXIBILITY_LABELS, aiPlanMetadataItems, type AiAgendaPromptMode, type AiFlexibilityLevel, type AiPlanResponse } from '$lib/ai-plan-engine.js';
  import MicIcon from './MicIcon.svelte';

  const promptModeOptions = Object.entries(AI_AGENDA_PROMPT_MODE_LABELS) as [AiAgendaPromptMode, string][];

  let {
    agendaInputOpen,
    agendaDraft,
    agendaDraftSource,
    draftStatus,
    selectedDateLabel,
    savedAgendaMsg,
    hasAiKey,
    agendaAiOpen,
    agendaAiInput,
    agendaAiPromptMode,
    aiLastResponse,
    agendaAiError,
    agendaAiQuestionText,
    agendaAiLoading,
    showImportHelp,
    aiFlexibilityLevel = 2,
    isRecordingAgendaAi = false,
    onToggleOpen,
    onDraftChange,
    onSave,
    onCopyPrompt,
    onToggleAi,
    onAgendaAiInputChange,
    onRunAi,
    onToggleImportHelp,
    onFlexibilityChange = () => {},
    onToggleAgendaVoice = () => {},
    onUnifiedUpload = () => {}
  }: {
    agendaInputOpen: boolean;
    agendaDraft: string;
    agendaDraftSource: 'manual' | 'ai';
    draftStatus: string;
    selectedDateLabel: string;
    savedAgendaMsg: string;
    hasAiKey: boolean;
    agendaAiOpen: boolean;
    agendaAiInput: string;
    agendaAiPromptMode: AiAgendaPromptMode;
    aiLastResponse: AiPlanResponse | null;
    agendaAiError: string;
    agendaAiQuestionText: string;
    agendaAiLoading: boolean;
    showImportHelp: boolean;
    aiFlexibilityLevel?: AiFlexibilityLevel;
    isRecordingAgendaAi?: boolean;
    onToggleOpen: () => void;
    onDraftChange: (value: string) => void;
    onSave: () => void;
    onCopyPrompt: (type: AiAgendaPromptMode) => Promise<void>;
    onToggleAi: () => void;
    onAgendaAiInputChange: (value: string) => void;
    onRunAi: () => void;
    onToggleImportHelp: () => void;
    onFlexibilityChange?: (level: AiFlexibilityLevel) => void;
    onToggleAgendaVoice?: () => void;
    onUnifiedUpload?: (file: File) => void;
  } = $props();

  let promptHelpOpen = $state(false);
  let promptMenuOpen = $state(false);
  let agendaTextarea: HTMLTextAreaElement | null = $state(null);
  let fileInputEl: HTMLInputElement | null = $state(null);

  let copyStatuses = $state<Record<AiAgendaPromptMode, string>>({
    notes: AI_AGENDA_PROMPT_MODE_LABELS.notes,
    calendar: AI_AGENDA_PROMPT_MODE_LABELS.calendar,
    'strict-format': AI_AGENDA_PROMPT_MODE_LABELS['strict-format'],
    'helpful-questions': AI_AGENDA_PROMPT_MODE_LABELS['helpful-questions']
  });

  const agendaAiPlaceholder = $derived(
    agendaAiPromptMode === 'calendar'
      ? 'Klistra in kalendertext eller beskriv kalenderhändelser som ska konverteras...'
      : agendaAiPromptMode === 'strict-format'
      ? 'Klistra in texten som ska formatteras, utan att AI:n lägger till något...'
      : agendaAiPromptMode === 'helpful-questions'
      ? 'Beskriv dagen. AI:n ställer frågor först om något viktigt saknas...'
      : 'Beskriv dagen fritt — eller ladda upp ett schema, en ICS-fil, .txt eller .md...'
  );

  $effect(() => {
    if (!agendaTextarea) return;
    const isAiResult = agendaDraftSource === 'ai';
    if (!isAiResult && document.activeElement === agendaTextarea) return;
    if (agendaTextarea.value !== agendaDraft) agendaTextarea.value = agendaDraft;
    if (isAiResult) agendaTextarea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  async function handleCopy(type: AiAgendaPromptMode) {
    await onCopyPrompt(type);
    copyStatuses = { ...copyStatuses, [type]: '✓ Kopierad' };
    setTimeout(() => {
      copyStatuses = { ...copyStatuses, [type]: AI_AGENDA_PROMPT_MODE_LABELS[type] };
    }, 1500);
  }

  function handleFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) onUnifiedUpload(file);
    if (fileInputEl) fileInputEl.value = '';
  }
</script>

<div class="agenda-planner-card">
  <div class="agenda-input-header">
    <span class="agenda-input-label">Planera dag / vecka</span>
    <button class="info-btn" onclick={onToggleImportHelp}>i</button>
    <button class="agenda-input-toggle" onclick={onToggleOpen}>
      {agendaInputOpen ? '−' : '+'}
    </button>
  </div>
  <div class="planner-card-copy">Skriv hela dagen som text, importera schema eller låt AI skapa ett dagförslag. Spara först när dagplanen ser rätt ut.</div>
  {#if showImportHelp}
    <div class="feedback" style="margin-bottom:8px;">
      Redigera dagplanen direkt här, klistra in ny text, ladda upp ett schema, ICS-fil eller textfil, eller AI-generera. Inget ändras förrän du sparar.
    </div>
  {/if}
  {#if agendaInputOpen}
    <div id="agenda-text-and-prompts">
    <div class="section-chip-row" style="margin-bottom:8px;">
      <span class="section-chip on">{selectedDateLabel}</span>
      <span class="section-chip">{draftStatus}</span>
    </div>
    <div class="agenda-input-wrapper">
      <textarea
        class="agenda-input"
        bind:this={agendaTextarea}
        placeholder="Skriv eller klistra in dagplanen här.&#10;&#10;@260508&#10;#Morgonrutin 08:00-08:45&#10;Vakna 5m&#10;Frukost 20m&#10;&amp; ät på trappen&#10;Promenad&#10;- ta med vatten&#10;&amp;&amp; Möte kl 9"
        oninput={(e) => onDraftChange((e.target as HTMLTextAreaElement).value)}
      ></textarea>
    </div>
    <div class="agenda-save-row">
      <button class="agenda-save-btn" onclick={onSave}
        title="Sparar dagtexten och synkar till molnet om du är inloggad.">
        {savedAgendaMsg || (agendaDraftSource === 'ai' ? '✓ Godkänn AI-förslag' : 'Spara i dagplan')}
      </button>
    </div>

    {#if hasAiKey}
      <div class="agenda-input-header" style="margin-top:12px;">
        <span class="agenda-input-label">Skapa med AI</span>
        <button class="agenda-input-toggle" onclick={onToggleAi}>{agendaAiOpen ? '−' : '+'}</button>
      </div>
    {/if}

    {#if agendaAiOpen && hasAiKey}
      <div class="agenda-ai-panel">
        {#if agendaDraftSource === 'ai'}
          <div class="feedback" style="margin-bottom:8px;">
            AI-förslaget ligger i dagtexten ovan. Läs, ändra vid behov och godkänn först när det ser rätt ut.
          </div>
        {/if}

        {#if agendaAiError}<div class="ai-error">{agendaAiError}</div>{/if}
        {#if agendaAiQuestionText}
          <div class="feedback ai-question" style="white-space:pre-line;">
            {agendaAiQuestionText}
          </div>
        {/if}
        <div class="ai-input-row">
          <div class="agenda-input-wrapper" style="flex:1;">
            <textarea class="ai-input" placeholder={agendaAiQuestionText ? 'Svara kort på frågorna ovan...' : agendaAiPlaceholder}
              value={agendaAiInput}
              oninput={(e) => onAgendaAiInputChange((e.target as HTMLTextAreaElement).value)}></textarea>
          </div>
          <div class="ai-input-actions">
            <button
              class="micro-btn"
              class:recording={isRecordingAgendaAi}
              onclick={onToggleAgendaVoice}
              title="Diktera instruktion"
            ><MicIcon /></button>
            <button
              class="micro-btn"
              onclick={() => fileInputEl?.click()}
              title="Ladda upp schema, ICS, bild eller textfil"
            >↑</button>
            <input
              bind:this={fileInputEl}
              type="file"
              accept="image/*,application/pdf,.ics,.txt,.md,text/calendar,text/plain,text/markdown"
              style="display:none"
              onchange={handleFileChange}
            />
          </div>
        </div>

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

        {#if aiLastResponse && aiPlanMetadataItems(aiLastResponse).length}
          <div class="ai-meta-list">
            {#each aiPlanMetadataItems(aiLastResponse) as item}
              <span class={`ai-meta-chip ai-meta-chip--${item.kind}`}>{item.text}</span>
            {/each}
          </div>
        {/if}
        <button class="quickstart ai-generate-btn" onclick={onRunAi} disabled={agendaAiLoading || !agendaAiInput.trim()}>
          {agendaAiLoading ? 'Tänker...' : agendaAiQuestionText ? 'Skicka svar ▶' : 'Skapa dagplan ▶'}
        </button>
      </div>
    {/if}

    <div class="agenda-input-header" style="margin-top:12px;">
      <span class="agenda-input-label">Prompter för extern AI</span>
      <button class="info-btn" onclick={() => promptHelpOpen = !promptHelpOpen}>i</button>
      <button class="agenda-input-toggle" onclick={() => promptMenuOpen = !promptMenuOpen}>
        {promptMenuOpen ? '−' : '+'}
      </button>
    </div>
    {#if promptHelpOpen}
      <div class="feedback" style="margin-bottom:8px;">
        Dessa prompter hjälper en extern AI (som Gemini eller ChatGPT) att förbereda text som du sedan klistrar in i rutan ovan.
      </div>
    {/if}
    {#if promptMenuOpen}
      <div class="agenda-save-row" style="margin-top:8px;">
        {#each promptModeOptions as [mode, label]}
          <button class="agenda-save-btn" onclick={() => handleCopy(mode)} title={AI_AGENDA_PROMPT_MODE_HELP[mode]}>
            {copyStatuses[mode] || label}
          </button>
        {/each}
      </div>
      <div class="feedback" style="margin-top:6px; border-left: 2px solid var(--accent); padding-left: 8px;">
        <strong>Från anteckningar</strong>: gör lösa planer till dagtext.<br/>
        <strong>Från kalender</strong>: konverterar kalenderdata.<br/>
        <strong>Strikt formattering</strong>: rättar format utan att hitta på.<br/>
        <strong>Hjälpsam dialog</strong>: ställer frågor först om det behövs.
      </div>
    {/if}
    </div>
  {/if}
</div>

<style>
  .ai-input-row { display: flex; gap: 6px; align-items: flex-start; margin-bottom: 8px; }
  .ai-input-actions { display: flex; flex-direction: column; gap: 4px; padding-top: 2px; }
  .ai-flex-slider { margin-bottom: 8px; }
  .ai-question { padding: 7px 9px; border-left: 2px solid var(--accent); background: color-mix(in srgb, var(--accent) 5%, transparent); }
  .flex-range { width: 100%; accent-color: var(--accent); cursor: pointer; }
  .flex-labels { display: flex; justify-content: space-between; margin-top: 2px; }
  .flex-label { font-size: 11px; color: var(--menu-muted); transition: color 0.15s; }
  .flex-label.active { color: var(--accent); font-weight: 600; }
  .micro-btn.recording { background: #ff4444; color: white; border-color: #ff4444; }
</style>
