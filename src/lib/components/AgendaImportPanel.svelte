<script lang="ts">
  let {
    agendaInputOpen,
    agendaDraft,
    savedAgendaMsg,
    copyAgendaPromptText,
    hasAiKey,
    agendaAiOpen,
    agendaAiInput,
    aiPlanMode,
    agendaAiError,
    agendaAiLoading,
    onToggleOpen,
    onDraftChange,
    onDraftPaste,
    onSave,
    onCopyPrompt,
    onToggleAi,
    onAgendaAiInputChange,
    onSetStrictMode,
    onSetHelpfulMode,
    onRunAi
  }: {
    agendaInputOpen: boolean;
    agendaDraft: string;
    savedAgendaMsg: string;
    copyAgendaPromptText: string;
    hasAiKey: boolean;
    agendaAiOpen: boolean;
    agendaAiInput: string;
    aiPlanMode: 'strict' | 'helpful';
    agendaAiError: string;
    agendaAiLoading: boolean;
    onToggleOpen: () => void;
    onDraftChange: (value: string) => void;
    onDraftPaste: (event: ClipboardEvent) => void;
    onSave: () => void;
    onCopyPrompt: () => void;
    onToggleAi: () => void;
    onAgendaAiInputChange: (value: string) => void;
    onSetStrictMode: () => void;
    onSetHelpfulMode: () => void;
    onRunAi: () => void;
  } = $props();
</script>

<div class="agenda-input-header">
  <span class="agenda-input-label">Importera ny dagplan</span>
  <button class="agenda-input-toggle" onclick={onToggleOpen}>
    {agendaInputOpen ? '△ Dölj' : '▽ Redigera'}
  </button>
</div>
{#if agendaInputOpen}
  <textarea
    class="agenda-input"
    placeholder="Klistra in ny dagplan här. Texten slås ihop med sparad dagplan när du klickar Spara.&#10;&#10;@260508&#10;#Morgonrutin 08:00&#10;Vakna 5m&#10;Frukost 20m&#10;Promenad&#10;- ta med vatten&#10;&amp; Möte kl 9"
    value={agendaDraft}
    oninput={(e) => onDraftChange((e.target as HTMLTextAreaElement).value)}
    onpaste={(e) => onDraftPaste(e)}
  ></textarea>
  <div class="agenda-save-row">
    <button class="agenda-save-btn" onclick={onSave}
      title="Importerar texten till sparad dagplan och synkar till molnet om du är inloggad. Mallbiblioteket påverkas inte.">
      {savedAgendaMsg || '📅 Spara dagplan'}
    </button>
    <button class="agenda-save-btn" onclick={onCopyPrompt}>{copyAgendaPromptText}</button>
    {#if hasAiKey}
      <button class="agenda-save-btn agenda-ai-btn" onclick={onToggleAi}>
        ✨ AI-dagplan
      </button>
    {/if}
  </div>
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
