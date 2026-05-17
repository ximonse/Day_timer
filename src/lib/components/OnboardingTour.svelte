<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { appState } from '$lib/state.svelte.js';

  let { step, onNext, onExit }: {
    step: number;
    onNext: () => void;
    onExit: () => void;
  } = $props();

  const steps = [
    // Step 1: Basic Timer Creation
    {
      id: 'title',
      section: 'now',
      target: '#lesson-title-input',
      title: 'Huvudrubrik',
      text: 'Börja med att ge din timer ett namn. Det här är den stora rubriken som syns för alla!',
      pos: 'bottom'
    },
    {
      id: 'sidebar-edit',
      section: 'now',
      target: '#sidebar-blocks',
      title: 'Aktiviteter',
      text: 'Klicka direkt på en text här för att ändra den. Skriv t.ex. "Genomgång 10m" för att sätta både namn och tid samtidigt.',
      pos: 'right'
    },
    {
      id: 'sidebar-shorthand',
      section: 'now',
      target: '#sidebar-blocks',
      title: 'Undertext & Kommentarer',
      text: 'När du redigerar, använd "-" för underpunkter (instruktioner) och "&" för en slutlig kommentar. De sparas direkt i listan.',
      pos: 'right'
    },
    {
      id: 'clock',
      section: 'now',
      target: '#clock-wrap',
      title: 'Interaktiv klocka',
      text: 'Här ser du tiden visuellt. Du kan dra i kanten på segmenten i klockan för att justera tiderna direkt på klockan!',
      pos: 'center'
    },
    {
      id: 'cleanup',
      section: 'now',
      target: '#mini-menu-toggle',
      title: 'Fokusläge',
      text: 'Klicka här för att stänga menyerna. Det ger en ren och tydlig vy för klassrummet.',
      pos: 'top'
    },
    {
      id: 'teaser1',
      section: 'now',
      target: '#theme-and-audio',
      title: 'Extra tips',
      text: 'I minimenyn kan du också välja färgteman och ställa in ljudaviseringar för varje del!',
      pos: 'top'
    },

    // Step 2: Now Mode & Sharing
    {
      id: 'now-activities',
      section: 'now',
      target: '#now-activities-input',
      title: 'Snabb-inmatning',
      text: 'Om du föredrar att skriva hela passet som text kan du använda den här rutan. Varje rad blir en ny del i timern.',
      pos: 'bottom'
    },
    {
      id: 'run',
      section: 'now',
      target: '#quickStartBtn',
      title: 'Starta timern',
      text: 'När du är nöjd i "Nu"-läget klickar du på Kör! för att starta timern direkt.',
      pos: 'top'
    },
    {
      id: 'share',
      section: 'now',
      target: '#now-share-btn',
      title: 'Dela med elever',
      text: 'Klicka här för att få en länk. Eleverna kan se din timer live på sina egna skärmar!',
      pos: 'top'
    },
    {
      id: 'template',
      section: 'now',
      target: '#now-save-template-btn',
      title: 'Spara som mall',
      text: 'Har du ett bra upplägg? Spara det som en mall så kan du använda det igen med ett klick.',
      pos: 'top'
    },

    // Step 3: Planning
    {
      id: 'plan-tab',
      section: 'plan',
      target: '#lesson-title-input',
      title: 'Planera framåt',
      text: 'I "Planera" kan du bygga lektioner för framtiden utan att störa den timer som körs.',
      pos: 'bottom'
    },
    {
      id: 'agenda-toggle',
      section: 'plan',
      target: '#agenda-toggle-btn',
      title: 'Agendan',
      text: 'Här ser du hela din dagplanering. Du kan ha olika agendor för olika behov!',
      pos: 'left'
    },
    {
      id: 'agenda-drag',
      section: 'plan',
      target: '#agenda-timeline',
      title: 'Ändra i agendan',
      text: 'I tidslinjen ser du blocken visuellt. Du kan dra i dem för att flytta hela passet eller justera tider för hela dagen.',
      pos: 'left'
    },

    // Step 4: Advanced
    {
      id: 'calendar',
      section: 'plan',
      target: '.agenda-calendar',
      title: 'Kalender',
      text: 'Hoppa mellan olika dagar för att se vad du har planerat eller förbereda veckan.',
      pos: 'left'
    },
    {
      id: 'prompts',
      section: 'plan',
      target: '#agenda-text-and-prompts',
      title: 'Smart import & Dagtext',
      text: 'Här kan du skriva in hela dagens plan som text. Använd våra AI-prompter för att snabbt hämta data från t.ex. Google Kalender och klistra in här!',
      pos: 'left'
    },
    {
      id: 'sync-teaser',
      section: 'workspace',
      target: '#account-sync-section',
      title: 'Alltid synkat',
      text: 'Skapa ett konto för att komma åt dina planeringar och mallar från vilken enhet som helst.',
      pos: 'top'
    }
  ];

  let currentStep = $derived(steps[step - 1]);
  let spotlightRect = $state({ top: 0, left: 0, width: 0, height: 0 });

  function updateSpotlight(scrollIntoView = false) {
    if (!currentStep) return;

    // Ensure we are in the correct section for this step
    if (appState.value.activeSection !== currentStep.section) {
      // Small delay to allow UI to render after section change
      appState.value.activeSection = currentStep.section as any;
      setTimeout(() => updateSpotlight(scrollIntoView), 50);
      return;
    }

    const el = document.querySelector(currentStep.target) as HTMLElement;
    if (el) {
      if (scrollIntoView) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const rect = el.getBoundingClientRect();
      spotlightRect = {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      };
    } else {
      // Element not found (maybe inside a collapsed menu), fallback to center
      spotlightRect = {
        top: window.innerHeight / 2 - 50,
        left: window.innerWidth / 2 - 50,
        width: 100,
        height: 100
      };
    }
  }

  $effect(() => {
    if (step > 0) {
      // Step changed, scroll to it
      updateSpotlight(true);
      
      // Setup listeners for resizing and scrolling
      const refresher = () => updateSpotlight(false);
      window.addEventListener('resize', refresher);
      window.addEventListener('scroll', refresher, true); 
      
      // Periodic check to catch UI movements
      const interval = setInterval(refresher, 200);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('resize', refresher);
        window.removeEventListener('scroll', refresher, true);
      }
    }
  });

  const tooltipStyle = $derived.by(() => {
    if (!spotlightRect.width) return '';
    const margin = 20;
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const tooltipW = 280;
    const tooltipH = 180; // Estimated height

    let left = spotlightRect.left + spotlightRect.width / 2;
    // Bounds check horizontal
    if (left - tooltipW/2 < 10) left = tooltipW/2 + 10;
    if (left + tooltipW/2 > winW - 10) left = winW - tooltipW/2 - 10;

    let finalPos = currentStep.pos;
    
    // Safety check: if pos is 'top' but we are too close to the top of the screen, flip to bottom
    if (finalPos === 'top' && spotlightRect.top < tooltipH + margin) {
      finalPos = 'bottom';
    }
    // Similarly for bottom
    if (finalPos === 'bottom' && winH - (spotlightRect.top + spotlightRect.height) < tooltipH + margin) {
      finalPos = 'top';
    }

    if (finalPos === 'bottom') {
      let top = spotlightRect.top + spotlightRect.height + margin;
      return `top: ${top}px; left: ${left}px; transform: translateX(-50%);`;
    } else if (finalPos === 'top') {
      let bottom = winH - spotlightRect.top + margin;
      return `bottom: ${bottom}px; left: ${left}px; transform: translateX(-50%);`;
    } else if (finalPos === 'left') {
      let right = winW - spotlightRect.left + margin;
      let top = spotlightRect.top + spotlightRect.height / 2;
      if (top - tooltipH/2 < 10) top = tooltipH/2 + 10;
      if (top + tooltipH/2 > winH - 10) top = winH - tooltipH/2 - 10;
      return `top: ${top}px; right: ${right}px; transform: translateY(-50%);`;
    } else if (finalPos === 'center') {
      return `top: 50%; left: 50%; transform: translate(-50%, -50%); position: fixed;`;
    } else {
      let l = spotlightRect.left + spotlightRect.width + margin;
      let top = spotlightRect.top + spotlightRect.height / 2;
      if (top - tooltipH/2 < 10) top = tooltipH/2 + 10;
      if (top + tooltipH/2 > winH - 10) top = winH - tooltipH/2 - 10;
      return `top: ${top}px; left: ${l}px; transform: translateY(-50%);`;
    }
  });

</script>

{#if step > 0 && currentStep}
  <div class="onboarding-overlay" in:fade={{ duration: 200 }} onclick={onExit} role="presentation">
    <div class="spotlight" style="
      top: {spotlightRect.top - 8}px;
      left: {spotlightRect.left - 8}px;
      width: {spotlightRect.width + 16}px;
      height: {spotlightRect.height + 16}px;
    "></div>

    <div class="onboarding-tooltip" style={tooltipStyle} in:fly={{ y: 10, duration: 300 }} onclick={(e) => e.stopPropagation()} role="presentation">
      <button class="close-tour" onclick={onExit} title="Stäng guide">×</button>
      <h3>{currentStep.title}</h3>
      <p>{currentStep.text}</p>
      <div class="onboarding-actions">
        <button class="skip-btn" onclick={onExit}>Avbryt</button>
        <button class="next-btn" onclick={onNext}>
          {step === steps.length ? 'Slutför' : 'Nästa'}
        </button>
      </div>
      <div class="step-indicator">Steg {step} av {steps.length}</div>
    </div>
  </div>
{/if}

<style>
  .onboarding-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: transparent;
    z-index: 10000;
    pointer-events: none;
  }

  .spotlight {
    position: absolute;
    background: transparent;
    border-radius: 12px;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: auto; /* Allow clicking on the highlighted area to exit or interact */
  }

  .onboarding-tooltip {
    position: absolute;
    width: 280px;
    background: var(--menu-surface);
    color: var(--menu-fg);
    padding: 24px;
    border-radius: 16px;
    box-shadow: 0 20px 50px rgba(0,0,0,0.4);
    border: 1px solid var(--menu-border);
    pointer-events: auto;
    z-index: 10001;
  }

  .close-tour {
    position: absolute;
    top: 12px;
    right: 12px;
    background: transparent;
    border: none;
    color: var(--menu-muted);
    font-size: 20px;
    cursor: pointer;
    line-height: 1;
  }

  .onboarding-tooltip h3 {
    margin: 0 0 10px 0;
    font-size: 18px;
    color: var(--accent);
    font-weight: 700;
  }

  .onboarding-tooltip p {
    margin: 0 0 20px 0;
    font-size: 15px;
    line-height: 1.6;
    opacity: 0.95;
  }

  .onboarding-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .next-btn {
    background: var(--accent);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.1s, opacity 0.2s;
  }

  .next-btn:active {
    transform: scale(0.95);
  }

  .skip-btn {
    background: transparent;
    color: var(--menu-muted);
    border: none;
    padding: 8px 0;
    font-size: 14px;
    cursor: pointer;
    text-decoration: underline;
  }

  .step-indicator {
    margin-top: 16px;
    font-size: 11px;
    color: var(--menu-muted);
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  @media (max-width: 600px) {
    .onboarding-tooltip {
      width: calc(100vw - 40px);
      left: 20px !important;
      right: 20px !important;
      transform: none !important;
    }
  }
</style>
