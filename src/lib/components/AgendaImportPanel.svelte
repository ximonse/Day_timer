<script lang="ts">
  import { AI_AGENDA_PROMPT_MODE_HELP, AI_AGENDA_PROMPT_MODE_LABELS, aiPlanMetadataItems, type AiAgendaPromptMode, type AiPlanResponse } from '$lib/ai-plan-engine.js';

  const promptModeOptions = Object.entries(AI_AGENDA_PROMPT_MODE_LABELS) as [AiAgendaPromptMode, string][];

  let {
    agendaInputOpen,
    agendaDraft,
    agendaDraftSource,
    draftStatus,
    selectedDateLabel,
    savedAgendaMsg,
    icsImportOpen,
    icsDraft,
    icsSummary,
    icsPreviewLines,
    icsError,
    icsHasPreview,
    icsCanImport,
    hasAiKey,
    agendaAiOpen,
    agendaAiInput,
    agendaAiPromptMode,
    aiLastResponse,
    agendaAiError,
    agendaAiQuestionText,
    agendaAiLoading,
    showHelpHints,
    showImportHelp,
    showIcsHelp,
    scheduleOpen,
    scheduleMondayDate,
    scheduleAddStandardParts,
    scheduleLoading,
    scheduleError,
    onToggleOpen,
    onDraftChange,
    onDraftPaste,
    onSave,
    onToggleIcsOpen,
    onIcsDraftChange,
    onIcsFileChange,
    onPreviewIcs,
    onImportIcs,
    onCopyPrompt,
    onToggleAi,
    onAgendaAiInputChange,
    onSetAgendaAiPromptMode,
    onRunAi,
    onToggleImportHelp,
    onToggleIcsHelp,
    onToggleScheduleOpen,
    onScheduleMondayDateChange,
    onToggleScheduleStandardParts,
    onReadSchedule
  }: {
    agendaInputOpen: boolean;
    agendaDraft: string;
    agendaDraftSource: 'manual' | 'ai';
    draftStatus: string;
    selectedDateLabel: string;
    savedAgendaMsg: string;
    icsImportOpen: boolean;
    icsDraft: string;
    icsSummary: string;
    icsPreviewLines: string[];
    icsError: string;
    icsHasPreview: boolean;
    icsCanImport: boolean;
    hasAiKey: boolean;
    agendaAiOpen: boolean;
    agendaAiInput: string;
    agendaAiPromptMode: AiAgendaPromptMode;
    aiLastResponse: AiPlanResponse | null;
    agendaAiError: string;
    agendaAiQuestionText: string;
    agendaAiLoading: boolean;
    showHelpHints: boolean;
    showImportHelp: boolean;
    showIcsHelp: boolean;
    onToggleOpen: () => void;
    onDraftChange: (value: string) => void;
    onDraftPaste: (event: ClipboardEvent) => void;
    onSave: () => void;
    onToggleIcsOpen: () => void;
    onIcsDraftChange: (value: string) => void;
    onIcsFileChange: (event: Event) => void;
    onPreviewIcs: () => void;
    onImportIcs: () => void;
    onCopyPrompt: (type: AiAgendaPromptMode) => Promise<void>;
    onToggleAi: () => void;
    onAgendaAiInputChange: (value: string) => void;
    onSetAgendaAiPromptMode: (mode: AiAgendaPromptMode) => void;
    onRunAi: () => void;
    onToggleImportHelp: () => void;
    onToggleIcsHelp: () => void;
    scheduleOpen: boolean;
    scheduleMondayDate: string;
    scheduleAddStandardParts: boolean;
    scheduleLoading: boolean;
    scheduleError: string;
    onToggleScheduleOpen: () => void;
    onScheduleMondayDateChange: (value: string) => void;
    onToggleScheduleStandardParts: () => void;
    onReadSchedule: (file: File) => void;
  } = $props();

  let promptHelpOpen = $state(false);
  let promptMenuOpen = $state(false);
  let agendaTextarea: HTMLTextAreaElement | null = $state(null);
  let selectedScheduleFile = $state<File | null>(null);
  
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
      : 'Beskriv dagen fritt, t.ex. låg energi, tvätta, röja köket, handla, ringa mamma och enkel middag...'
  );

  $effect(() => {
    if (!agendaTextarea) return;
    if (document.activeElement === agendaTextarea) return;
    if (agendaTextarea.value !== agendaDraft) agendaTextarea.value = agendaDraft;
  });

  async function handleCopy(type: AiAgendaPromptMode) {
    await onCopyPrompt(type);
    copyStatuses = { ...copyStatuses, [type]: '✓ Kopierad' };
    setTimeout(() => {
      copyStatuses = { ...copyStatuses, [type]: AI_AGENDA_PROMPT_MODE_LABELS[type] };
    }, 1500);
  }
</script>

<div class="agenda-input-header">
  <span class="agenda-input-label">Dagtext, import & AI</span>
  <button class="info-btn" onclick={onToggleImportHelp}>i</button>
  <button class="agenda-input-toggle" onclick={onToggleOpen}>
    {agendaInputOpen ? '△' : '▽'}
  </button>
</div>
{#if showImportHelp}
  <div class="feedback" style="margin-bottom:8px;">
    Redigera dagplanen direkt här, klistra in ny text, AI-generera eller bygg tomma dagar i kalendern. Inget ändras förrän du sparar.
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
        onpaste={(e) => onDraftPaste(e)}
      ></textarea>
    </div>
    <div class="agenda-save-row">
      <button class="agenda-save-btn" onclick={onSave}
        title="Sparar dagtexten och synkar till molnet om du är inloggad. Mallbiblioteket påverkas inte.">
        {savedAgendaMsg || (agendaDraftSource === 'ai' ? '✓ Godkänn AI-förslag' : '📅 Spara i dagplan')}
      </button>
      {#if hasAiKey}
        <button class="agenda-save-btn agenda-ai-btn" onclick={onToggleAi}>
          ✨ Skapa med AI
        </button>
      {/if}
    </div>
    {#if showImportHelp}
      <div class="feedback" style="margin-top:6px;">
        Källstatus som <strong>Import</strong>, <strong>Mall</strong> och <strong>AI</strong> visas diskret i tidslinjen och fullt ut i planeringseditorn.
      </div>
      <div class="feedback" style="opacity:.72;margin-top:4px;">
        Om du vill göra ett importerat block helt eget, välj det i tidslinjen och klicka <strong>Gör till manuellt block</strong>.
      </div>
    {/if}
    {#if agendaAiOpen && hasAiKey}
      <div class="agenda-ai-panel">
        {#if agendaDraftSource === 'ai'}
          <div class="feedback" style="margin-bottom:8px;">
            AI-förslaget ligger i dagtexten ovan. Läs, ändra vid behov och godkänn först när det ser rätt ut.
          </div>
        {/if}
        <div class="agenda-input-wrapper">
          <textarea class="ai-input" placeholder={agendaAiPlaceholder}
            value={agendaAiInput}
            oninput={(e) => onAgendaAiInputChange((e.target as HTMLTextAreaElement).value)}></textarea>
        </div>
        <div class="ai-mode-row">
          {#each promptModeOptions as [mode, label]}
            <button class="ai-mode-btn" class:on={agendaAiPromptMode === mode} onclick={() => onSetAgendaAiPromptMode(mode)} title={AI_AGENDA_PROMPT_MODE_HELP[mode]}>{label}</button>
          {/each}
        </div>
        {#if agendaAiError}<div class="ai-error">{agendaAiError}</div>{/if}
        {#if agendaAiQuestionText}
          <div class="feedback" style="margin-bottom:8px; white-space:pre-line;">
            {agendaAiQuestionText}
          </div>
        {/if}
        {#if aiLastResponse && aiPlanMetadataItems(aiLastResponse).length}
          <div class="ai-meta-list">
            {#each aiPlanMetadataItems(aiLastResponse) as item}
              <span class={`ai-meta-chip ai-meta-chip--${item.kind}`}>{item.text}</span>
            {/each}
          </div>
        {/if}
        <button class="quickstart ai-generate-btn" onclick={onRunAi} disabled={agendaAiLoading || !agendaAiInput.trim()}>
          {agendaAiLoading ? 'Tänker...' : 'Generera dagplan ▶'}
        </button>
      </div>
    {/if}

    <div class="agenda-input-header" style="margin-top:12px;">
      <span class="agenda-input-label">Prompter för planering och import</span>
      <button class="info-btn" onclick={() => promptHelpOpen = !promptHelpOpen}>i</button>
      <button class="agenda-input-toggle" onclick={() => promptMenuOpen = !promptMenuOpen}>
        {promptMenuOpen ? '△' : '▽'}
      </button>
    </div>
    {#if promptHelpOpen}
      <div class="feedback" style="margin-bottom:8px;">
        Dessa prompter hjälper en extern AI (som Gemini eller ChatGPT) att förbereda text som du sedan klistrar in i rutan "Redigera dagtext" ovan.
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

<div class="agenda-input-header" style="margin-top:12px;">
  <span class="agenda-input-label">Importera ICS-kalender</span>
  <button class="info-btn" onclick={onToggleIcsHelp}>i</button>
  <button class="agenda-input-toggle" onclick={onToggleIcsOpen}>
    {icsImportOpen ? '△' : '▽'}
  </button>
</div>
{#if showIcsHelp}
  <div class="feedback" style="margin-bottom:8px;">
    ICS-filer förhandsgranskas först. Tidsatta händelser kan sedan sparas in som block i vald dagplan.
  </div>
{/if}
{#if icsImportOpen}
  <input type="file" accept=".ics,text/calendar" class="sync-input" onchange={onIcsFileChange} />
  <div class="agenda-input-wrapper" style="margin-top:8px;">
    <textarea
      class="agenda-input"
      placeholder="Klistra in innehållet från en .ics-fil här om du hellre vill importera via text."
      value={icsDraft}
      oninput={(e) => onIcsDraftChange((e.target as HTMLTextAreaElement).value)}
    ></textarea>
  </div>
  <div class="agenda-save-row">
    <button class="agenda-save-btn" onclick={onPreviewIcs}>Förhandsgranska ICS</button>
    <button class="agenda-save-btn" onclick={onImportIcs} disabled={!icsCanImport}>Lägg i dagplan</button>
  </div>
  {#if icsSummary}
    <div class="feedback" style="margin-top:6px;">{icsSummary}</div>
  {/if}
  {#if icsPreviewLines.length > 0}
    <div class="preview-list" style="margin-top:6px;">
      {#each icsPreviewLines as line}
        <div class="preview-item">{line}</div>
      {/each}
    </div>
  {/if}
  {#if icsError}
    <div class="ai-error" style="margin-top:6px;">{icsError}</div>
  {/if}
  {#if icsHasPreview}
    <div class="feedback" style="opacity:.72;margin-top:4px;">
      Heldagshändelser visas i förhandsgranskningen men importeras inte än i den här versionen.
    </div>
  {/if}
{/if}

{#if hasAiKey}
<div class="agenda-input-header" style="margin-top:12px;">
  <span class="agenda-input-label">Läs av schemafoto</span>
  <button class="agenda-input-toggle" onclick={onToggleScheduleOpen}>
    {scheduleOpen ? '△' : '▽'}
  </button>
</div>
{#if scheduleOpen}
  <input
    type="file"
    accept="image/*,application/pdf"
    class="sync-input"
    onchange={(e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      selectedScheduleFile = file ?? null;
    }}
    disabled={scheduleLoading}
  />
  <input
    type="text"
    class="sync-input"
    placeholder="Måndagens datum, t.ex. 260831 (lämna tomt om datum syns i schemat)"
    value={scheduleMondayDate}
    oninput={(e) => onScheduleMondayDateChange((e.target as HTMLInputElement).value)}
    style="margin-top:6px;"
  />
  <label class="checkbox-label" style="margin-top:8px; display:flex; align-items:center; gap:6px; font-size:0.85em; cursor:pointer;">
    <input type="checkbox" checked={scheduleAddStandardParts} onchange={onToggleScheduleStandardParts} />
    Lägg till standarddelar (Närvaro, Arbete, Avslut)
  </label>
  <div class="agenda-save-row" style="margin-top:8px;">
    <button
      class="agenda-save-btn"
      onclick={() => { if (selectedScheduleFile) onReadSchedule(selectedScheduleFile); }}
      disabled={!selectedScheduleFile || scheduleLoading}
    >
      {scheduleLoading ? 'Läser av...' : 'Läs av schema'}
    </button>
  </div>
  {#if scheduleError}
    <div class="ai-error" style="margin-top:6px;">{scheduleError}</div>
  {/if}
{/if}
{/if}
