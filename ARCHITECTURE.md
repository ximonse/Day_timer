# ARCHITECTURE — beroendekarta & kontrakt

> Pekar-karta över delar som **tyst går sönder** när annan kod ändras. Läs den relevanta sektionen innan du rör ett subsystem. Format: pekare (`fil:funktion`) + **Kontrakt** (invarianter som inte får brytas). Lägesbeteende: se `MODES.md`. Datalagring/synk: `WORKSPACE_SYNC_ARCHITECTURE.md`, `docs/SAVE_AND_SYNC_RULES.md`.

---

## Pass-/agenda-format (kontraktet flera delar hänger på)

- `parse.ts`: `parseParts` (pass-text → block), `parseAgenda` (dagtext → `AgendaDay[]`), `serializeBlocks`, `serializeAgenda`.
- Syntax: `# Titel` · `Xm` tid · `%` kör-tills-avbockad · `- rad` / `& rad` not · `&& rad` passinfo · `@YYMMDD` datum · `#Rubrik HH:MM` / `HH:MM-HH:MM` sessionsstart · `<!--id:UUID-->` flow-id.
- **Kontrakt:** parse↔serialize är idempotent. `startMin` lagras alltid 0–1439 (pass förbi midnatt fördelas till nästa dag, se Agenda). Ändrar du syntaxen här måste AI-prompterna (nedan) följa med — de lär ut samma format.
- Tester: `parse.test.ts` (58 fall).

---

## Statistik / rekommendationer

- Datashape: `state.svelte.ts` → `ActualTimeEntry` (`entryKind?: 'session' | 'activity'`, `executionMode?`, `confirmed`, `durationActualMin`, `subjectCategory`, `weekday`, `blockId?`).
- Skrivare:
  - Session-poster: `+page.svelte:trackActualForActiveAgendaItem` (okonfirmerade medan agenda-pass körs) → `actuals.ts:upsertActualEntry`; bekräftas vid dygnsbyte via `actuals.ts:finalizeUnconfirmedForDate`.
  - Activity-poster: `+page.svelte:completeFlowBlockNow` → `flow-actuals.ts:makeFlowActualEntry` (alltid `confirmed:true`, `entryKind:'activity'`, `executionMode:'flow'`).
- Läsare: `learning.ts:computeRecommendation` → `+page.svelte` derived `suggestedDuration` → visas i `PlanEditorPanel`/`SessionEditorPanel` (★-förslag).
- Hjälp: `learning.ts:inferSubjectCategory`, `applyDayTextHeuristic`, `median`.
- **Kontrakt:** `computeRecommendation` använder **endast** poster med `confirmed && durationActualMin > 0 && entryKind !== 'activity'`. Flow-aktiviteter exkluderas medvetet från sessionsrekommendationer (annars förorenar per-aktivitet-tider sessionsmedianen). Ändras `entryKind`-värden, `confirmed`-flödet eller filtret → uppdatera vakt-testet.
- Tester: `learning.test.ts`, `actuals.test.ts`, `flow-actuals.test.ts`.

---

## AI-prompter (kopierbara + API)

- Promptmallar: `ai.ts` → `getAiPromptParts` (pass/notes), `getAiPromptAgenda`, `getAiPromptStrictFormat`, `getAiPromptHelpfulQuestions`, `AI_PROMPT_CALENDAR_CONVERT`.
- Routing: `ai.ts:getAiSessionPrompt(mode, todayISO, totalMin?)` och `getAiAgendaPrompt(mode, todayISO)`; `mode: AiAgendaPromptMode` (`ai-plan-engine.ts`), nivå→läge via `ai-plan-engine.ts:flexibilityToModes`.
- API-väg: `ai.ts:requestAiPlan` → `api/plan/+server.ts` → `ai-plan-engine.ts:buildAiPlanSystemPrompt` → `normalizeAiPlanResponse` / `reviewAiPlanResponse`.
- Kopierbar prompt: `+page.svelte` derived `currentAiPrompt` (= `getAiSessionPrompt(...)`) + `onCopyPrompt`; knapp i `PlanEditorPanel`/`SessionEditorPanel`.
- **Kontrakt:** prompterna lär ut samma format som `parse.ts` läser.
  - Sessionsprompter (alla lägen): innehåller tids-token `Xm`, `-` (underpunkter), `&&` (passkommentar). Inga datumrader/`#`.
  - Agendaprompter (alla lägen): innehåller `@` (datum), `#` (sessionsrubrik), `-`, `&&`.
  - `buildAiPlanSystemPrompt` har en **tidsspärr**: AI får aldrig ändra `#`-rubrikens HH:MM.
- Tester: `ai-plan-engine.test.ts`, `ai-format-contract.test.ts` (vaktar format-tokens i prompterna).

---

## Agenda & dygnsgräns

- Modell: `parse.ts:AgendaDay` (`date`, `flows: Flow[]`, varje flow ev. `startMin`). Layout: `agenda.ts:buildAgendaItemsForDay`, `agenda-layout.ts:buildAgendaLayout/buildAgendaLayoutWindow`.
- Dygnsgräns: `agenda.ts:redistributeFlowsAcrossDays` flyttar pass vars start ≥ 1440 till nästa dag (kaskad). Körs via `+page.svelte` lokala `serializeAgenda`-wrappern vid varje agenda-serialisering. Fönstret förlängs förbi 24:00 så straddlande pass ritas helt (`buildAgendaLayoutWindow`).
- Live-shift i flow: `flow-agenda.ts:adjustAgendaItemsForFlowRun` skjuter följande block framåt vid övertid.
- **Kontrakt:** lagrade `startMin` är alltid 0–1439 (annars trasig serialisering, t.ex. 24:30). Ett pass syns på den dag det **startar**.
- Tester: `agenda.test.ts`, `agenda-layout.test.ts`, `flow-agenda.test.ts`.

---

## Flow-körning (genomförande)

- Domän: `flow-execution.ts` (ren logik). Runtime: `flow-runtime.svelte.ts` (enhetslokal, `localStorage`). Beteende: `MODES.md`.
- **Kontrakt:** avklarad aktivitet krymper till faktisk tid, sparad tid → platshållare i slutet; vid avslut skrivs faktiska tider till `s.blocks` och synkas ut. Originalplanens tider skrivs aldrig över i tysthet under körning.
- Tester: `flow-execution.test.ts`.

---

## Synk & sparning

- `WORKSPACE_SYNC_ARCHITECTURE.md` + `docs/SAVE_AND_SYNC_RULES.md`. Hela arbetsytan = ett JSON-dok i Upstash (`api/sync/+server.ts`), full-skrivning per save; snapshots vid manuell sparning.

---

## Modulansvar (urval, `src/lib/`)

- `state.svelte.ts` — AppState (sanningen om tillståndet).
- `parse.ts` — all text-parsing/serialisering.
- `clock.ts` / `clock-geometry.ts` — klockans geometri.
- `session.ts` / `session-agenda-binding.ts` — pass↔agenda-bindning, segmentlogik.
- `agenda.ts` / `agenda-layout.ts` / `agenda-actions.ts` — agendamodell, layout, åtgärder.
- `flow-*.ts` — flödesläget.
- `learning.ts` / `actuals.ts` — statistik & rekommendationer.
- `ai.ts` / `ai-plan-engine.ts` / `planner-ai.ts` — AI-prompter & planmotor.
