<script lang="ts">
  import { appState } from '$lib/state.svelte.js';

  let {
    isViewMode,
    onCycleClockSpan,
    onToggleCollapse,
    onShowToast
  }: {
    isViewMode: boolean;
    onCycleClockSpan: () => void;
    onToggleCollapse: () => void;
    onShowToast: (msg: string) => void;
  } = $props();

  const s = appState.value;
  let menuHelpOpen = $state<'tid' | 'visning' | 'sidopanel' | 'agenda' | 'ovrigt' | null>(null);
</script>

<div class="options-menu open">
  <div class="menu-section">
    <div class="menu-section-head">
      <div>
        <div class="section-title">Tid</div>
        <div class="section-copy">Klockans läge och tidsvisningen i toppen.</div>
      </div>
      <button class="menu-i" type="button" onclick={() => menuHelpOpen = menuHelpOpen === 'tid' ? null : 'tid'} title="Mer om tid">i</button>
    </div>
    {#if menuHelpOpen === 'tid'}
      <div class="menu-help">Klockvyn kan växla mellan 1h och 12h. Resten styr bara hur tydligt tid visas.</div>
    {/if}
    <div class="menu-list">
      <button class="menu-row" type="button" class:on={s.clockSpan !== 60} onclick={onCycleClockSpan}>
        <span>Klockvy</span>
        <span class="menu-row-state">{s.clockSpan === 60 ? '1h' : '12h'}</span>
      </button>
      <button class="menu-row" type="button" class:on={s.showLeft} onclick={() => { s.showLeft = !s.showLeft; appState.persist(); }}>
        <span>Tid kvar</span><span class="menu-row-state">{s.showLeft ? 'På' : 'Av'}</span>
      </button>
      <button class="menu-row" type="button" class:on={s.showNextSession} onclick={() => { s.showNextSession = !s.showNextSession; appState.persist(); }}>
        <span>Nästa pass</span><span class="menu-row-state">{s.showNextSession ? 'På' : 'Av'}</span>
      </button>
      <button class="menu-row" type="button" class:on={s.showCenterEnd} onclick={() => { s.showCenterEnd = !s.showCenterEnd; appState.persist(); }}>
        <span>Sluttid i mitten</span><span class="menu-row-state">{s.showCenterEnd ? 'På' : 'Av'}</span>
      </button>
    </div>
  </div>

  <div class="menu-section">
    <div class="menu-section-head">
      <div>
        <div class="section-title">Visning</div>
        <div class="section-copy">Små markeringar och läsbarhet i klockan.</div>
      </div>
      <button class="menu-i" type="button" onclick={() => menuHelpOpen = menuHelpOpen === 'visning' ? null : 'visning'} title="Mer om visning">i</button>
    </div>
    {#if menuHelpOpen === 'visning'}
      <div class="menu-help">Här stänger du av och på detaljnivån i visningen utan att ändra själva tiden.</div>
    {/if}
    <div class="menu-list">
      <button class="menu-row" type="button" class:on={s.hollow} onclick={() => { s.hollow = !s.hollow; appState.persist(); }}>
        <span>Ihålig mitt</span><span class="menu-row-state">{s.hollow ? 'På' : 'Av'}</span>
      </button>
      <button class="menu-row" type="button" class:on={s.textOutside} onclick={() => { s.textOutside = !s.textOutside; appState.persist(); }}>
        <span>Text utanför</span><span class="menu-row-state">{s.textOutside ? 'På' : 'Av'}</span>
      </button>
      <button class="menu-row" type="button" class:on={s.showQuarter} onclick={() => { s.showQuarter = !s.showQuarter; appState.persist(); }}>
        <span>Kvartmarkeringar</span><span class="menu-row-state">{s.showQuarter ? 'På' : 'Av'}</span>
      </button>
      <button class="menu-row" type="button" class:on={s.showFive} onclick={() => { s.showFive = !s.showFive; appState.persist(); }}>
        <span>5-minutersmarkeringar</span><span class="menu-row-state">{s.showFive ? 'På' : 'Av'}</span>
      </button>
      <button class="menu-row" type="button" class:on={s.showMin} onclick={() => { s.showMin = !s.showMin; appState.persist(); }}>
        <span>Minutmarkeringar</span><span class="menu-row-state">{s.showMin ? 'På' : 'Av'}</span>
      </button>
      <button class="menu-row" type="button" class:on={s.showFutureSegments} onclick={() => { s.showFutureSegments = !s.showFutureSegments; appState.persist(); }}>
        <span>Visa fortsättning</span><span class="menu-row-state">{s.showFutureSegments ? 'På' : 'Av'}</span>
      </button>
    </div>
  </div>

  <div class="menu-section">
    <div class="menu-section-head">
      <div>
        <div class="section-title">Sidopanel</div>
        <div class="section-copy">Vad som syns i vänsterpanelen under timern.</div>
      </div>
      <button class="menu-i" type="button" onclick={() => menuHelpOpen = menuHelpOpen === 'sidopanel' ? null : 'sidopanel'} title="Mer om sidopanel">i</button>
    </div>
    {#if menuHelpOpen === 'sidopanel'}
      <div class="menu-help">De här reglagen styr om noteringar och extra info visas i panelen bredvid timern.</div>
    {/if}
    <div class="menu-list">
      <button class="menu-row" type="button" class:on={s.segMinutesMode !== 'off'} onclick={() => {
        const order: ('off'|'planned'|'remaining')[] = ['off','planned','remaining'];
        s.segMinutesMode = order[(order.indexOf(s.segMinutesMode) + 1) % order.length];
        appState.persist();
      }}>
        <span>Minuter</span><span class="menu-row-state">{{ off:'Av', planned:'Planerade', remaining:'Kvar' }[s.segMinutesMode]}</span>
      </button>
      <button class="menu-row" type="button" class:on={s.showSegNotes} onclick={() => { s.showSegNotes = !s.showSegNotes; appState.persist(); }}>
        <span>Underrubriker</span><span class="menu-row-state">{s.showSegNotes ? 'På' : 'Av'}</span>
      </button>
      <button class="menu-row" type="button" class:on={s.showExtraInfo} onclick={() => { s.showExtraInfo = !s.showExtraInfo; appState.persist(); }}>
        <span>Info-ruta</span><span class="menu-row-state">{s.showExtraInfo ? 'På' : 'Av'}</span>
      </button>
      <button class="menu-row" type="button" class:on={s.showSegLabels} onclick={() => { s.showSegLabels = !s.showSegLabels; appState.persist(); }}>
        <span>Visa rubriker</span><span class="menu-row-state">{s.showSegLabels ? 'På' : 'Av'}</span>
      </button>
    </div>
  </div>

  <div class="menu-section">
    <div class="menu-section-head">
      <div>
        <div class="section-title">Agenda</div>
        <div class="section-copy">Dagplansläget och hur dagen delas upp.</div>
      </div>
      <button class="menu-i" type="button" onclick={() => menuHelpOpen = menuHelpOpen === 'agenda' ? null : 'agenda'} title="Mer om agenda">i</button>
    </div>
    {#if menuHelpOpen === 'agenda'}
      <div class="menu-help">Här finns det som påverkar själva dagplanen. I mobilvyn väljer du också direkt vilken flik som ska öppnas.</div>
    {/if}
    <div class="menu-list">
      {#if !isViewMode}
        <button class="menu-row" type="button" class:on={s.agendaView !== 'school'} onclick={() => {
          if (s.isLocked) {
            onShowToast('Låst – lås upp (l) för att växla');
            return;
          }
          s.agendaView = s.agendaView === 'school' ? 'private' : 'school';
          appState.persist();
          }}>
          <span>Öppet / Eget</span><span class="menu-row-state">{{ school: 'Öppet', private: 'Eget' }[s.agendaView]}</span>
        </button>
        <button class="menu-row" type="button" class:on={s.agendaDimPast} onclick={() => { s.agendaDimPast = !s.agendaDimPast; appState.persist(); }}>
          <span>Tona ner passerad tid</span><span class="menu-row-state">{s.agendaDimPast ? 'På' : 'Av'}</span>
        </button>
      {:else}
        <div class="menu-help" style="margin-top:0;">Visas som snapshot i delningsläge.</div>
      {/if}
    </div>
  </div>

  <div class="menu-section">
    <div class="menu-section-head">
      <div>
        <div class="section-title">Övrigt</div>
        <div class="section-copy">Snabbval som inte riktigt hör till en specifik vy.</div>
      </div>
      <button class="menu-i" type="button" onclick={() => menuHelpOpen = menuHelpOpen === 'ovrigt' ? null : 'ovrigt'} title="Mer om övrigt">i</button>
    </div>
    {#if menuHelpOpen === 'ovrigt'}
      <div class="menu-help">Lås, hjälp och andra snabbval ligger kvar i toppraden. Den här menyn samlar bara visningslägena.</div>
    {/if}
    <div class="menu-list">
      <button class="menu-row" type="button" class:on={s.sbCollapsed} onclick={onToggleCollapse}>
        <span>Sidopanel i mobil</span><span class="menu-row-state">{s.sbCollapsed ? 'Av' : 'På'}</span>
      </button>
    </div>
  </div>
</div>
