<script lang="ts">
  import { AI_AGENDA_PLANNING_MODES, AI_PLANNING_MODE_LABELS, aiPlanMetadataItems, type AiPlanResponse, type AiPlanningMode } from '$lib/ai-plan-engine.js';

  const planningModeOptions = AI_AGENDA_PLANNING_MODES.map((mode) => [mode, AI_PLANNING_MODE_LABELS[mode]] as [AiPlanningMode, string]);

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
    aiPlanningMode,
    aiLastResponse,
    aiPlanMode,
    agendaAiError,
    agendaAiLoading,
    showHelpHints,
    showImportHelp,
    showIcsHelp,
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
    onSetAiPlanningMode,
    onSetStrictMode,
    onSetHelpfulMode,
    onRunAi,
    onToggleImportHelp,
    onToggleIcsHelp
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
    aiPlanningMode: AiPlanningMode;
    aiLastResponse: AiPlanResponse | null;
    aiPlanMode: 'strict' | 'helpful';
    agendaAiError: string;
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
    onCopyPrompt: (type: 'plan' | 'calendar') => Promise<void>;
    onToggleAi: () => void;
    onAgendaAiInputChange: (value: string) => void;
    onSetAiPlanningMode: (mode: AiPlanningMode) => void;
    onSetStrictMode: () => void;
    onSetHelpfulMode: () => void;
    onRunAi: () => void;
    onToggleImportHelp: () => void;
    onToggleIcsHelp: () => void;
  } = $props();

  let promptHelpOpen = $state(false);
  let promptMenuOpen = $state(false);
  let agendaTextarea: HTMLTextAreaElement | null = $state(null);
  
  let copyPlanStatus = $state('Från anteckningar');
  let copyCalendarStatus = $state('Från kalender');
  const agendaAiPlaceholder = $derived(
    aiPlanningMode === 'free-day'
      ? 'Beskriv dagen fritt, t.ex. låg energi, tvätta, röja köket, handla, ringa mamma och enkel middag...'
      : 'Beskriv dagens ankare, t.ex. jobbar hemifrån, möte kl 10 och 14, träning på lunch...'
  );

  $effect(() => {
    if (!agendaTextarea) return;
    if (document.activeElement === agendaTextarea) return;
    if (agendaTextarea.value !== agendaDraft) agendaTextarea.value = agendaDraft;
  });

  async function handleCopy(type: 'plan' | 'calendar') {
    await onCopyPrompt(type);
    if (type === 'plan') {
      copyPlanStatus = '✓ Kopierad';
      setTimeout(() => copyPlanStatus = 'Från anteckningar', 1500);
    } else {
      copyCalendarStatus = '✓ Kopierad';
      setTimeout(() => copyCalendarStatus = 'Från kalender', 1500);
    }
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
        placeholder="Skriv eller klistra in dagplanen här.&#10;&#10;@260508&#10;#Morgonrutin 08:00-08:45&#10;Vakna 5m&#10;Frukost 20m&#10;Promenad&#10;- ta med vatten&#10;&amp; Möte kl 9"
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
          {#each planningModeOptions as [mode, label]}
            <button class="ai-mode-btn" class:on={aiPlanningMode === mode} onclick={() => onSetAiPlanningMode(mode)}>{label}</button>
          {/each}
        </div>
        <div class="ai-tone-row">
          <span class="ai-tone-label">Ton</span>
          <button class="ai-tone-btn" class:on={aiPlanMode === 'strict'} onclick={onSetStrictMode} title="Bara det du skriver, inga tillägg">Strikt</button>
          <button class="ai-tone-btn" class:on={aiPlanMode === 'helpful'} onclick={onSetHelpfulMode} title="Lägger till marginaler, ställtid och pauser">Hjälpsam</button>
        </div>
        {#if agendaAiError}<div class="ai-error">{agendaAiError}</div>{/if}
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
        <button class="agenda-save-btn" onclick={() => handleCopy('plan')} title="Kopiera prompt för ny planering från anteckningar">
          {copyPlanStatus}
        </button>
        <button class="agenda-save-btn" onclick={() => handleCopy('calendar')} title="Kopiera prompt för att hämta kalenderdata">
          {copyCalendarStatus}
        </button>
      </div>
      <div class="feedback" style="margin-top:6px; border-left: 2px solid var(--accent); padding-left: 8px;">
        <strong>Från anteckningar</strong>: Kopiera denna prompt till Gemini och skriv ner dina lösa planer. Klistra sedan in resultatet i "Redigera dagtext" ovan.<br/>
        <strong>Från kalender</strong>: Kopiera denna prompt till Gemini. AI:n hämtar dina kalenderhändelser och skriver ut dem i appens format. Klistra sedan in resultatet i "Redigera dagtext" ovan.
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
