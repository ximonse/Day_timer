# AI Plan Engine Review Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the AI Plan Engine review feedback into a safer, higher-quality implementation before adding more AI features.

**Architecture:** Keep the AI Plan Engine as the organizing layer, but restore concrete Day Timer examples inside its prompts, harden structured response parsing, reduce visible UI choices, and remove half-migrated server prompt code. Do not build a full agent or expand future intents yet.

**Tech Stack:** SvelteKit 5, TypeScript, Vitest, existing OpenAI/Anthropic/Gemini/custom provider integrations, plain CSS.

---

## Review Conclusion

The external review is technically useful and should change the near-term plan.

The original AI Plan Engine direction is still valid: one typed planning layer, three time logics, structured metadata, preview before applying. The weak part is the first implementation shape: it abstracted prompts before preserving the working examples, kept future intents without real behavior, exposed too many UI choices, and treated JSON output as more reliable than it is.

The corrected principle is:

> AI Plan Engine should organize strong prompts, not replace them with vague abstraction.

## Decisions From The Review

1. Keep AI Plan Engine.

   The typed contract is useful and future-proof enough. Removing it would lose the separation between product intent, provider calls, and UI.

2. Restore example-rich prompting.

   Smaller models need concrete Day Timer examples. The old `PARTS_HELPFUL`, `PARTS_STRICT`, `agendaHelpfulPrompt`, and `agendaStrictPrompt` contain valuable examples that should move into `src/lib/ai-plan-engine.ts`.

3. Treat JSON as unreliable unless enforced and tested.

   Provider-level JSON mode can be added where safe, but the app must still handle fenced JSON, malformed JSON, and plain text. Raw broken JSON must not be inserted into the user's plan.

4. De-scope future intents from product behavior.

   Keep the type only if needed for future compatibility, but do not expose or rely on `calm`, `compress`, `expand`, and similar values until each maps to real instructions and UI.

5. Reduce AI UI friction.

   Planning mode and strict/helpful mode are technically different, but presenting both as equal controls makes the panel heavier. The UI should show fewer choices by context.

6. Do not continue feature work until this hardening is done.

   Quality and trust matter more than adding another AI button.

## File Structure

- Modify `src/lib/ai-plan-engine.ts`: prompt examples, behavior mode integration, response extraction, safer fallback, optional metadata item typing.
- Modify `src/lib/ai-plan-engine.test.ts`: tests for fenced JSON, malformed JSON, example-rich prompts, behavior instructions, and context-specific planning modes.
- Modify `src/routes/api/plan/+server.ts`: remove dead old prompt constants after their useful examples move into the engine, pass behavior mode into prompt builder, avoid appending instructions after the JSON contract.
- Modify `src/lib/ai.ts`: keep request contract stable; no UI-visible new feature needed.
- Modify `src/lib/components/PlanEditorPanel.svelte`: show only session-relevant planning choices and reduce strict/helpful prominence.
- Modify `src/lib/components/AgendaImportPanel.svelte`: show only day-relevant planning choices and reduce strict/helpful prominence.
- Modify `src/routes/+page.svelte`: keep default modes sensible and guard against invalid mode/context combinations.

## Task 1: Harden AI Response Parsing

**Files:**
- Modify: `src/lib/ai-plan-engine.ts`
- Modify: `src/lib/ai-plan-engine.test.ts`

- [ ] **Step 1: Add failing tests for realistic model output**

Add tests to `src/lib/ai-plan-engine.test.ts`:

```ts
test('normalizes json wrapped in a markdown code fence', () => {
	const parsed = normalizeAiPlanResponse('```json\n{"text":"Start 5m","assumptions":["Antog kort pass"],"changes":["Kortade namn"],"warnings":[]}\n```');

	expect(parsed).toEqual<AiPlanResponse>({
		text: 'Start 5m',
		assumptions: ['Antog kort pass'],
		changes: ['Kortade namn'],
		warnings: []
	});
});

test('does not expose malformed json as plan text', () => {
	const parsed = normalizeAiPlanResponse('```json\n{"text":"Start 5m", "warnings": [}\n```');

	expect(parsed.text).toBe('');
	expect(parsed.warnings).toContain('AI-svaret kunde inte läsas som plan.');
});

test('keeps plain Day Timer text as fallback', () => {
	const parsed = normalizeAiPlanResponse('Start 5m\nGenomgång 10m');

	expect(parsed.text).toBe('Start 5m\nGenomgång 10m');
	expect(parsed.warnings).toEqual([]);
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
npm test -- src/lib/ai-plan-engine.test.ts
```

Expected: FAIL until malformed JSON is handled safely.

- [ ] **Step 3: Implement robust extraction and safe fallback**

In `src/lib/ai-plan-engine.ts`, add helpers:

```ts
function stripMarkdownJsonFence(raw: string): string {
	const trimmed = raw.trim();
	const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
	return match ? match[1].trim() : trimmed;
}

function looksLikeStructuredJson(raw: string): boolean {
	const text = stripMarkdownJsonFence(raw);
	return text.startsWith('{') || text.startsWith('[');
}
```

Update `normalizeAiPlanResponse` so malformed JSON-like output does not become plan text:

```ts
export function normalizeAiPlanResponse(raw: string): AiPlanResponse {
	const normalizedRaw = stripMarkdownJsonFence(raw);
	const fallback: AiPlanResponse = {
		text: looksLikeStructuredJson(raw) ? '' : normalizedRaw,
		assumptions: [],
		changes: [],
		warnings: looksLikeStructuredJson(raw) ? ['AI-svaret kunde inte läsas som plan.'] : []
	};

	try {
		const parsed = JSON.parse(normalizedRaw) as unknown;
		if (!isRecord(parsed) || typeof parsed.text !== 'string') return fallback;
		return {
			text: parsed.text.trim(),
			assumptions: stringArray(parsed.assumptions),
			changes: stringArray(parsed.changes),
			warnings: stringArray(parsed.warnings)
		};
	} catch {
		return fallback;
	}
}
```

- [ ] **Step 4: Run focused tests**

Run:

```bash
npm test -- src/lib/ai-plan-engine.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai-plan-engine.ts src/lib/ai-plan-engine.test.ts
git commit -m "fix: harden ai plan response parsing"
```

## Task 2: Restore Concrete Prompt Examples Inside The Engine

**Files:**
- Modify: `src/lib/ai-plan-engine.ts`
- Modify: `src/lib/ai-plan-engine.test.ts`
- Later cleanup in Task 4: `src/routes/api/plan/+server.ts`

- [ ] **Step 1: Add tests that protect Day Timer examples**

Add tests:

```ts
test('fixed session prompt includes concrete activity format examples', () => {
	const prompt = buildAiPlanSystemPrompt({
		planningMode: 'fixed-session',
		intent: 'create',
		planMode: 'helpful',
		userInput: 'åk 4 procent',
		workspaceContext: { mode: 'plan' },
		timeFrame: { totalMin: 60 }
	});

	expect(prompt).toContain('Frukost 20m');
	expect(prompt).toContain('- kolla inte skärm');
	expect(prompt).toContain('& Om');
	expect(prompt).toContain('inga rubriker');
});

test('agenda prompt includes concrete day plan example', () => {
	const prompt = buildAiPlanSystemPrompt({
		planningMode: 'anchored-day',
		intent: 'create',
		planMode: 'helpful',
		userInput: 'möte kl 10 och 14',
		workspaceContext: { mode: 'agenda' },
		timeFrame: { date: '2026-05-24' }
	});

	expect(prompt).toContain('@260524');
	expect(prompt).toContain('#Morgonrutin 07:00');
	expect(prompt).toContain('Djuparbete 60m');
	expect(prompt).toContain('#Rubrik HH:MM');
});
```

Update the request type used by the prompt builder in the test to include `planMode`.

- [ ] **Step 2: Run focused tests and verify failure**

Run:

```bash
npm test -- src/lib/ai-plan-engine.test.ts
```

Expected: FAIL because `buildAiPlanSystemPrompt` does not yet accept or use `planMode`.

- [ ] **Step 3: Add plan mode to the engine request type**

In `src/lib/ai-plan-engine.ts`, add:

```ts
export type AiBehaviorMode = 'strict' | 'helpful';
```

Add to `AiPlanRequest`:

```ts
planMode?: AiBehaviorMode;
```

Update `buildAiPlanSystemPrompt` pick type to include `planMode`.

- [ ] **Step 4: Move concrete examples into prompt helpers**

Add helper functions to `src/lib/ai-plan-engine.ts` based on the old server prompts:

```ts
function planExample(planMode: AiBehaviorMode): string {
	if (planMode === 'strict') {
		return `Exempel för pass:
Frukost 20m

Promenad 30m
- ta med nycklar

& Kom ihåg: möte kl 9.`;
	}
	return `Exempel för pass:
Vakna 5m

Toa 5m
- ta med telefonen

Medicin 2m

Frukost 20m
- kolla inte skärm

& Om du vill hinna i tid kan det vara bra att lägga in 5 min buffert efter frukost.`;
}

function agendaExample(date?: string): string {
	const compactDate = (date ?? new Date().toISOString().slice(0, 10)).replace(/-/g, '').slice(2);
	return `Exempel för dag:
@${compactDate}
#Morgonrutin 07:00
Vakna 5m
Toa 5m
Frukost 20m
- kolla inte skärm
Förberedelse 10m

#Arbetspass 09:00
Planering 10m
Epost 20m
Djuparbete 60m
- stäng av notiser
Paus 10m
Uppföljning 15m

& Det här upplägget ser hållbart ut, men lägg gärna in en kort paus efter första arbetspasset om dagen blir lång.`;
}
```

- [ ] **Step 5: Integrate behavior mode before output contract**

Add:

```ts
function behaviorInstruction(planMode: AiBehaviorMode): string {
	if (planMode === 'strict') {
		return 'Strikt läge: återge användarens innehåll så nära som möjligt. Lägg inte till aktiviteter, pauser eller råd om det inte krävs för att formatet ska fungera.';
	}
	return 'Hjälpsamt läge: gör planen mer genomförbar med rimliga tider, buffert, övergångar och korta råd när det tydligt hjälper.';
}
```

In `buildAiPlanSystemPrompt`, set:

```ts
const planMode = request.planMode ?? 'helpful';
const example = request.workspaceContext?.mode === 'agenda'
	? agendaExample(request.timeFrame?.date)
	: planExample(planMode);
```

Include both `behaviorInstruction(planMode)` and `example` before `Returnera BARA JSON`.

- [ ] **Step 6: Run focused tests**

Run:

```bash
npm test -- src/lib/ai-plan-engine.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/ai-plan-engine.ts src/lib/ai-plan-engine.test.ts
git commit -m "fix: restore concrete ai prompt examples"
```

## Task 3: Make Intent Honest

**Files:**
- Modify: `src/lib/ai-plan-engine.ts`
- Modify: `src/lib/ai-plan-engine.test.ts`

- [ ] **Step 1: Add tests for current intent behavior**

Add:

```ts
test('create intent has explicit behavior instructions', () => {
	const prompt = buildAiPlanSystemPrompt({
		planningMode: 'fixed-session',
		intent: 'create',
		planMode: 'helpful',
		userInput: 'lektion',
		workspaceContext: { mode: 'plan' }
	});

	expect(prompt).toContain('Intent: Skapa en ny plan');
});

test('future intents are not exposed as bare unexplained tokens', () => {
	const prompt = buildAiPlanSystemPrompt({
		planningMode: 'fixed-session',
		intent: 'compress',
		planMode: 'helpful',
		userInput: 'lektion',
		workspaceContext: { mode: 'plan' }
	});

	expect(prompt).toContain('Intent: Skapa en ny plan');
	expect(prompt).not.toContain('Intent: compress');
});
```

- [ ] **Step 2: Run focused tests and verify failure**

Run:

```bash
npm test -- src/lib/ai-plan-engine.test.ts
```

Expected: FAIL because current prompt prints raw `Intent: compress`.

- [ ] **Step 3: Add honest intent instructions**

Add:

```ts
function intentInstruction(intent: AiPlanIntent): string {
	if (intent === 'create') return 'Intent: Skapa en ny plan från användarens text.';
	return 'Intent: Skapa en ny plan från användarens text.';
}
```

Replace raw `Intent: ${request.intent}` in the prompt with:

```ts
${intentInstruction(request.intent)}
```

This keeps the type compatible without pretending future intents are implemented.

- [ ] **Step 4: Run focused tests**

Run:

```bash
npm test -- src/lib/ai-plan-engine.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai-plan-engine.ts src/lib/ai-plan-engine.test.ts
git commit -m "fix: make ai plan intent behavior explicit"
```

## Task 4: Remove Half-Migrated Server Prompt Code

**Files:**
- Modify: `src/routes/api/plan/+server.ts`
- Modify: `src/lib/ai-plan-engine.ts`
- Test: `npm test -- src/lib/ai-plan-engine.test.ts`

- [ ] **Step 1: Pass plan mode into prompt builder**

In `src/routes/api/plan/+server.ts`, replace:

```ts
const planModeInstruction = planMode === 'strict'
  ? '\n\nStrikt lage: aterge anvandarens innehall sa nara som mojligt. Lagg inte till egna aktiviteter, pauser eller rad om det inte kravs for att formatet ska fungera.'
  : '\n\nHjalpsamt lage: gor planen mer genomforbar med rimliga tider, buffert, overgangar och korta rad nar det tydligt hjalper.';
const systemPrompt = buildAiPlanSystemPrompt({
```

with:

```ts
const systemPrompt = buildAiPlanSystemPrompt({
```

Add `planMode` inside the object passed to `buildAiPlanSystemPrompt`.

- [ ] **Step 2: Remove appended instruction**

Remove:

```ts
}) + planModeInstruction;
```

and use:

```ts
});
```

- [ ] **Step 3: Delete dead prompt constants from server**

Remove these unused declarations from `src/routes/api/plan/+server.ts`:

```ts
const PARTS_STRICT = ...
const PARTS_HELPFUL = ...
function agendaStrictPrompt(todayISO: string): string { ... }
function agendaHelpfulPrompt(todayISO: string): string { ... }
```

The useful examples must already exist in `src/lib/ai-plan-engine.ts` from Task 2.

- [ ] **Step 4: Run checks**

Run:

```bash
npm test -- src/lib/ai-plan-engine.test.ts
npm run check
```

Expected: PASS, except any pre-existing Svelte a11y warnings already present before this work.

- [ ] **Step 5: Commit**

```bash
git add src/routes/api/plan/+server.ts src/lib/ai-plan-engine.ts
git commit -m "refactor: consolidate ai planning prompts"
```

## Task 5: Reduce Planning Mode Choices By Context

**Files:**
- Modify: `src/lib/ai-plan-engine.ts`
- Modify: `src/lib/ai-plan-engine.test.ts`
- Modify: `src/lib/components/PlanEditorPanel.svelte`
- Modify: `src/lib/components/AgendaImportPanel.svelte`
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Add context option helpers**

In `src/lib/ai-plan-engine.ts`, add:

```ts
export const AI_SESSION_PLANNING_MODES: AiPlanningMode[] = ['fixed-session', 'free-day'];
export const AI_AGENDA_PLANNING_MODES: AiPlanningMode[] = ['anchored-day', 'free-day'];

export function isValidPlanningModeForContext(context: 'plan' | 'agenda', mode: AiPlanningMode): boolean {
	const options = context === 'agenda' ? AI_AGENDA_PLANNING_MODES : AI_SESSION_PLANNING_MODES;
	return options.includes(mode);
}
```

- [ ] **Step 2: Add tests for context options**

Add:

```ts
test('limits planning modes by ui context', () => {
	expect(isValidPlanningModeForContext('plan', 'fixed-session')).toBe(true);
	expect(isValidPlanningModeForContext('plan', 'anchored-day')).toBe(false);
	expect(isValidPlanningModeForContext('agenda', 'anchored-day')).toBe(true);
	expect(isValidPlanningModeForContext('agenda', 'fixed-session')).toBe(false);
});
```

Update imports accordingly.

- [ ] **Step 3: Use session options in `PlanEditorPanel.svelte`**

Change import to include `AI_SESSION_PLANNING_MODES`.

Replace:

```ts
const planningModeOptions = Object.entries(AI_PLANNING_MODE_LABELS) as [AiPlanningMode, string][];
```

with:

```ts
const planningModeOptions = AI_SESSION_PLANNING_MODES.map((mode) => [mode, AI_PLANNING_MODE_LABELS[mode]] as [AiPlanningMode, string]);
```

- [ ] **Step 4: Use agenda options in `AgendaImportPanel.svelte`**

Change import to include `AI_AGENDA_PLANNING_MODES`.

Replace:

```ts
const planningModeOptions = Object.entries(AI_PLANNING_MODE_LABELS) as [AiPlanningMode, string][];
```

with:

```ts
const planningModeOptions = AI_AGENDA_PLANNING_MODES.map((mode) => [mode, AI_PLANNING_MODE_LABELS[mode]] as [AiPlanningMode, string]);
```

- [ ] **Step 5: Guard invalid mode/context before AI calls**

In `src/routes/+page.svelte`, import `isValidPlanningModeForContext`.

Before session AI request:

```ts
const planningMode = isValidPlanningModeForContext('plan', sessionAiPlanningMode)
	? sessionAiPlanningMode
	: 'fixed-session';
```

Pass `planningMode` to `requestAiPlan`.

Before agenda AI request:

```ts
const planningMode = isValidPlanningModeForContext('agenda', agendaAiPlanningMode)
	? agendaAiPlanningMode
	: 'anchored-day';
```

Pass `planningMode` to `requestAiPlan`.

- [ ] **Step 6: Run checks**

Run:

```bash
npm test -- src/lib/ai-plan-engine.test.ts
npm run check
```

Expected: PASS, except any pre-existing Svelte a11y warnings already present before this work.

- [ ] **Step 7: Commit**

```bash
git add src/lib/ai-plan-engine.ts src/lib/ai-plan-engine.test.ts src/lib/components/PlanEditorPanel.svelte src/lib/components/AgendaImportPanel.svelte src/routes/+page.svelte
git commit -m "fix: limit ai planning modes by context"
```

## Task 6: Reduce Strict/Helpful UI Friction

**Files:**
- Modify: `src/lib/components/PlanEditorPanel.svelte`
- Modify: `src/lib/components/AgendaImportPanel.svelte`

- [ ] **Step 1: Keep behavior mode but make it secondary**

Do not remove `strict/helpful` yet because it changes model behavior and users may still need it. Change the row label and styling so it reads as a secondary tone choice, not another primary planning mode.

In both components, replace the second `.ai-mode-row` with:

```svelte
<div class="ai-tone-row">
  <span class="ai-tone-label">Ton</span>
  <button class="ai-tone-btn" class:on={aiPlanMode === 'strict'} onclick={onSetStrictMode}>Strikt</button>
  <button class="ai-tone-btn" class:on={aiPlanMode === 'helpful'} onclick={onSetHelpfulMode}>Hjälpsam</button>
</div>
```

- [ ] **Step 2: Add compact CSS**

In both components if local styles exist, or in the shared stylesheet if those classes are global, add:

```css
.ai-tone-row {
	display: flex;
	align-items: center;
	gap: 6px;
	margin: 6px 0;
}

.ai-tone-label {
	color: var(--muted);
	font-size: 11px;
	font-weight: 700;
	text-transform: uppercase;
}

.ai-tone-btn {
	border: 1px solid var(--line);
	background: transparent;
	color: var(--muted);
	border-radius: 999px;
	padding: 3px 8px;
	font-size: 11px;
}

.ai-tone-btn.on {
	background: var(--panel);
	color: var(--ink);
}
```

If `.ai-mode-btn` is globally defined and preferred locally, reuse existing tokens instead of introducing mismatched colors.

- [ ] **Step 3: Run Svelte check**

Run:

```bash
npm run check
```

Expected: PASS, except any pre-existing Svelte a11y warnings already present before this work.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/PlanEditorPanel.svelte src/lib/components/AgendaImportPanel.svelte
git commit -m "polish: make ai strict helpful choice secondary"
```

## Task 7: Type AI Metadata In The UI

**Files:**
- Modify: `src/lib/ai-plan-engine.ts`
- Modify: `src/lib/ai-plan-engine.test.ts`
- Modify: `src/lib/components/PlanEditorPanel.svelte`
- Modify: `src/lib/components/AgendaImportPanel.svelte`

- [ ] **Step 1: Return typed metadata items**

In `src/lib/ai-plan-engine.ts`, add:

```ts
export type AiPlanMetadataKind = 'change' | 'assumption' | 'warning';

export interface AiPlanMetadataItem {
	kind: AiPlanMetadataKind;
	text: string;
}
```

Replace `aiPlanMetadataItems` with:

```ts
export function aiPlanMetadataItems(response: AiPlanResponse, limit = AI_PLAN_METADATA_LIMIT): AiPlanMetadataItem[] {
	return [
		...response.warnings.map((text) => ({ kind: 'warning' as const, text })),
		...response.changes.map((text) => ({ kind: 'change' as const, text })),
		...response.assumptions.map((text) => ({ kind: 'assumption' as const, text }))
	].slice(0, limit);
}
```

- [ ] **Step 2: Update metadata test**

Replace the existing metadata test expectation with:

```ts
expect(items).toEqual([
	{ kind: 'warning', text: 'Planen ar tajt' },
	{ kind: 'change', text: 'Lade till start' },
	{ kind: 'change', text: 'Kortade titlar' },
	{ kind: 'change', text: 'Lade till paus' }
]);
```

- [ ] **Step 3: Update component rendering**

In both AI panels, replace:

```svelte
{#each aiPlanMetadataItems(aiLastResponse) as item}
  <span class="ai-meta-chip">{item}</span>
{/each}
```

with:

```svelte
{#each aiPlanMetadataItems(aiLastResponse) as item}
  <span class={`ai-meta-chip ai-meta-chip--${item.kind}`}>{item.text}</span>
{/each}
```

- [ ] **Step 4: Add warning styling**

Use existing design tokens. Add:

```css
.ai-meta-chip--warning {
	border-color: color-mix(in srgb, #d97706 35%, var(--line));
	color: #92400e;
}
```

- [ ] **Step 5: Run checks**

Run:

```bash
npm test -- src/lib/ai-plan-engine.test.ts
npm run check
```

Expected: PASS, except any pre-existing Svelte a11y warnings already present before this work.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai-plan-engine.ts src/lib/ai-plan-engine.test.ts src/lib/components/PlanEditorPanel.svelte src/lib/components/AgendaImportPanel.svelte
git commit -m "polish: distinguish ai metadata warnings"
```

## Task 8: Final Verification

**Files:**
- No planned edits.

- [ ] **Step 1: Run full tests**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run Svelte check**

Run:

```bash
npm run check
```

Expected: 0 errors. Existing warnings may remain only if they were present before this work.

- [ ] **Step 3: Manual AI smoke test**

With an API key configured in `Konto & AI`, test:

```text
ledig dag, vill vakna lugnt, dricka te, frukost på trappen, toalett och hygien, medicin, meditation och andning, skriva av mig, lite morgonpyssel
```

Expected:

- no raw JSON shown to the user
- no fenced ```json output shown to the user
- no `895 Aktivitet` style start markers in pass output
- free-day output uses fewer calm blocks with underpoints
- tea/frukost/meditation are not compressed into obviously unrealistic time
- warnings look different from changes/assumptions

- [ ] **Step 4: Commit any verification-only fixes**

Only commit if manual verification found a concrete issue:

```bash
git add <changed-files>
git commit -m "fix: polish ai plan hardening"
```

## Self-Review

- Spec coverage: The plan addresses all major review points: prompt regression, JSON fragility, dead intents, invalid mode/context choices, strict/helpful UI friction, dead server prompts, metadata typing, and missing tests.
- YAGNI: No agent, no new storage, no new provider abstraction, no expanded intent UI.
- Risk: JSON-mode at provider level is intentionally not required in this plan because robust parsing and safe fallback are needed regardless of provider support. A later provider-specific optimization can add JSON mode after this hardening lands.
- Current workspace note: If another developer has already edited `src/lib/ai-plan-engine.ts`, inspect and preserve their changes before applying Task 1.
