# Day_timer — Claude Context

## Vad är det här?

`Day_timer` är en SvelteKit-port av [`the_timer`](https://github.com/ximonse/the_timer) — en visuell klocka för lärare. Appen har vuxit till en fullfjädrad dagplanerare med `Nu`-läge, `Planera`-läge, agenda, kalender, mallbibliotek, AI-stöd och live-delning.

**Sanningskällan:** `/home/user/the_timer/index.html` (för klockans geometri och färger).

---

## 🛑 Utvecklingspolicy (Viktigt!)

- **Polish är prioriterat**: Små UI-förbättringar, mjukare animationer och UX-puts är alltid välkommet.
- **Tänk efter före**: Om användaren vill ändra kärnlogik eller lägga till stora features ska detta **motiveras och genomtänkas noggrant**. Fråga hellre en gång för mycket än att börja riva i stabil kod.
- **Inga kommentarer i kod**: All förklaring ska ligga i dokumentationen eller commit-meddelanden.

---

## Nuläge (Klar maj 2026)

### Phase A — Grunden
- ✅ Layout & SVG-klocka (Pixel-perfekt kopia)
- ✅ 6 Paletter (sansad, meadow, mlp, bright, clear, psychedelic)
- ✅ Dag/natt-läge & Drag-funktionalitet
- ✅ Audio-varningar & Flash-overlay

### Phase B — Funktioner
- ✅ **Klockvy 1h/12h**: Cykling via toolbar
- ✅ **Agenda & Tidslinje**: Dra block, kalendervy
- ✅ **Live-delning**: Via Redis (`/?view=TOKEN`)
- ✅ **AI-stöd**: Gemini/Claude-integration för pass och dagplaner
- ✅ **Bibliotek**: Mallar för återkommande pass
- ✅ **Emoji-stöd**: Stora emojis i sektorer om titeln bara är en emoji
- ✅ **Kalender**: Lokaliserad till svensk standard (Måndag först)

### Phase C — UI Polish & Guidance
- ✅ **Interaktiv Guide**: 16 steg med intelligent spotlight och auto-panelutfällning
- ✅ **Manual**: Fullständig hjälpmeny ('i') med pedagogiska block
- ✅ **Välkomnande**: Centrerad välkomstvy med forskningskontext och signatur
- ✅ **Beta-branding**: BETA-markeringar och ny SVG-favicon
- ✅ **Prestanda**: SVG-masker och `requestAnimationFrame` för laggfri scroll

---

## Stack & Teknik

- **SvelteKit 5** (Runes: `$state`, `$derived`, `$effect`)
- **Adapter Vercel** + **Upstash Redis** (Sync/Share)
- **Inga CSS-ramverk**: Allt är ren CSS (Custom Properties)
- **Z-index**: Onboarding overlay (10000), Tooltip (10001), Welcome Overlay (11000)

---

## Projektstruktur

```
src/
  lib/
    components/       — OnboardingTour, AgendaPanel, Clock, Sidebar, etc.
    state.svelte.ts   — AppState (Sanningen om appens tillstånd)
    parse.ts          — All text-parsing (viktigt för AI/Dagtext)
    clock.ts          — Geometri och beräkningar för SVG-klockan
  routes/
    +page.svelte      — Huvudvyn (orkestrerar alla komponenter)
    api/              — Sync, Share och AI-proxy
```

---

## Designprinciper

- **Enkel yta, djup under**: Avancerade saker döljs bakom `⚙` eller `✎`.
- **Snabbhet**: Från tanke till startad timer på <10 sekunder.
- **Visuellt språk**: Samma som the_timer (sektorfärger, chip-etiketter).
- **Motivation**: Varje ny feature måste ha ett tydligt "varför".
