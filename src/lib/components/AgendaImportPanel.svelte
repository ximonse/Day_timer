<script lang="ts">
  let {
    agendaInputOpen,
    agendaDraft,
    savedAgendaMsg,
    icsImportOpen,
    icsDraft,
    icsSummary,
    icsPreviewLines,
    icsError,
    icsHasPreview,
    icsCanImport,
    copyAgendaPromptText,
    hasAiKey,
    agendaAiOpen,
    agendaAiInput,
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
    onSetStrictMode,
    onSetHelpfulMode,
    onRunAi,
    onToggleImportHelp,
    onToggleIcsHelp
  }: {
    agendaInputOpen: boolean;
    agendaDraft: string;
    savedAgendaMsg: string;
    icsImportOpen: boolean;
    icsDraft: string;
    icsSummary: string;
    icsPreviewLines: string[];
    icsError: string;
    icsHasPreview: boolean;
    icsCanImport: boolean;
    copyAgendaPromptText: string;
    hasAiKey: boolean;
    agendaAiOpen: boolean;
    agendaAiInput: string;
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
    onCopyPrompt: () => void;
    onToggleAi: () => void;
    onAgendaAiInputChange: (value: string) => void;
    onSetStrictMode: () => void;
    onSetHelpfulMode: () => void;
    onRunAi: () => void;
    onToggleImportHelp: () => void;
    onToggleIcsHelp: () => void;
  } = $props();
</script>

<div class="agenda-input-header">
  <span class="agenda-input-label">Redigera dagtext</span>
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
  <textarea
    class="agenda-input"
    placeholder="Skriv eller klistra in dagplanen här.&#10;&#10;@260508&#10;#Morgonrutin 08:00&#10;Vakna 5m&#10;Frukost 20m&#10;Promenad&#10;- ta med vatten&#10;&amp; Möte kl 9"
    value={agendaDraft}
    oninput={(e) => onDraftChange((e.target as HTMLTextAreaElement).value)}
    onpaste={(e) => onDraftPaste(e)}
  ></textarea>
  <div class="agenda-save-row">
    <button class="agenda-save-btn" onclick={onSave}
      title="Sparar dagtexten och synkar till molnet om du är inloggad. Mallbiblioteket påverkas inte.">
      {savedAgendaMsg || '📅 Spara dagtext'}
    </button>
    <button class="agenda-save-btn" onclick={onCopyPrompt}>{copyAgendaPromptText}</button>
    {#if hasAiKey}
      <button class="agenda-save-btn agenda-ai-btn" onclick={onToggleAi}>
        ✨ AI-dagplan
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
      <textarea class="ai-input" placeholder="Beskriv din dag... t.ex. &quot;Jobbar hemifrån, möte kl 10 och 14, träning på lunch&quot;"
        value={agendaAiInput}
        oninput={(e) => onAgendaAiInputChange((e.target as HTMLTextAreaElement).value)}></textarea>
      <div class="ai-mode-row">
        <button class="ai-mode-btn" class:on={aiPlanMode === 'strict'} onclick={onSetStrictMode}>Strikt</button>
        <button class="ai-mode-btn" class:on={aiPlanMode === 'helpful'} onclick={onSetHelpfulMode}>Hjälpsam</button>
        <span class="ai-mode-hint">
          {aiPlanMode === 'strict' ? 'Bara det du skriver, inga tillägg' : 'Lägger till marginaler, ställtid och pauser'}
        </span>
      </div>
      {#if agendaAiError}<div class="ai-error">{agendaAiError}</div>{/if}
      <button class="quickstart ai-generate-btn" onclick={onRunAi} disabled={agendaAiLoading || !agendaAiInput.trim()}>
        {agendaAiLoading ? 'Tänker...' : 'Generera dagplan ▶'}
      </button>
    </div>
  {/if}
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
  <textarea
    class="agenda-input"
    placeholder="Klistra in innehållet från en .ics-fil här om du hellre vill importera via text."
    value={icsDraft}
    oninput={(e) => onIcsDraftChange((e.target as HTMLTextAreaElement).value)}
    style="margin-top:8px;"
  ></textarea>
  <div class="agenda-save-row">
    <button class="agenda-save-btn" onclick={onPreviewIcs}>Förhandsgranska ICS</button>
    <button class="agenda-save-btn" onclick={onImportIcs} disabled={!icsCanImport}>Lägg i dagplan</button>
  </div>
  {#if icsSummary}
    <div class="feedback" style="margin-top:6px;">{icsSummary}</div>
  {/if}
  {#if icsPreviewLines.length > 0}
    <div class="feedback" style="margin-top:6px;">
      {#each icsPreviewLines as line}
        <div>{line}</div>
      {/each}
    </div>
  {/if}
  {#if icsError}
    <div class="ai-error" style="margin-top:6px;">{icsError}</div>
  {/if}
  {#if icsHasPreview}
    <div class="feedback" style="opacity:.72;margin-top:4px;">
      Heldagshandelser visas i previewn men importeras inte an i den har versionen.
    </div>
  {/if}
{/if}
