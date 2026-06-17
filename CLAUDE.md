# Day_timer — Claude Context

## Vad är det här?

`Day_timer` är en SvelteKit-port av [`the_timer`](https://github.com/ximonse/the_timer) — en visuell klocka för lärare. Appen har vuxit till en fullfjädrad dagplanerare med `Nu`-läge, `Planera`-läge, agenda, kalender, mallbibliotek, AI-stöd och live-delning.

**Sanningskällan:** `/home/user/the_timer/index.html` (för klockans geometri och färger).

---

## 🛑 Utvecklingspolicy (Viktigt!)

- **Polish är prioriterat**: Små UI-förbättringar, mjukare animationer och UX-puts är alltid välkommet.
- **Tänk efter före**: Om användaren vill ändra kärnlogik eller lägga till stora features ska detta **motiveras och genomtänkas noggrant**. Fråga hellre en gång för mycket än att börja riva i stabil kod.
- **Bygg inte på god-filen**: `src/routes/+page.svelte` är orkestrering — ny logik ska ligga i `src/lib/`. Skapa en ny lib-modul hellre än att utöka +page.
- **Inga kommentarer i kod**: All förklaring ska ligga i dokumentationen eller commit-meddelanden.

---

## Vision (läs detta innan du börjar bygga)

Day Timer ska vara det mest intuitiva sättet att starta ett pass snabbt, planera en dag visuellt, återanvända fungerande upplägg och känna att data och synk är trygga. Användarperspektivet: lärare, ofta stressad, fingrar på iPad mellan barn.

1. **Produktkänsla över teknik.** Trygg, snabb, vacker vinner över "tekniskt korrekt". Friktion är fienden.
2. **Datatrygghet är en feature.** Synk tappar aldrig data, skriver aldrig över i tysthet, säger till vid konflikt. Gå aldrig runt revisions-/sync-modellen.
3. **Enkel kod, tydlig datamodell.** Begreppen (session, mall, block, aktivitet, agenda, workspace, revision) måste vara skarpa. Hellre tråkig kod på rätt modell än smart kod på oklar modell. Begreppsguide: `memory/vocabulary.md`.
4. **Bygg inte in dig i ett hörn.** Lagring (Upstash) och auth ska kunna bytas. Fråga: stänger detta dörrar?
5. **Modulär monolit.** En app, ett backend, tydliga moduler. Inte mikrotjänster.
6. **Polish kör, kärna fråga.** Små UX-vinster kör direkt. Stora omskrivningar av kärnan — motivera och fråga först.
7. **Bygg för 10 → 1000 användare utan ombyggnad.** Inte enterprise från dag ett, men inga shortcuts som måste rivas senare.
8. **Den enkla testen:** Gör det dagens utveckling enklare? Minskar buggrisk? Lämnar dörren öppen för imorgon? Funkar stressat i ett klassrum?

För djupare läsning: `VISION_FRAMEWORK.md` (filosofi), `WORKSPACE_SYNC_ARCHITECTURE.md` (data), `AI_ROADMAP.md` (kommande AI-faser).

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

### Phase D — Meny- & flödesomdesign (juni 2026)
- ✅ **Klockvy**: 2h-vyn borttagen — bara 1h/12h (`clockSpan: 60 | 720`, lagrad 120 migreras till 60 i `normalizePersistedState`).
- ✅ **Kör-läge**: Mittknappen visar ▶/■ (kör/stopp). Klick i agendan släpper inte längre kör-läget; `goToTimerNow` skriver inte över en levande session; sidopanelerna tvingas inte öppna i kör-läge (fällbara); stopp återgår till den meny som var öppen när man startade.
- ✅ **"Nu" som huvudvy**: "Nu"-fliken borttagen ur sektionsraden (huvudvyn ÄR Nu). Planera-knappen öppnar aktuellt pass (som att klicka i agendan) i stället för en tom yta (`openPlan`). Admin-fliken visas bara för admin-användaren.
- ✅ **Mobil**: Planera-vyn visar aktivitetslistan; admin-vyns tomma utrymme fixat.
- ✅ **Minimal Planera-meny**: Editorn nedskalad till kärnan — fält med placeholders, extra info i tooltips, inga versala etiketter/(i)-knappar. Enhetliga knapp-storlekar. "Mall"-etikett och "Faktisk tid & lärande" borttagna. Dagtext-panelen separerad som egen "blob" (kort-bakgrund), tunna linje-avdelare borttagna.
- 📁 **`design/`**: `logik-karta` (struktur-referens för meny-logiken) renderas från `redesign-mockup.html` via `render-mockup.cjs`.

**🔜 Att göra:** Gör vyerna i de andra menyerna (**Bibliotek**, **Konto & AI**) lika **Planera** — samma minimala uttryck: fält med placeholders, extra info i tooltips, inga versala etiketter eller (i)-knappar, enhetliga knapp-storlekar, regioner som egna "blobbar" och inga onödiga linje-avdelare.

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
