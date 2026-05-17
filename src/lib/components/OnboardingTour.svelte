<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { appState } from '$lib/state.svelte.js';

  let { step, onNext, onBack, onExit, onLoadDummy }: {
    step: number;
    onNext: () => void;
    onBack: () => void;
    onExit: () => void;
    onLoadDummy: () => void;
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
      pos: 'bottom'
    },
    {
      id: 'sidebar-shorthand',
      section: 'now',
      target: '#sidebar-blocks',
      title: 'Smarta genvägar',
      text: 'När du redigerar: Tryck `Tab` för att skriva undertext, `&` för en slutkommentar, och `Enter` för att skapa en helt ny aktivitet!',
      pos: 'bottom'
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
      id: 'plan-time',
      section: 'plan',
      target: '#plan-time-row',
      title: 'Planera tider',
      text: 'I "Planera" kan du sätta exakta start- och sluttider för dina pass. Du kan även välja att ställa in total längd i minuter.',
      pos: 'bottom'
    },
    {
      id: 'agenda-view',
      section: 'plan',
      target: '#agenda-panel',
      title: 'Agendan',
      text: 'Här ser du hela din dagplanering. Agendan samlar alla dina sparade pass för den valda dagen.',
      pos: 'left'
    },
    {
      id: 'agenda-drag',
      section: 'plan',
      target: '#agenda-timeline',
      title: 'Ändra i agendan',
      text: 'I tidslinjen kan du dra i blocken för att flytta hela passet eller justera tider för hela dagen.',
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
      text: 'Här kan du skriva in hela dagens plan som text. Använd våra AI-prompter för att få hjälp att planera din dag eller snabbt hämta data från t.ex. Google Kalender!',
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

    const el = document.querySelector(currentStep.target) as HTMLElement;
    if (el) {
      if (scrollIntoView) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const rect = el.getBoundingClientRect();
      
      // Only update if changed enough to avoid jitter
      if (Math.abs(spotlightRect.top - rect.top) > 0.5 || 
          Math.abs(spotlightRect.left - rect.left) > 0.5 ||
          spotlightRect.width !== rect.width ||
          spotlightRect.height !== rect.height) {
        spotlightRect = {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        };
      }
    } else {
      // Fallback to center if element not found
      spotlightRect = {
        top: window.innerHeight / 2 - 50,
        left: window.innerWidth / 2 - 50,
        width: 100,
        height: 100
      };
    }
  }

  // Handle section changes separately from the animation loop
  $effect(() => {
    if (step > 0 && currentStep) {
      // 1. Ensure correct section
      if (appState.value.activeSection !== currentStep.section) {
        appState.value.activeSection = currentStep.section as any;
      }

      // 2. Ensure sidebar is open if we are in 'now' and hitting sidebar targets
      if (currentStep.section === 'now' && currentStep.target.includes('sidebar')) {
        if (appState.value.sbCollapsed) appState.value.sbCollapsed = false;
      }

      // 3. Ensure agenda is open if we are in 'plan'
      if (currentStep.section === 'plan') {
        if (!appState.value.agendaOpen) appState.value.agendaOpen = true;
      }

      // Give UI a moment to switch sections and animate panels before scrolling
      setTimeout(() => updateSpotlight(true), 150);
    }
  });

  $effect(() => {
    if (step > 0) {
      updateSpotlight(true);
      
      let rafId: number;
      const loop = () => {
        updateSpotlight(false);
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
      
      return () => cancelAnimationFrame(rafId);
    }
  });

  const tooltipStyle = $derived.by(() => {
    if (!spotlightRect.width) return '';
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const tooltipW = 300;
    const tooltipH = 180;

    let left = spotlightRect.left + spotlightRect.width / 2;
    if (left - tooltipW/2 < 10) left = tooltipW/2 + 10;
    if (left + tooltipW/2 > winW - 10) left = winW - tooltipW/2 - 10;

    let finalPos = currentStep.pos;
    
    // Safety check: if pos is 'top' but we are too close to the top of the screen, flip to bottom
    if (finalPos === 'top' && spotlightRect.top < tooltipH + 24) {
      finalPos = 'bottom';
    }
    // Similarly for bottom
    if (finalPos === 'bottom' && winH - (spotlightRect.top + spotlightRect.height) < tooltipH + 24) {
      finalPos = 'top';
    }

    // Step 2 & 3 specific: Lower them significantly
    const isSidebarStep = currentStep.id === 'sidebar-edit' || currentStep.id === 'sidebar-shorthand';
    const finalMargin = isSidebarStep ? 120 : 24;

    if (finalPos === 'bottom') {
      let top = spotlightRect.top + spotlightRect.height + finalMargin;
      return `top: ${top}px; left: ${left}px; transform: translateX(-50%);`;
    } else if (finalPos === 'top') {
      let bottom = winH - spotlightRect.top + finalMargin;
      return `bottom: ${bottom}px; left: ${left}px; transform: translateX(-50%);`;
    } else if (finalPos === 'left') {
      let right = winW - spotlightRect.left + finalMargin;
      let top = spotlightRect.top + spotlightRect.height / 2;
      // Safety: keep tooltip within vertical bounds
      if (top - tooltipH/2 < 10) top = tooltipH/2 + 10;
      if (top + tooltipH/2 > winH - 10) top = winH - tooltipH/2 - 10;
      return `top: ${top}px; right: ${right}px; transform: translateY(-50%);`;
    } else if (finalPos === 'center') {
      return `top: 50%; left: 50%; transform: translate(-50%, -50%); position: fixed;`;
    } else {
      let l = spotlightRect.left + spotlightRect.width + finalMargin;
      let top = spotlightRect.top + spotlightRect.height / 2;
      if (top - tooltipH/2 < 10) top = tooltipH/2 + 10;
      if (top + tooltipH/2 > winH - 10) top = winH - tooltipH/2 - 10;
      return `top: ${top}px; left: ${l}px; transform: translateY(-50%);`;
    }
  });

</script>

{#if step > 0 && currentStep}
  <div class="onboarding-overlay" in:fade={{ duration: 400 }} onclick={onExit} role="presentation">
    <svg class="onboarding-mask-svg" width="100%" height="100%">
      <defs>
        <mask id="spotlight-mask">
          <rect width="100%" height="100%" fill="white" />
          <rect 
            class="spotlight-rect"
            x={spotlightRect.left - 12} 
            y={spotlightRect.top - 12} 
            width={spotlightRect.width + 24} 
            height={spotlightRect.height + 24} 
            rx="16" 
            fill="black" 
          />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#spotlight-mask)" />
    </svg>

    {#key step}
      <div class="onboarding-tooltip" 
           style={tooltipStyle} 
           in:fly={{ y: 20, duration: 400, delay: 100 }} 
           out:fade={{ duration: 200 }}
           onclick={(e) => e.stopPropagation()} 
           role="presentation">
        <button class="close-tour" onclick={onExit} title="Stäng guide">×</button>
        <h3>{currentStep.title}</h3>
        <p>{currentStep.text}</p>
        <div class="onboarding-actions">
          <div style="display:flex; gap:8px;">
            {#if step > 1}
              <button class="back-btn" onclick={onBack}>Bakåt</button>
            {/if}
            <button class="skip-btn" onclick={onExit}>Avbryt</button>
          </div>
          <button class="next-btn" onclick={onNext}>
            {step === steps.length ? 'Slutför' : 'Nästa'}
          </button>
        </div>
        <div class="step-indicator">Steg {step} av {steps.length}</div>
      </div>
    {/key}
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

  .onboarding-mask-svg {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
    width: 100%;
    height: 100%;
  }

  .spotlight-rect {
    transition: x 0.4s cubic-bezier(0.4, 0, 0.2, 1), 
                y 0.4s cubic-bezier(0.4, 0, 0.2, 1), 
                width 0.4s cubic-bezier(0.4, 0, 0.2, 1), 
                height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .onboarding-tooltip {
    position: absolute;
    width: 300px;
    background: var(--menu-surface);
    color: var(--menu-fg);
    padding: 28px;
    border-radius: 24px;
    box-shadow: 0 30px 70px rgba(0,0,0,0.5);
    border: 1px solid var(--menu-border);
    pointer-events: auto;
    z-index: 10001;
    will-change: top, left, bottom, right, transform;
  }

  .close-tour {
    position: absolute;
    top: 16px;
    right: 16px;
    background: transparent;
    border: none;
    color: var(--menu-muted);
    font-size: 24px;
    cursor: pointer;
    line-height: 1;
    opacity: 0.6;
    transition: opacity 0.2s;
  }

  .close-tour:hover {
    opacity: 1;
  }

  .onboarding-tooltip h3 {
    margin: 0 0 12px 0;
    font-size: 20px;
    color: var(--accent);
    font-weight: 500;
  }

  .onboarding-tooltip p {
    margin: 0 0 24px 0;
    font-size: 16px;
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
    padding: 12px 24px;
    border-radius: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.2s, background 0.2s;
  }

  .next-btn:hover {
    filter: brightness(1.1);
  }

  .next-btn:active {
    transform: scale(0.95);
  }

  .back-btn {
    background: var(--pill);
    color: var(--fg);
    border: 1px solid var(--border);
    padding: 10px 18px;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.2s;
  }

  .back-btn:hover {
    background: var(--menu-surface);
  }

  .skip-btn {
    background: transparent;
    color: var(--menu-muted);
    border: none;
    padding: 10px 0;
    font-size: 14px;
    cursor: pointer;
    text-decoration: underline;
  }

  .step-indicator {
    margin-top: 20px;
    font-size: 11px;
    color: var(--menu-muted);
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    font-weight: 600;
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
