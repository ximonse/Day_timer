<script lang="ts">
  let {
    mode,
    hasSelection,
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
    onTitleInput,
    onPartsInput,
    onCopyPrompt,
    onToggleAiPanel,
    onAiInputChange,
    onSetStrictMode,
    onSetHelpfulMode,
    onRunAi,
    onQuickStart,
    onExtraInfoInput,
    onStartTimeInput,
    onEndModeChange,
    onEndControlMount
  }: {
    mode: 'now' | 'plan';
    hasSelection: boolean;
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
    onTitleInput: (value: string) => void;
    onPartsInput: (value: string) => void;
    onCopyPrompt: () => void;
    onToggleAiPanel: () => void;
    onAiInputChange: (value: string) => void;
    onSetStrictMode: () => void;
    onSetHelpfulMode: () => void;
    onRunAi: () => void;
    onQuickStart: () => void;
    onExtraInfoInput: (value: string) => void;
    onStartTimeInput: (value: string) => void;
    onEndModeChange: (mode: 'end' | 'len') => void;
    onEndControlMount: (node: HTMLElement | null) => void;
  } = $props();

  let endControlHost = $state<HTMLElement | null>(null);

  $effect(() => {
    onEndControlMount(endControlHost);
  });
</script>

{#if mode === 'now' || hasSelection}
  <div class="step-section">
    <div class="step-num">1</div>
    <div class="step-body">
      <label>{mode === 'plan' ? 'Blockrubrik' : 'Rubrik'}</label>
      <input type="text" placeholder="Matematik"
        value={titleValue}
        oninput={(e) => onTitleInput((e.target as HTMLInputElement).value)} />
    </div>
  </div>

  <div class="step-section">
    <div class="step-num">2</div>
    <div class="step-body">
      <label style="display:flex;align-items:center;gap:8px;">
        {mode === 'plan' ? 'Blockinnehåll (en rad per del)' : 'Lektionsdelar (en per rad)'}
        <button onclick={onCopyPrompt} style="font-size:11px;padding:1px 7px;border-radius:5px;border:1px solid var(--border);background:var(--pill);color:var(--menu-muted);cursor:pointer;line-height:1.6;">{copyBtnText}</button>
      </label>
      <textarea placeholder="Genomgång&#10;Eget arbete&#10;Avslut"
        value={partsValue}
        oninput={(e) => onPartsInput((e.target as HTMLTextAreaElement).value)}></textarea>
      <div class="feedback">{partsFeedbackText}</div>
      <div class="feedback" style="opacity:.65;margin-top:4px;">#Rubrik &nbsp;·&nbsp; Aktivitet 10m &nbsp;·&nbsp; - notering &nbsp;·&nbsp; &amp;kommentar</div>
      {#if hasAiKey}
        <div class="ai-panel">
          <button class="ai-panel-toggle" onclick={onToggleAiPanel}>
            {aiPanelOpen ? '▲' : '▼'} Planera med AI
          </button>
          {#if aiPanelOpen}
            <textarea class="ai-input" placeholder="Beskriv vad du vill planera... t.ex. &quot;45-minuterslektion om bråk för åk 5&quot;"
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
  </div>

  <div class="step-section step-section--action">
    <div class="step-num">3</div>
    <div class="step-body">
      <button id="quickStartBtn" class="quickstart" style="width:100%" onclick={onQuickStart}><span class="ico">⚡︎</span> Snabbstart nu</button>
    </div>
  </div>

  <div>
    <label>{mode === 'plan' ? 'Kommentar för valt block' : 'Info-ruta (fri text, visas som egen ruta i sidopanelen)'}</label>
    <textarea placeholder="T.ex. Att ta med: bok, penna&#10;Läxa: sida 42"
      value={extraInfoValue}
      oninput={(e) => onExtraInfoInput((e.target as HTMLTextAreaElement).value)}></textarea>
  </div>
  <div class="row2">
    <div>
      <label>Starttid</label>
      <input type="time" value={startTimeValue}
        oninput={(e) => onStartTimeInput((e.target as HTMLInputElement).value)} />
    </div>
    <div>
      <label>{endMode === 'end' ? 'Sluttid' : 'Längd (min)'}</label>
      <div bind:this={endControlHost}></div>
    </div>
  </div>
  <div class="mode-toggle">
    <button class:on={endMode === 'end'} onclick={() => onEndModeChange('end')}>Sluttid</button>
    <button class:on={endMode === 'len'} onclick={() => onEndModeChange('len')}>Längd</button>
  </div>
  <div class="feedback">{timeFeedbackText}</div>
{:else}
  <div class="section-card">
    <div class="section-card-head">
      <strong>Redigera dagplan</strong>
    </div>
    <div class="section-copy">Valj forst ett block i tidslinjen till hoger. Da vet appen exakt vilket pass som ska uppdateras.</div>
    <div class="section-copy muted">Import av ny dagplan ligger kvar i hogerpanelet, men blockredigering borjar alltid med ett val i tidslinjen.</div>
  </div>
{/if}
