# Day_timer — Referensdokumentation

Uttömmande katalog över varje vy, panel, knapp, funktion, datastruktur, API och tangentbordsgenväg i `day_timer`. Genererad direkt från koden 2026-05-20.

---

## 1. Översikt

`day_timer` är en visuell dagplanerare och timer byggd i SvelteKit 5. Appen kombinerar:

- Cirkulär SVG-klocka (1h / 2h / 12h) med sektorer per block
- Två redigeringslägen: **Nu** (live) och **Planera** (för dagplan)
- Dagplan med textformat, kalender, tidslinj och ICS-import
- Mallbibliotek (Flows) för återkommande sessioner
- AI-stöd (Claude / OpenAI / Gemini / Custom) för block och dagplaner
- Live-delning och snapshot-delning via Upstash Redis
- Faktisk tid-loggning med rekommendationsmotor
- Cloudsynk mellan enheter
- Interaktiv onboarding (16 steg)

**Stack:** SvelteKit 5 (Runes), Adapter Vercel, Upstash Redis, ren CSS.

---

## 2. Huvudvyer (`AppSection`)

Definieras i `src/lib/state.svelte.ts:4`. Växlas via flikar (`SectionNav`) eller tangentbord.

| Sektion | Etikett | Syfte |
|---------|---------|-------|
| `now` | **Nu** | Köra session live, snabbstart, faktisk tids-bekräftelse |
| `plan` | **Planera** | Bygga en session för en framtida dag i dagplanen |
| `library` | **Bibliotek** | Hantera sparade flowmallar |
| `workspace` | **Konto & AI** | Inloggning, synk, AI-konfig, statistik, hjälptexter |

---

## 3. Tangentbordsgenvägar

Globala (`+page.svelte:1704-1748`):

| Tangent | Effekt |
|---------|--------|
| `N` / `Alt+N` | Gå till Nu |
| `P` / `Alt+P` | Gå till Planera |
| `B` / `Alt+B` | Gå till Bibliotek |
| `K` / `Alt+K` | Gå till Konto & AI |
| `I` / `Alt+I` | Toggla hjälptexter |
| `S` / `Alt+S` | Toggla Skola/Privat dagplan |
| `L` / `Alt+L` | Lås/lås upp (kräver synkkod om inloggad) |
| `Alt+Shift+R` | Fabriksåterställ (med bekräftelse) |
| `Tab` (i parts) | Ny rad med `- ` (anteckning) |
| `Esc` / `Enter` | Stäng inline-redigerare |

Låst läge tvingar agendan till **Skola** och blockerar redigering.

---

## 4. Datamodell (`src/lib/state.svelte.ts`)

### 4.1 `AppState` (rad 57-97)

Visuell timer:
- `blocks: Block[]`, `dayTitle`, `extraInfo`, `startMin`, `endMode: 'end'|'len'`, `clockSpan: 60|120|720`

Utseende:
- `palette: Palette`, `dark`, `hollow`, `textOutside`, `showLeft`, `showCenterEnd`, `showMin`, `showFive`, `showQuarter`, `segMinutesMode: 'off'|'planned'|'remaining'`, `showSegNotes`, `showExtraInfo`, `showSegLabels`, `sbCollapsed`, `showControls`, `showHelpHints`

Dagplan:
- `agendaOpen`, `agendaText`, `agendaDate`, `agendaText2`, `agendaDate2`, `agendaView: 'school'|'private'`, `agendaMeta: Record<string, AgendaFlowMeta>`, `agendaDimPast`

Mallar & synk & lås:
- `flows: Flow[]`, `syncKey`, `isLocked`

Loggning & tillstånd:
- `actualTimeLog: ActualTimeEntry[]`, `activeSection`, `nowDraft`, `planDraft`, `onboardingStep`, `firstVisit`

### 4.2 `Block` (rad 13-20)

```ts
{ id, title, minutes, note, warning, pinned }
```

### 4.3 `Flow` (rad 22-32)

```ts
{ id, title, parts[], minutes[], warnings[], notes[], extraInfo, startMin?, lastUsed? }
```

### 4.4 `ActualTimeEntry` (rad 34-48)

```ts
{ id, date, agendaDate, title, subjectCategory, weekday,
  startMin, endMinActual, durationActualMin,
  dayTextSnapshot, confirmed, confirmedAt, autoFinalized }
```

### 4.5 Agenda-typer (`src/lib/parse.ts`)

- `AgendaDay { date: string|null, flows: Flow[] }`
- `AgendaFlowMeta { source: 'manual'|'template'|'ai'|'import', label?, detail? }`
- `AgendaFlowRef` — referens till ett flow i dagplanen (datum + index + signatur)

### 4.6 Migrationer (`state.svelte.ts:162-194`)

- `theme` → `palette` + `dark`
- `parts` + `minutes` → `blocks[]`
- Äldre sync-tokens → SHA-256-deriverad token

---

## 5. Färgpaletter (`src/lib/theme.ts`)

| ID | Etikett |
|----|---------|
| `sansad` | Sansad (standard) |
| `meadow` | Meadow |
| `mlp` | MLP |
| `bright` | Bright |
| `clear` | Clear |
| `vitgra` | Vitgrå |
| `psychedelic` | Psychedelic |

Varje palett: 8 sektorfärger + bakgrund + textfärger. Mörkläge stöds (utom `psychedelic`).

Exporterade hjälpare: `clockTheme(palette, dark)`, `labelColorFor(palette, idx)`.

---

## 6. Komponenter (`src/lib/components/`)

### 6.1 `SectionNav.svelte`
Fliknavigation mellan de 4 sektionerna. Props: `activeSection`, `labels`, `onSelect`.

### 6.2 `SectionHero.svelte`
Rubrik + brödtext högst upp i varje sektion. Props: `title`, `copy`.

### 6.3 `Clock.svelte` (414 rader)
Cirkulär SVG-klocka.
- **Lägen:** 1h (`clockSpan=60`), 2h (`120`), 12h (`720`)
- **Drag:** Dra block-gräns / start / slut (om inte låst)
- **12h-läge:** Visar dagplanen som bakgrundsband + klickbara agenda-items
- **Emoji-läge:** Om titeln bara är en emoji renderas den stort
- **Markdown:** Stöd i block-titel via `markdown.ts`
- Props: `blocks`, `startMin`, `clockSpan`, `nowMin`, `palette`, `dark`, `hollow`, `textOutside`, `showCenterEnd`, `showMin`, `showFive`, `showQuarter`, `showSegLabels`, `segMinutesMode`, `agendaItems`, `isViewMode`, `locked`
- Callbacks: `onLoadAgendaFlow`, `onStartBoundaryDrag`, `onStartEndDrag`, `onStartStartDrag`

### 6.4 `Sidebar.svelte` (425 rader)
Vänster panel med blocklistan.
- Editerbara fält per block: titel, minuter, anteckning
- Ljudvarnings-checkbox per block
- Lägg till / ta bort block
- `extraInfo`-fält (toggas)
- Synkar tillbaka till `+page.svelte` via `onCommitEdit`

### 6.5 `SessionEditorPanel.svelte` (264 rader)
Wrapper som väljer mellan `NowEditorPanel` och `PlanEditorPanel` baserat på `mode`. Fade-övergång.

### 6.6 `NowEditorPanel.svelte` (114 rader)
- Snabbstart: "Kör!" sätter `startMin` till nuvarande tid
- "Spara flow" → lägg i Bibliotek
- AI-knapp: generera blocks från beskrivning
- Faktisk tid-bekräftelse-UI när session är klar

### 6.7 `PlanEditorPanel.svelte` (338 rader)
- Måldagsväljare (dropdown från dagplanen)
- Tydlig "Spara" vs "Spara som nytt" (penne-badge visar redigerings-läge — flyttad till vänsterkant)
- Källmetadata-visning (template / AI / import)
- Kan välja befintligt block i dagplanen för redigering

### 6.8 `AgendaPanel.svelte` (322 rader)
Höger sidopanel — dagplan.
- **Editor:** Textbaserad (format nedan)
- **Kalender:** 42-cells månadsgrid med densitetsfärg
- **Tidslinj:** Visuell, drag-stöd för flyttning av flows
- **ICS-import:** Öppnar `AgendaImportPanel`
- **AI:** Genererar plan från beskrivning
- Föregående / nästa dag-knappar

### 6.9 `LibraryPanel.svelte` (62 rader)
Lista över sparade flows. Visar `lastUsed`. Knappar: lägg i dagplan, ta bort.

### 6.10 `WorkspacePanel.svelte` (220 rader)
Konto & AI-vyn:
1. **Inloggning** — namn + lösenord, "Synka upp" / "Synka ner"
2. **AI-konfig** — provider, API-nyckel, plan-läge (strict/helpful), base-URL och modell för custom
3. **Statistik** — antal bekräftade entries, reliabilitet, rekommendationsförhandsgranskning
4. **Hjälptexter** — global toggle

### 6.11 `ThemePicker.svelte` (62 rader)
Dropdown med palettförhandsgranskning + mörkläge-toggle.

### 6.12 `OptionsMenu.svelte` (156 rader)
Verktygsmenyns innehåll:
- Cykla klockvy (1h → 2h → 12h)
- Toggla minutmarkörer / 5-min / kvart
- Toggla segment-minuter (off/planned/remaining)
- Toggla segment-anteckningar / etiketter / extraInfo
- Toggla `hollow`, `textOutside`, `showCenterEnd`
- Tema-väljare

### 6.13 `OnboardingTour.svelte` (472 rader)
16-stegs interaktiv guide med spotlight + auto-panel-öppning. Triggas av `firstVisit=true`. Steg täcker: välkommen, klocka, blocks, dagplan, mallar, delning, AI, faktisk tid.

### 6.14 `AgendaImportPanel.svelte` (240 rader)
Modal för ICS-import:
1. Filval / fildragg
2. Förhandsgranskning av parsedade events
3. Bekräfta → slå samman med befintlig dagplan

### 6.15 `PlanSelectionCard.svelte` (116 rader)
Kort som visar valt agenda-block i Planera-läget. Props: `selectedFlow`, `selectedStartMin`, `selectedDate`.

---

## 7. Kärnmoduler (`src/lib/`)

### 7.1 `parse.ts` (299 rader)
| Funktion | Syfte |
|---|---|
| `parseParts(raw, existing?)` | Text → `Block[]` med smart minutfördelning |
| `serializeBlocks(blocks, title?, extraInfo?)` | Block[] → editbar text |
| `parseAgenda(text)` | Dagplan-text → `AgendaDay[]` |
| `serializeAgenda(days)` | AgendaDay[] → text |
| `totalFlowMinutes(flow)` | Summa minuter |
| `mergeAgendaDayData(existing, incoming)` | Slå samman dagplaner (incoming vinner per datum) |

**Textformat (blocks):**
```
# Rubrik          (sätter dayTitle)
Aktivitet 15m
- anteckning
& Extra info
Nästa 20m
```

**Textformat (dagplan):**
```
@260520           (datum YYMMDD)
#Rubrik 08:30     (flow med starttid)
Aktivitet 15m
```

### 7.2 `agenda.ts` (353 rader)
| Funktion | Syfte |
|---|---|
| `buildAgendaItemsForDay(day, startMin)` | Flows → tidsband med faktiska starttider |
| `buildCalendarCells(opts)` | 42-cells månadsgrid med densitet |
| `buildSequentialTimeline(flows, startMin)` | Sekventiella tidsband |
| `computeAgendaDensity(day)` | Färgklass för kalendercell |
| `insertFlowIntoAgendaDate(days, date, flow)` | Lägg flow i dag |
| `replaceAgendaFlowInDays(days, dayIdx, flowIdx, flow)` | Ersätt |
| `findAgendaItemForTime(items, nowMin)` | Vilket block körs nu? |
| `makeAgendaFlowRef`, `resolveAgendaFlowRef` | Stabila referenser till flows |
| `makeAgendaMetaKeyForFlow`, `makeAgendaMetaKeyForRef` | Nyckel för `agendaMeta` |
| `moveAgendaMeta`, `rebuildAgendaMetaForDay` | Underhåll av metadata |
| `agendaMetaLabel`, `agendaMetaHelp`, `agendaMetaSignature` | UI-formattering |
| `serializeSelectedAgendaDay` | För delning |
| `suggestedStartMinForDate(date)` | Default-starttid |
| `cloneAgendaDay` | Djupkopia |

### 7.3 `clock.ts`
| Konstanter | `CX=180`, `CY=180`, `R=155`, `Ri=65` |
|---|---|
| `fmtHM(min)` | `540 → "09:00"` |
| `nowMinutes()` | Tid sedan midnatt |
| `polar(angleDeg, r)` | Vinkel + radie → `{x,y}` |
| `arcPath(a0, a1, rOuter, rInner)` | SVG-bana |
| `truncate(s, n)` | Trunkera med … |
| `isOnlyEmoji(s)` | Detektera emoji-titel |

### 7.4 `date.ts`
| `localDateISO(date?)` | → `YYYY-MM-DD` |
|---|---|
| `parseIsoDate(iso)` | → `Date` |
| `monthKey(date)` | → `YYYY-MM` |
| `shiftMonth(monthIso, delta)` | Navigera |
| `fmtAgendaDate(iso)` | → `Mån 16 maj` |
| `monthLabel(monthIso)` | → `maj 2026` |

### 7.5 `ics.ts`
- `parseIcsEvents(text)` → `IcsEvent[]`
- `icsEventsToAgendaDays(events)` → `AgendaDay[]`
- Heldagsevents hoppas över (känt begränsning)

### 7.6 `ai.ts` (184 rader)
- `requestAiPlan(config, message, mode, context)` → POST `/api/plan`
- `DEFAULT_AI_CONFIG` (Anthropic, helpful-mode)
- `loadAiConfig()` / `persistAiConfig()` / `clearStoredAiConfig()`
- `AI_PROMPT_PARTS` — systemprompt för block
- `getAiPromptAgenda(todayISO)` — systemprompt för dagplan

**Providers:** `'anthropic' | 'openai' | 'gemini' | 'custom'`
**Plan-lägen:** `'strict'` (repetera in-text) / `'helpful'` (förbättra)

### 7.7 `learning.ts`
- `inferSubjectCategory(title)` — Matematik / NO / Språk / Idrott / Måltid / Övrigt
- `computeRecommendation(history, title, category, weekday)` — medianbaserad
- `applyDayTextHeuristic(min, dayText)` — justera (prov +10m, kort dag −5m)
- `toJsonl(entries)` — export

### 7.8 `security.ts`
- `deriveSyncToken(name, pass)` — SHA-256
- `validateSyncToken(token)` — 64 hex
- `createShareTokens()` — view (24 hex) + owner (64 hex)
- `validateShareToken(token)`
- `authorizeShareWrite(record, ownerToken)`
- `sanitizeSharePayload(payload)` — strippa ownerToken

### 7.9 `session.ts`
- `createSessionStateFromFlow(flow, createId, options)`
- `makeFlowFromSession(session, createId)`
- `flowToBlocks(flow, createId, options)`
- `createCurrentFallbackSession(nowMin, createId)`

### 7.10 `share-state.ts`
- `buildLiveShareState(state)`
- `buildSelectedSessionSnapshot(details, state)`
- `buildSelectedDaySnapshot(day, details, state)`
- `applySharedStatePayload(state, payload)`
- `buildSyncPayload(state)`
- `sharedUiStateFromState(state)`

`ShareMode`: `'active-session-live' | 'selected-session-snapshot' | 'selected-day-snapshot'`

### 7.11 `state-normalize.ts`
Normaliserar inkommande state från synk / delning. Migrerar äldre format.

### 7.12 `storage.ts`
sessionStorage-wrapper: `readSessionValue`, `writeSessionValue`, `removeSessionValue` (med try/catch).

### 7.13 `actions.ts`
Svelte-action: `clickOutside(node, callback)`.

### 7.14 `markdown.ts`
- `parseMarkdownHtml(text)` — `**`, `*`, `~~`, `__`, `^...^`, `~...~`
- `parseMarkdownSvg(text)` — för SVG-rendering
- `toggleStrikethrough(text)`

### 7.15 `theme.ts`
- 7 paletter med 8 sektorfärger var
- `clockTheme(palette, dark)` — full färguppsättning
- `labelColorFor(palette, idx)` — chip-färg

---

## 8. API-endpoints (`src/routes/api/`)

### 8.1 `/api/sync` — Cloudsynk
**GET** — `x-sync-token: <64-hex>` → `{ flows, agendaText, agendaDate, agendaText2, agendaDate2, agendaMeta, actualTimeLog }`
**POST** — samma header + JSON-body. Lagras i Upstash som `daytimer:sync:{token}`.

### 8.2 `/api/plan` — AI
**POST** — `{ provider, apiKey, message, mode, context, planMode, baseUrl?, customModel? }`
- `mode: 'parts' | 'agenda'`
- `context: { startMin?, date? }`
- Returnerar `{ text, error? }`

Standardmodeller:
- Anthropic: `claude-haiku-4-5-20251001`
- OpenAI: `gpt-4o-mini`
- Gemini: `gemini-2.0-flash`
- Custom: användardefinierad (OpenAI-kompatibelt)

### 8.3 `/api/share` — Delning
**GET** `?token=...` → snapshot/live-state (utan ownerToken)
**POST** `?token=...` med `x-share-owner: ...` → skapa/uppdatera
**DELETE** `?token=...` med `x-share-owner: ...` → ta bort

Redis-nyckel: `daytimer:share:{viewToken}`. TTL 48h.

---

## 9. Delning — flöden och nycklar

**Lägen:**
1. **Live** (`active-session-live`) — pushas var 60e sek när aktiv. Länk: `/?view={token}`
2. **Session-snapshot** (`selected-session-snapshot`) — fryst block från dagplan
3. **Dag-snapshot** (`selected-day-snapshot`) — hela dagen, 12h-klocka

**Nyckelhjälpare i `+page.svelte`:**
- `shareKeyFromModeAndPayload()`
- `sessionShareKey(flowId)` → `session:{flowId}`
- `dayShareKey(date)` → `day:{date}`

`shareEntries` (per-flow / per-dag tokens) lagras i `localStorage` så samma session får samma länk igen.

URL-parameter `?view=TOKEN` aktiverar `isViewMode=true` → endast läsning, ingen synk.

---

## 10. Faktisk tids-loggning

`+page.svelte:632-699` — `trackActualForActiveAgendaItem()` körs varje sekund:
1. Hitta vilket agenda-item som aktivt nu
2. Skapa/uppdatera matchande `ActualTimeEntry`
3. Vid dagsbyte → auto-finalisera ej bekräftade entries (`autoFinalized=true`)
4. Användare bekräftar via "Spara" i Nu-vyn

Rekommendationsmotor (`learning.ts`):
- Filtrerar bekräftade entries på `subjectCategory` + `weekday`
- Tar median av `durationActualMin`
- Heuristik: `applyDayTextHeuristic` justerar baserat på `dayTextSnapshot`

Reliabilitet i Workspace = `min(bekräftade / 40, 1)`.

---

## 11. State-persistering

| Plats | Vad |
|-------|-----|
| `localStorage["day_timer_v1"]` | Hela `AppState` |
| `localStorage["day_timer_share_entries"]` | Per-flow/dag share-tokens |
| `sessionStorage` | AI-nyckel, temporära synk-token (GDPR) |
| Upstash Redis | Cloudsynk (`daytimer:sync:*`), delning (`daytimer:share:*` 48h TTL) |

---

## 12. URL-parametrar

| Param | Effekt |
|-------|--------|
| `?view=TOKEN` | View-mode för delad session/dag |

---

## 13. Z-index-stack

| Lager | z-index |
|-------|---------|
| Standard UI | 0–100 |
| Onboarding overlay | 10000 |
| Onboarding tooltip | 10001 |
| Welcome overlay | 11000 |

---

## 14. Miljövariabler (deploy)

```
daytimer_KV_REST_API_URL
UPSTASH_REDIS_REST_TOKEN
```

---

## 15. Filöversikt

| Fil | Rader | Syfte |
|---|---|---|
| `src/routes/+page.svelte` | 2792 | Huvudvy + orchestrering |
| `src/lib/state.svelte.ts` | 227 | State + persistering |
| `src/lib/parse.ts` | 299 | Block/agenda-parsing |
| `src/lib/agenda.ts` | 353 | Agenda-manipulering |
| `src/lib/ai.ts` | 184 | AI-integration |
| `src/lib/clock.ts` | — | Klockmatematik |
| `src/lib/date.ts` | — | Datumformat |
| `src/lib/theme.ts` | — | Paletter |
| `src/lib/components/Clock.svelte` | 414 | Klockrendering |
| `src/lib/components/Sidebar.svelte` | 425 | Blockpanel |
| `src/lib/components/AgendaPanel.svelte` | 322 | Dagplan |
| `src/lib/components/OnboardingTour.svelte` | 472 | Guide |
| `src/lib/components/PlanEditorPanel.svelte` | 338 | Planera |
| `src/lib/components/SessionEditorPanel.svelte` | 264 | Wrapper |
| `src/lib/components/WorkspacePanel.svelte` | 220 | Konto & AI |
| `src/lib/components/AgendaImportPanel.svelte` | 240 | ICS-import |
| `src/lib/components/OptionsMenu.svelte` | 156 | Verktygsmeny |
| `src/lib/components/NowEditorPanel.svelte` | 114 | Nu-vy |
| `src/lib/components/PlanSelectionCard.svelte` | 116 | Vald-block-kort |
| `src/lib/components/LibraryPanel.svelte` | 62 | Bibliotek |
| `src/lib/components/ThemePicker.svelte` | 62 | Tema |
| `src/lib/components/SectionNav.svelte` | 21 | Fliknav |
| `src/lib/components/SectionHero.svelte` | 8 | Rubrik |
| `src/routes/api/sync/+server.ts` | — | Synk |
| `src/routes/api/share/+server.ts` | — | Delning |
| `src/routes/api/plan/+server.ts` | — | AI-proxy |

---

## 16. Kända begränsningar

- ICS-import hoppar över heldags-events
- Ingen tidszonshantering — antar lokal tid
- View-mode tillåter ingen redigering tillbaka till ägaren
- Offline fungerar för lokalt arbete; synk/delning kräver nätverk
- Custom AI-provider antar OpenAI-kompatibelt API

---

*Dokumentet speglar koden 2026-05-20. Uppdatera vid större ändringar.*
