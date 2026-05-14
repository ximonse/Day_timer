# Day_timer — Claude Context

## Vad är det här?

`Day_timer` är en SvelteKit-port av [`the_timer`](https://github.com/ximonse/the_timer) — en visuell timer för lärare. Målet är att börja med en **pixel-perfekt, funktionsidentisk kopia** av the_timer, och sedan bygga ut med nya funktioner: 12h-vy, agenda-panel, kalenderimport.

**Källfilen för the_timer:** `/home/user/the_timer/index.html` — läs den när du är osäker på något. Den är sanningskällan.

---

## Varför gjordes detta så här?

En tidigare Claude-session försökte bygga det direkt från en vag beskrivning och misslyckades totalt: fel färger, fel layout, trasig drag-funktion, fel typsnitt. Lösningen: specificera varje värde exakt. En ny session ska kopiera värden från detta dokument — aldrig gissa eller anpassa.

---

## Stack

- **SvelteKit** + TypeScript — Svelte 5 runes (`$state`, `$derived`, `$effect`) genomgående
- **@sveltejs/adapter-vercel** — deployas på Vercel
- **Upstash Redis** via `@upstash/redis` — cross-device sync med lösenfras
- **Inga CSS-ramverk** — CSS custom properties, exakt samma variabler som the_timer

## Env-variabler (Vercel + Upstash)

```
daytimer_KV_REST_API_URL=
UPSTASH_REDIS_REST_TOKEN=
```

---

## Nuläge (vad som är klart)

**Senast uppdaterad: maj 2026**

### Phase A — Klar
- ✅ Layout: sidebar vänster + main höger, kollapsbar sidebar
- ✅ SVG-klocka: exakt samma geometri (360×360, CX/CY=180, R=155, Ri=65)
- ✅ Alla 6 paletter med exakta CSS-variabler och clock theme-värden
- ✅ Dag/natt-toggle (enhetlig `.dark`-klass, ingen per-palett dark-variant)
- ✅ Sektorer: full färg → dämpad på passerat, aktiv sektor delad
- ✅ Tickmärken: vit halo + markfärg (syns på alla sektorfärger)
- ✅ Label-chips: vita (dag) / mörka (natt), dämpar när passerats
- ✅ Drag: segmentgränser, lektionsstart, lektionsslut
- ✅ 11 toggle-pills i popover (⚙︎)
- ✅ Kontrollpanel: titel, quickstart, delar-textarea med parsning, flöden, synk
- ✅ Sidebar: segmentlista, noter, infobox, aktiv/passerad-markering
- ✅ Audio-varningar: 2 min före + vid segmentslut
- ✅ Flash-overlay (orange puls)
- ✅ Hjälp-modal
- ✅ Mobilresponsiv (<800px: sidebar under klockan)
- ✅ localStorage-persistens (`day_timer_v1`)
- ✅ Cloud sync via `/api/sync` → Upstash Redis (prefix `daytimer:`)

### Phase B — Implementerat
- ✅ **Klockvy 1h/2h/12h** — `s.clockSpan: 60 | 120 | 720`, cykling via toolbar-knapp; klockvisaren dämpas om nuvarande tid är utanför vyn
- ✅ **Agenda-panel** (höger kolumn) — tidslinje med drag-gränser per block (övre halvan = starttid, undre = sluttid, höger halva = scroll-safe)
- ✅ **Timer↔Agenda-synk** (tvåvägs):
  - Dra i timern → agendablock uppdateras
  - Ändra starttid i menyn → agendablock uppdateras
  - Klicka agendablock → laddar in i timern, `activeAgendaFlow` trackas
  - Spara ny dagplan → auto-laddar aktuellt tidsblock i timern
- ✅ **Snabbstart → Agenda** — klick på "Snabbstart nu" skapar agendablock för idag
- ✅ **Ladda flöde → Agenda** — laddar man ett sparat flöde läggs det in i agendans idag-post
- ✅ **Klocktid klickbar** — klick på `HH:MM` hoppar till aktuellt block eller timme
- ✅ **Live-delning** (`/api/share`) — ägare genererar token, mottagare öppnar `/?view=TOKEN`; read-only vy, 30s poll, 60s push, bara vid ändring, pausar med Page Visibility API
- ✅ **AI-planering** — OpenAI/Anthropic/Gemini/custom för session och heldagsplan; "Kopiera prompt"-knapp utan API-nyckel
- ✅ **Onboarding** — steg 1/2/3 med nummerbrickor i kontrollpanelen; öppnas automatiskt vid första besöket

**Git:** `main`-branchen på `https://github.com/ximonse/Day_timer.git`

---

## Projektstruktur

```
src/
  lib/
    theme.ts          — clockTheme() + SECTOR_COLORS + labelColorFor()
    state.svelte.ts   — AppState med alla ~20 flaggor, Svelte 5 $state
    clock.ts          — polar(), arcPath(), fmtHM(), nowMinutes(), truncate()
    parse.ts          — parseParts(), serializeBlocks(), parseAgenda(), serializeAgenda()
  routes/
    +layout.svelte    — global CSS
    +page.svelte      — hela UI: sidebar + main + agenda + toolbar + modals (~1700 rader)
    api/sync/
      +server.ts      — GET/POST mot Upstash Redis (cross-device sync)
    api/share/
      +server.ts      — GET/POST/DELETE för live-delning (Redis TTL 48h)
    api/plan/
      +server.ts      — AI-planering proxy (OpenAI/Anthropic/Gemini/custom)
```

---

## SVG-konstanter (ÄNDRA INTE)

```typescript
const CX = 180, CY = 180;   // centrum i 360×360 viewBox
const R  = 155;              // ytterradie
const Ri = 65;               // inre radie (munkhålet)
// viewBox="0 0 360 360"
```

---

## Typsnitt

**Body:** `-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`  
**Toolbar-ikoner:** `"Segoe UI Symbol", "Apple Symbols", system-ui, sans-serif; font-variant-emoji: text`

---

## CSS custom properties — per palett

`:root` (= sansad dag):
```css
--bg:#f4f1de; --fg:#3d405b; --panel:#ece9d5; --border:#c8c5b5;
--muted:#81b29a; --accent:#e07a5f; --pill:#e8e5d8;
--pill-on:#3d405b; --pill-on-fg:#f4f1de; --void:#3d405b;
```
`.dark` (alla paletter — EN gemensam override, inga per-palett dark-varianter):
```css
--bg:#1c1a16; --fg:#ede8dc; --panel:#26231e; --border:#3c3830;
--muted:#8a8478; --accent:#ede8dc; --pill:#2e2b26;
--pill-on:#ede8dc; --pill-on-fg:#1c1a16; --void:#0e0d0b;
```
`.meadow`:
```css
--bg:#f4f1de; --fg:#2a3a10; --panel:#e5e8d0; --border:#a8c080;
--muted:#5c8001; --accent:#fb6107; --pill:#e5e8d8;
--pill-on:#5c8001; --pill-on-fg:#f4f1de; --void:#2a3a10;
```
`.mlp`:
```css
--bg:#fff5fb; --fg:#5a3070; --panel:#f8eaf8; --border:#d4a0e8;
--muted:#8080b0; --accent:#ffafcc; --pill:#f0e0f8;
--pill-on:#cdb4db; --pill-on-fg:#5a3070; --void:#5a3070;
```
`.bright`:
```css
--bg:#f4f1de; --fg:#1a0820; --panel:#e8e5d8; --border:#c0a0b8;
--muted:#662e9b; --accent:#f86624; --pill:#e8e5d8;
--pill-on:#662e9b; --pill-on-fg:#f4f1de; --void:#1a0820;
```
`.clear`:
```css
--bg:#f9f2ee; --fg:#5f0f40; --panel:#ede5e0; --border:#c09888;
--muted:#0f4c5c; --accent:#fb8b24; --pill:#ede5e0;
--pill-on:#5f0f40; --pill-on-fg:#f9f2ee; --void:#5f0f40;
```
`.psychedelic`:
```css
--bg:#ff00ff; --fg:#ffffff; --panel:rgba(255,255,0,.12); --border:#ff00ff;
--muted:#ffff00; --accent:#ff00ff; --pill:rgba(0,255,255,.15);
--pill-on:#ffff00; --pill-on-fg:#000000; --void:#050010;
```

Menyvariabler (kontrollpanel, popover) börjar med `--menu-` och är definierade i `:root` i `+layout.svelte`.

---

## Sektorfärger — 8 per palett

```typescript
COLORS_SANSAD = ['#e07a5f','#3d405b','#81b29a','#f2cc8f','#c05840','#6a6e90','#5a9278','#d8b870']
COLORS_MEADOW = ['#fb6107','#f3de2c','#7cb518','#5c8001','#fbb02d','#d94e05','#a0d028','#f09010']
COLORS_MLP    = ['#cdb4db','#ffc8dd','#ffafcc','#bde0fe','#a2d2ff','#b898d0','#ff90b8','#80c8f8']
COLORS_BRIGHT = ['#f9c80e','#f86624','#ea3546','#662e9b','#43bccd','#d4a808','#c44818','#8840c0']
COLORS_CLEAR  = ['#5f0f40','#9a031e','#fb8b24','#e36414','#0f4c5c','#8a1560','#c20428','#d46010']
COLORS_PSY    = ['#ff00ff','#ff0000','#ff8800','#ffff00','#00ff44','#00ffff','#4400ff','#ff00aa']
```

---

## clockTheme() — renderingsvärden

Gemensamt mörkt objekt (alla paletter i mörkt läge, utom psychedelic):
```typescript
DARK_CLOCK = {
  bg:'#1c1a16', dimSuffix:'55', grayPast:'#3a3830',
  mark:'#c8c4bc', centerMain:'#ede8dc', centerMuted:'#8a8478',
  handDark:'#ede8dc', handLight:'#1c1a16', chip:'#1c1a16dd',
}
```

Dag-varianter (chip är alltid `#ffffffee` för alla dag-paletter):
```
sansad:  bg#f4f1de  dimSuffix'40'  grayPast#c5c2b8  mark#3d405b  centerMain#3d405b  centerMuted#81b29a  handDark#3d405b  handLight#f4f1de
meadow:  bg#f4f1de  dimSuffix'40'  grayPast#c8c8b8  mark#2a3a10  centerMain#2a3a10  centerMuted#5c8001  handDark#2a3a10  handLight#f4f1de
mlp:     bg#fff5fb  dimSuffix'40'  grayPast#e8d8e8  mark#5a3070  centerMain#5a3070  centerMuted#8080b0  handDark#5a3070  handLight#fff5fb
bright:  bg#f4f1de  dimSuffix'40'  grayPast#c8c0c8  mark#1a0820  centerMain#1a0820  centerMuted#662e9b  handDark#1a0820  handLight#f4f1de
clear:   bg#f9f2ee  dimSuffix'40'  grayPast#c8c0b8  mark#5f0f40  centerMain#5f0f40  centerMuted#0f4c5c  handDark#5f0f40  handLight#f9f2ee
psychedelic (ingen natt): bg#00000066  dimSuffix'66'  grayPast#1a0033  mark#fff  centerMain#fff  centerMuted#ffff00  handDark#fff  handLight#00001a  chip#00000088
```

---

## Klockan — teknisk rendering

```
SVG: 360×360, CX=180, CY=180, R=155, Ri=65
startAngle = ((startMin % 60) / 60) * 360
```

**Aktiv sektor** ritas i två delar:
- `[a0 → splitAngle]` med `color + dimSuffix` (passerad del)
- `[splitAngle → a1]` med `color` (kvarvarande del)
- `splitAngle = startAngle + (elapsed / 60) * 360`

**Tickmärken:** vit halo (stroke=`#fff`, bredd+2.5, opacity 0.38) + markfärg ovanpå.

**Label-chips:** chip-värdet som bakgrund, `labelColorFor()` som textfärg. Dämpar vid `isPast`.

**Pointer-arm:** polygon-spike, bas 22px vid innerR=30, spets vid R+2. fill=handDark, stroke=handLight.

---

## Datamodell

```typescript
interface Block {
  id: string; title: string; minutes: number;
  note: string; warning: boolean; pinned: boolean;
}

interface AppState {
  palette: Palette; dark: boolean; blocks: Block[];
  dayTitle: string; extraInfo: string; startMin: number;
  endMode: 'end' | 'len'; syncKey: string;
  showLeft: boolean; showCenterEnd: boolean; hollow: boolean;
  textOutside: boolean; showMin: boolean; showFive: boolean;
  showQuarter: boolean; segMinutesMode: 'off'|'planned'|'remaining';
  showSegNotes: boolean; showExtraInfo: boolean; showSegLabels: boolean;
  sbCollapsed: boolean; showControls: boolean; flows: Flow[];
}

interface Flow {
  id: string; title: string; parts: string[]; minutes: number[];
  warnings: boolean[]; notes: string[]; extraInfo: string;
}
```

localStorage-nyckel: `day_timer_v1`

---

## Inmatningsformat

```
#Morgonrutin      → dayTitle
Vakna 5m          → block, 5 min (pinned)
Frukost 20m       → block, 20 min (pinned)
- ta med vatten   → note på föregående block
Promenad          → block, minuter auto-fördelas
& Möte kl 9       → extraInfo
```

---

## Verifieringschecklista (Phase A)

Stämmer dessa av mot the_timer (`/home/user/the_timer/index.html`) innan du bygger vidare:

- [ ] Sidebar synlig, kollapsbar, 48px-textrader i segmentlista
- [ ] Klocka: viewBox 360×360, CX/CY=180, R=155, Ri=65
- [ ] Alla 6 paletter: rätt färger dag och natt
- [ ] Sektorer: full färg → dämpad på passerat (INTE tvärtom)
- [ ] Aktiv sektor korrekt delad (dämpad bak, full fram)
- [ ] Tickmärken synliga på alla sektorfärger (vit halo)
- [ ] Labels dämpar när blocket passerats
- [ ] Drag ändrar sektorer och sparas
- [ ] 11 toggle-pills uppdaterar UI direkt
- [ ] Varningar triggar vid rätt tidpunkt med ljud + flash
- [ ] Mobilvy korrekt (<800px)

---

## Phase B — Status

### Klart
- ✅ B1: Klockvy 1h/2h/12h (`clockSpan: 60|120|720`)
- ✅ B2: 12h-vy med timvisare, dämpas utanför vyn
- ✅ B3: Agenda-panel med tidslinje och drag
- ✅ B7: Live-delning via Redis (`/api/share`, `?view=TOKEN`)

### Kvar (möjliga nästa steg)

**B4: Redigera block direkt**
- Long-press på block i sidopanelen → inline edit (titel, tid)
- Drag-to-reorder i sidopanelen

**B5: Emoji-stöd**
- Titel = bara emoji → visa den stor (48px) i klocksektorn

**B6: Bibliotek**
- Färdiga rutiner (Lektion 60m, Morgon, Kväll)
- UI: rullgardin eller panel i kontrollpanelen

**B8: Kalenderimport**
- ICS-fil eller Google Calendar URL → importera som agendablock

---

## Designprinciper

- Enkel yta, kraftfulla funktioner under — avancerat ska gå att gräva fram
- Inte överklottrad — varje ny feature måste motiveras
- Samma visuella språk som the_timer — klock-SVG, sektorfärger, chip-etiketter
- Snabb att använda — primärflödet under 10 sekunder

---

## Koppling till the_timer

- Repot: `ximonse/the_timer` (en HTML-fil, vanilla JS, Vercel, berörs inte)
- Delar: teman, färgpaletter, klock-logik, inmatningsformat
- Skiljer sig: the_timer = 1h fokustimer. Day_timer = utbyggbar dagplanering
- Ska kännas som samma app-familj grafiskt

---

## Teknisk skuld — beslutad strategi

Från kodanalys (maj 2026). Prioritering och beslutsrationale nedskrivet för att inte återupptäckas.

### Gör nu
- **Tester för `parse.ts` och `clock.ts`** — rena funktioner, inga beroenden, hög risk att tyst gå sönder. Vitest installerat, tester i `src/lib/*.test.ts`.

### Gör inkrementellt (inte som eget projekt)
- **Extrahera komponenter ur `+page.svelte`** (1500+ rader) — bryts ut naturligt när delar ändå ska växa. Närmast: AI-panelen (förändras när AI-distributionen löses) och AgendaPanel. Aldrig ett "refaktoreringssprint" — alltid kopplat till faktisk feature-work.

### Lämna tills vidare
- **`renderClock()` som imperativ DOM-manipulation** — 250 rader `document.createElementNS` inuti Svelte. Fungerar, är klockans kärna, full omskrivning till deklarativ SVG är ett stort riskfyllt jobb utan tillräcklig motivering just nu.

### Löst
- ✅ TypeScript-fel: `planMode` saknades i `clearAiConfig()` och gammal-nyckel-migrering
- ✅ Env-variabel i sync: `UPSTASH_REDIS_REST_TOKEN` (inte `daytimer_KV_REST_API_TOKEN`)
- ✅ Hjälptext API-nyckel: formulering korrigerad
- ✅ Agenda↔Timer-synk: tvåvägs via `activeAgendaFlow` + `syncTimerToAgenda()`
- ✅ Spara dagplan slår igenom direkt (auto-laddar rätt tidsblock)
- ✅ Redis-förbrukning: Page Visibility API + hash-diff + längre intervall (60s/30s)

### Känd skuld som accepterats
- `(hit as any)._boundaryIdx` — drag-state på DOM-element. Pragmatiskt, funkar i nuvarande renderingsmodell.
- Inga tester för `renderClock()` — omöjligt utan att skriva om den, och omskrivning är inte prioriterad.
- Sync utan konflikthantering — medvetet designval för nu (delad lösenfras-modell).

### Testramverk
- **Vitest** — kör med `npm test`
- Testfiler: `src/lib/parse.test.ts`, `src/lib/clock.test.ts`
