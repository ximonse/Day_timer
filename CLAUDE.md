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

## Nuläge (Klar juni 2026)

### Phase A — Grunden
- ✅ Layout & SVG-klocka (Pixel-perfekt kopia)
- ✅ 7 Paletter (sansad, meadow, mlp, bright, clear, vitgra, psychedelic)
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
- ✅ **Minimal Bibliotek & Konto & AI**: `LibraryPanel`/`WorkspacePanel` följer redan Planeras minimala uttryck — inga versala etiketter, inga linje-avdelare, regioner via delade `plan-editor`-klassen, och `i`-knapparna är den globala info-toggle (`showInfo={s.showHelpHints}`), inte per-fält-(i). Klart via menyomdesign-commitsen.
- ✅ **Flow execution**: Aktiviteter kan markeras klara i sekvens under körning. Stöd för `runUntilChecked`-block (flexibla slutpunkter). Fördröjd avprickningsvy med 4-sekunders ångerfönster.
- 📁 **`design/`**: `logik-karta` (struktur-referens för meny-logiken) renderas från `redesign-mockup.html` via `render-mockup.cjs`.

**🔜 Eventuell rest (litet, ej brådskande):** Planeras dagtext-panel sitter i en `menu-blob` (kort-bakgrund); `LibraryPanel`/`WorkspacePanel` wrappas i en vanlig `<div>` utan blob. Att ge dem samma blob-kort vore enda kvarvarande visuella skillnaden — bedöm med ögat innan det görs.

---

## Stack & Teknik

- **SvelteKit 5** (Runes: `$state`, `$derived`, `$effect`)
- **Adapter Vercel** + **Upstash Redis** (Sync/Share)
- **Inga CSS-ramverk**: Allt är ren CSS (Custom Properties)
- **AI**: `@anthropic-ai/sdk`, `openai`, `@google/genai` (server-side API-proxies)
- **Test**: Vitest (unit, 70+ testfiler) + Playwright (e2e)
- **Z-index**: Onboarding overlay (10000), Tooltip (10001), Welcome Overlay (11000)

---

## Projektstruktur

```
src/
  lib/
    components/          — UI-komponenter (Svelte)
    server/
      ai-shared.ts       — Server-side AI-hjälpfunktioner
    state.svelte.ts      — AppState (Sanningen om appens tillstånd)
    state-normalize.ts   — Migrering & standardvärden vid inladdning
    parse.ts             — Text-parsing för sessioner/dagtexter
    clock.ts             — SVG-klockans geometri, tid, formattering
    clock-geometry.ts    — Avancerad SVG-matematik
    clock-halfday.ts     — 12-timmarsvyns specifika logik
    theme.ts             — Paletter, färger, CSS-teman
    date.ts              — Datumhjälpfunktioner
    agenda.ts            — Agendamodell och dagbygge
    agenda-actions.ts    — Muteringar på agendatext
    agenda-layout.ts     — Visuell layout och densitetsberäkning
    session.ts           — Block-/sessionsoperationer
    session-agenda-binding.ts — Session ↔ Agendasynk
    active-session-binding.ts — Aktivt pass-tracking
    flow-runtime.svelte.ts   — Körlägets reaktiva tillstånd (Runes)
    flow-execution.ts    — Körlägets logik och tillståndsmaskin
    flow-actuals.ts      — Faktisk tidlogg under körning
    flow-agenda.ts       — Agendabindning för flows
    flow-display.ts      — Visualisering av körläge
    workspace.ts         — Workspace-datamodell och serialisering
    workspace-snapshots.ts — Snapshot-versionshantering
    workspace-snapshot-store.ts — Snapshotlagring
    share-state.ts       — Live-delningens tillstånd och tokens
    share-entries.ts     — Delningsposterhantering
    storage.ts           — localStorage-wrapper
    autosave.ts          — Beslut om när autosync ska ske
    sync-source.ts       — Spårning av sync-händelser
    sync-load-decision.ts — Konfliktlösning vid laddning
    security.ts          — Krypto: sync-tokens, share-tokens
    ai.ts                — AI-konfiguration och lagring
    ai-plan-engine.ts    — AI-planeringslogik och promptbygge
    planner-ai.ts        — AI-konversationsbygge
    actuals.ts           — Tidloggposter
    learning.ts          — Mönsterinlärning från historik
    day-plan.ts          — Dagplaneringshjälpare
    ics.ts               — ICS-kalenderimport
    schedule-import.ts   — Schemaimport
    unified-import.ts    — Importtypsdetektering
    voice.ts             — Rösttranskription
    run-mode-decisions.ts — Körlägets tillståndslogik
    run-menu-decisions.ts — Menyöppning/-stängning i körläge
    markdown.ts          — Markdown-rendering
    title-color.ts       — Titelfärgdirektiv
    actions.ts           — DOM-actions
    index.ts             — Barrel-export
  routes/
    +layout.svelte       — Global layout, CSS-variabler
    +page.svelte         — Huvudvyn (~4400 rader, orkestrering)
    api/
      plan/+server.ts    — AI-planeringsändpunkt
      sync/+server.ts    — Workspace-sync (Redis)
      sync/rev/+server.ts
      sync/snapshots/+server.ts
      sync/restore/+server.ts
      share/+server.ts   — Live/snapshot-delning
      schedule/+server.ts — Schemaparsing
      transcribe/+server.ts — Röst-till-text
      admin/invites/+server.ts
      upgrade/+server.ts
design/
  logik-karta.png        — Menylogikflödesschema
  redesign-mockup.html   — UI-mockup
  render-mockup.cjs      — Mockuprendererare
docs/
  SAVE_AND_SYNC_RULES.md — Kontrakt för spara/sync-beteende
  FUTURE_SEGMENTS.md
  SAVE_AND_RUN_FLOW_REVIEW.md
  superpowers/plans/     — Implementationsplaner per feature
  superpowers/specs/     — Specifikationer
tests/                   — Vitest-tester
e2e/                     — Playwright e2e-tester
```

---

## Datamodell (snabbreferens)

```typescript
// Grundblock i en session
Block {
  id: string          // uid() — 7 tecken, slumpmässig
  title: string
  minutes: number
  note: string
  warning: boolean    // rött varningsblock
  pinned: boolean     // låst tid (auto-allokeras inte om)
  runUntilChecked?: boolean  // flexibel slutpunkt
}

// Mall i biblioteket
Flow {
  id: string
  title: string
  parts: string[]     // aktivitetsnamn
  minutes: number[]   // minuter per aktivitet
  warnings: boolean[]
  notes: string[]
  runUntilChecked?: boolean[]
  extraInfo: string
  startMin?: number   // förreslagd starttid
  lastUsed?: number   // timestamp
}

// Loggad faktisk tid
ActualTimeEntry {
  id: string          // makeActualEntryId(date, startMin, title)
  date: string        // 'YYYYMMDD'
  agendaDate: string | null
  title: string
  subjectCategory: string
  weekday: number
  startMin: number
  endMinActual: number
  durationActualMin: number
  dayTextSnapshot: string
  confirmed: boolean
  confirmedAt: number | null
  autoFinalized: boolean
  entryKind?: 'session' | 'activity'
  executionMode?: 'timed' | 'flow'
  plannedDurationMin?: number
  sessionTitle?: string
  blockId?: string
}

// Redigeringslägets utkast (Nu eller Planera)
EditorDraft {
  dayTitle: string
  blocks: Block[]
  extraInfo: string
  startMin: number    // minuter sedan midnatt
}
```

**AppState** (`state.svelte.ts`) innehåller allt ovan plus:
- `palette: Palette` — aktiv färgpalett
- `dark: boolean` — mörkt läge
- `clockSpan: 60 | 720` — 1h eller 12h-vy
- `activeSection: 'now' | 'plan' | 'library' | 'workspace' | 'admin'`
- `agendaText / agendaText2` — skolans och privat dagplan
- `flows: Flow[]` — mallbiblioteket
- `actualTimeLog: ActualTimeEntry[]` — tidhistorik
- `syncKey: string` — auth-token för Redissynk
- `currentRevision: number` — konfliktdetektion

---

## Textformat för sessioner (parse.ts)

`parseParts(raw, existingBlocks)` tolkar en enkel textformat:

```
# Dagstitel

Aktivitetsnamn 45m
- noteringsrad
- en till notering

Aktivitet utan tid
& kommentar (kopplas till föregående aktivitet)
& en till kommentar

Flexibel aktivitet %min

&& Extra info (dag-nivå, syns under timern)
```

- `45m` — explicit tid; utan suffix auto-fördelas minuter
- `%min` eller `%` — `runUntilChecked: true` (aktiviteten slutar när användaren checkar av)
- `& text` — notering kopplad till föregående block
- `&& text` — `extraInfo`, dag-nivå
- `# text` — dagstitel
- Block-IDn bevaras vid re-parsning om `existingBlocks` skickas in

---

## Arkitekturmönster

### Tillståndsuppdateringar

```typescript
// Rätt — alla mutationer via appState.update()
appState.update({ blocks: newBlocks, dayTitle: 'Ny titel' });

// appState.value ger reaktiv läsåtkomst
const currentBlocks = appState.value.blocks;
```

`appState.update()` → persisterar till `localStorage` → triggar debounced Redis-sync.

### Sparande & sync (se docs/SAVE_AND_SYNC_RULES.md)

- **localStorage**: omedelbart vid varje ändring
- **Redis/Upstash**: debouncat (kort paus efter sista tangenttrycket), eller direkt vid explicita gränser (drag-slut, sektionsbyte, run-toggle)
- **Aldrig**: duplicerade POST för samma workspace-hash; överskrivning av osparad dagtext
- **Revisionskontroll**: 409 vid konflikter — klienten avgör merge

### Komponentkommunikation

- `$bindable()` för tvåvägsdata
- Callback-props (`onCommitEdit`, `onToggleSegmentDone`)
- Delad `appState`-singleton

### Körläge (flow execution)

Två körlägen:
- `'timed'` — klassisk timer med fasta blockvaraktigheter
- `'flow'` — flexibel avprickning, varje block markeras klart

`flow-runtime.svelte.ts` håller det reaktiva körlägestillståndet; `flow-execution.ts` innehåller tillståndsmaskinen.

---

## API-ändpunkter

| Route | Metod | Funktion |
|---|---|---|
| `/api/plan` | POST | AI-planering via Claude/GPT/Gemini |
| `/api/sync` | GET | Hämta workspace + userLevel |
| `/api/sync` | POST | Spara med revisionskontroll |
| `/api/sync/snapshots` | GET/POST/DELETE | Snapshot-historik |
| `/api/sync/restore` | POST | Återställ till snapshot |
| `/api/share` | GET/POST/DELETE | Live/snapshot-delning (TTL 48h) |
| `/api/schedule` | POST | Importera och parsa schema |
| `/api/transcribe` | POST | Röst-till-text |
| `/api/admin/invites` | POST | Inbjudningshantering |

**Auth**: `x-sync-token` header (SHA-256 av `namn:lösenord`, 64-char hex).

**AI-standardmodeller**: `claude-haiku-4-5-20251001` (Anthropic), `gpt-4o-mini` (OpenAI), `gemini-2.0-flash-lite` (Google).

---

## Live-delning

Tre delningslägen:
1. `'active-session-live'` — realtidsklocka under ett aktivt pass
2. `'selected-session-snapshot'` — fryst 1-timmes bild av ett agendaobjekt
3. `'selected-day-snapshot'` — fryst 12-timmes bild av hela dagen

Tokens: `createShareTokens()` → `{viewToken (24 hex), ownerToken (64 hex)}`. Vy-URL: `/?view=TOKEN` — skrivskyddat.

---

## Temasystem

**7 paletter**: `'sansad' | 'meadow' | 'mlp' | 'bright' | 'clear' | 'vitgra' | 'psychedelic'`

- `SECTOR_COLORS[palette]` → 8-färgsarray för klocksektorer
- `clockTheme(palette, dark)` → `ClockTheme` med alla färger
- CSS-variabler: `--bg`, `--fg`, `--panel`, `--border`, `--muted`, `--accent`, `--pill`

SVG-klockans konstanter (från `clock.ts`): `CX=180, CY=180, R=155, Ri=65`

---

## Testmiljö

```bash
npm test           # vitest run (alla enhetstester)
npm run test:watch # vitest interaktivt
npm run test:e2e   # playwright e2e
npm run check      # svelte-check typcheckning
```

70+ testfiler i `src/lib/*.test.ts` med Vitest (node-miljö).

---

## Designprinciper

- **Enkel yta, djup under**: Avancerade saker döljs bakom `⚙` eller `✎`.
- **Snabbhet**: Från tanke till startad timer på <10 sekunder.
- **Visuellt språk**: Samma som the_timer (sektorfärger, chip-etiketter).
- **Motivation**: Varje ny feature måste ha ett tydligt "varför".
