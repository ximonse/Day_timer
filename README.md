# Day_timer

Visuell lektions- och dagstimer för lärare. SvelteKit-port av [the_timer](https://github.com/ximonse/the_timer), utbyggd med `Nu`, `Planera`, agenda, kalender och live-delning.

**Deploy:** [Vercel](https://vercel.com) · **Repo:** `ximonse/Day_timer`

---

## Funktioner

### Timer
- SVG-klocka i 1h- eller 12h-vy med sektorer per aktivitet
- Drag-interaktion: justera blockgränser, starttid och sluttid direkt på klockan
- 6 färgpaletter + mörkt läge
- Audio-varning 2 min före + vid segmentslut, flash-overlay
- 11 toggle-alternativ (minuter, labels, hollow, textOutside m.m.)
- Hjälp kan slås av och på globalt med `Alt+i`, och lokala `i`-knappar kan ändå öppna egna texter

### Agenda
- Heldagsplanering med eget textformat (`@datum`, `#Session 09:00`, `Aktivitet 10m`)
- Kompakt kalender med val av dag, även tomma dagar
- Tidslinje-vy med drag för att flytta block, ändra längd och ändra ordning
- Tvåvägssynk: dra i timern → agendan uppdateras, ändra starttid i menyn → agendan uppdateras
- Klicka på ett agendablock → laddar in i timern
- Källstatus som `Mall`, `Import` och `AI` visas diskret och blir tydligare vid hover eller i planeringsläget

### Flöden
- Spara namngivna sessioner (t.ex. "Genomgång 60m")
- Ladda ett flöde → öppnar `Nu` eller `Planera` beroende på sammanhang
- `＋` i Bibliotek lägger till mallen på vald dag
- Snabbstart: skriv rubrik + delar → klicka "Snabbstart nu" → direkt i agendan för idag

### Live-delning (read-only)
- Ägaren klickar "Starta delning" → länk genereras
- Mottagaren öppnar `/?view=TOKEN` → ser timern + agendan i realtid
- Ägaren pushar var 60:e sekund (bara vid faktisk förändring), mottagaren pollar var 30:e sekund
- Pausas automatiskt när fliken är gömd (Page Visibility API)
- Redis TTL 48h — auto-expire om ägaren slutar dela

### Cloud sync
- Kors-enhetssynk via Upstash Redis med valfri lösenfras
- `☁ Spara` / `☁ Ladda` i kontrollpanelen

### AI-planering
- Stöd för OpenAI, Anthropic, Google Gemini och egna modeller
- "Planera med AI" i timerkontrollen (sessionsnivå)
- "AI-dagplan" i agendapanelen för vald dag
- "AI-prompt"-knapp i båda för att kopiera prompten till valfri AI utan API-nyckel

---

## Stack

- **SvelteKit** + TypeScript, Svelte 5 runes (`$state`, `$derived`, `$effect`)
- **@sveltejs/adapter-vercel**
- **Upstash Redis** via `@upstash/redis` (sync + share)
- **Vitest** för enhetstester (`src/lib/*.test.ts`)
- Inga CSS-ramverk

## Env-variabler

```
daytimer_KV_REST_API_URL=      # Upstash Redis REST URL
UPSTASH_REDIS_REST_TOKEN=      # Upstash Redis REST token
```

## Köra lokalt

```sh
npm install
npm run dev
```

## Tester

```sh
npm test
```

## Projektstruktur

```
src/
  lib/
    theme.ts          — clockTheme(), SECTOR_COLORS, labelColorFor()
    state.svelte.ts   — AppState, alla ~20 flaggor, Svelte 5 $state
    clock.ts          — polar(), arcPath(), fmtHM(), nowMinutes(), truncate()
    parse.ts          — parseParts(), serializeBlocks(), parseAgenda(), serializeAgenda()
  routes/
    +layout.svelte    — global CSS
    +page.svelte      — hela UI
    api/sync/         — GET/POST mot Upstash Redis (cross-device sync)
    api/share/        — GET/POST/DELETE för live-delning (Redis, 48h TTL)
    api/plan/         — AI-planering proxy
```

## Inmatningsformat

```
#Morgonrutin          → sessionstitel
Genomgång 10m         → block med tid
Eget arbete           → block utan tid (auto-fördelas)
- ta med boken        → notering på föregående block
& Glöm ej: möte kl 9 → infotext för hela sessionen
```

Dagplan (agendapanelen):
```
@260510
#Lektion 1 08:00
Genomgång 15m
Eget arbete 30m
Avslut 5m

#Rast 08:50
```

## Gränssnitt i korthet

- `Nu` är snabbvägen när du vill köra igång ett pass direkt.
- `Planera` är dagläget med kalender, dagtext och sparknapp längst ner.
- `Bibliotek` innehåller återanvändbara mallar.
- `Konto & AI` samlar synk, API-nycklar och hjälp-/AI-inställningar.
