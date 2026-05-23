# AI Plan Engine Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first AI Plan Engine layer so Day Timer can turn messy input into a feasible plan using explicit planning modes, structured metadata, and the existing model-provider setup.

**Architecture:** Add a small typed AI planning module that builds provider prompts, normalizes model responses, and preserves compatibility with the current `/api/plan` API. Then update the server endpoint to accept `planningMode` and `intent`, and update the existing AI UI panels to let users choose Fast pass, Dag med ankare, or Fri dag without introducing a chat surface.

**Tech Stack:** SvelteKit 5, TypeScript, Vitest, existing OpenAI/Anthropic/Gemini/custom provider integrations, plain CSS.

---

## File Structure

- Create `src/lib/ai-plan-engine.ts`: shared types, mode labels, intent labels, prompt builders, response parser, fallback metadata.
- Create `src/lib/ai-plan-engine.test.ts`: unit tests for prompt selection, response normalization, and JSON fallback.
- Modify `src/lib/ai.ts`: export the new request shape from the client helper while preserving current calls.
- Modify `src/routes/api/plan/+server.ts`: use the AI Plan Engine prompt builder and response parser.
- Modify `src/lib/components/SessionEditorPanel.svelte`: pass AI planning mode props through to `PlanEditorPanel`.
- Modify `src/lib/components/PlanEditorPanel.svelte`: add compact planning mode controls for session-level AI.
- Modify `src/lib/components/AgendaPanel.svelte`: pass agenda AI planning mode props through to `AgendaImportPanel`.
- Modify `src/lib/components/AgendaImportPanel.svelte`: add compact planning mode controls for day-level AI.
- Modify `src/routes/+page.svelte`: hold selected planning mode state and pass it to AI calls.
- Modify tests only where required by changed public types.

## Task 1: Add AI Plan Engine Types and Response Parsing

**Files:**
- Create: `src/lib/ai-plan-engine.ts`
- Test: `src/lib/ai-plan-engine.test.ts`

- [ ] **Step 1: Write failing tests for metadata parsing**

Add `src/lib/ai-plan-engine.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import {
  AI_PLANNING_MODE_LABELS,
  normalizeAiPlanResponse,
  type AiPlanResponse
} from './ai-plan-engine.js';

describe('ai-plan-engine', () => {
  test('normalizes valid structured model output', () => {
    const parsed = normalizeAiPlanResponse(JSON.stringify({
      text: 'Start 5m\nGenomgang 10m',
      assumptions: ['Antog fast pass pa 60 min'],
      changes: ['Lade till start'],
      warnings: ['Planen ar tajt']
    }));

    expect(parsed).toEqual<AiPlanResponse>({
      text: 'Start 5m\nGenomgang 10m',
      assumptions: ['Antog fast pass pa 60 min'],
      changes: ['Lade till start'],
      warnings: ['Planen ar tajt']
    });
  });

  test('falls back to plain text when model output is not json', () => {
    const parsed = normalizeAiPlanResponse('Start 5m\nGenomgang 10m');

    expect(parsed).toEqual<AiPlanResponse>({
      text: 'Start 5m\nGenomgang 10m',
      assumptions: [],
      changes: [],
      warnings: []
    });
  });

  test('keeps public Swedish labels stable', () => {
    expect(AI_PLANNING_MODE_LABELS['fixed-session']).toBe('Fast pass');
    expect(AI_PLANNING_MODE_LABELS['anchored-day']).toBe('Dag med ankare');
    expect(AI_PLANNING_MODE_LABELS['free-day']).toBe('Fri dag');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/lib/ai-plan-engine.test.ts
```

Expected: FAIL because `src/lib/ai-plan-engine.ts` does not exist.

- [ ] **Step 3: Implement AI Plan Engine base module**

Create `src/lib/ai-plan-engine.ts`:

```ts
export type AiPlanningMode = 'fixed-session' | 'anchored-day' | 'free-day';
export type AiPlanIntent = 'create' | 'calm' | 'compress' | 'expand' | 'add-transitions' | 'make-teachable' | 'reduce-switching' | 'prioritize';

export interface AiTimeFrame {
  startMin?: number;
  endMin?: number;
  totalMin?: number;
  date?: string;
}

export interface AiWorkspaceContext {
  mode?: 'now' | 'plan' | 'agenda';
  dayTitle?: string;
  extraInfo?: string;
}

export interface AiPlanRequest {
  planningMode: AiPlanningMode;
  intent: AiPlanIntent;
  userInput: string;
  currentPlan?: string;
  timeFrame?: AiTimeFrame;
  workspaceContext?: AiWorkspaceContext;
}

export interface AiPlanResponse {
  text: string;
  assumptions: string[];
  changes: string[];
  warnings: string[];
}

export const AI_PLANNING_MODE_LABELS: Record<AiPlanningMode, string> = {
  'fixed-session': 'Fast pass',
  'anchored-day': 'Dag med ankare',
  'free-day': 'Fri dag'
};

export const AI_PLAN_INTENT_LABELS: Record<AiPlanIntent, string> = {
  create: 'Skapa plan',
  calm: 'Gor lugnare',
  compress: 'Korta',
  expand: 'Mer detaljerad',
  'add-transitions': 'Lagg till overgangar',
  'make-teachable': 'Mer pedagogisk',
  'reduce-switching': 'Farre vaxlingar',
  prioritize: 'Prioritera'
};

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeAiPlanResponse(raw: string): AiPlanResponse {
  const fallback: AiPlanResponse = {
    text: raw.trim(),
    assumptions: [],
    changes: [],
    warnings: []
  };

  try {
    const parsed = JSON.parse(raw) as unknown;
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

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- src/lib/ai-plan-engine.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai-plan-engine.ts src/lib/ai-plan-engine.test.ts
git commit -m "feat: add ai plan engine response model"
```

## Task 2: Build Planning Mode Prompts

**Files:**
- Modify: `src/lib/ai-plan-engine.ts`
- Modify: `src/lib/ai-plan-engine.test.ts`

- [ ] **Step 1: Write failing tests for mode-specific prompts**

Append to `src/lib/ai-plan-engine.test.ts` inside the existing `describe` block:

```ts
  test('builds fixed session prompt with hard time-frame language', () => {
    const prompt = buildAiPlanSystemPrompt({
      planningMode: 'fixed-session',
      intent: 'create',
      userInput: 'Ak 4 procent',
      timeFrame: { totalMin: 60 }
    });

    expect(prompt).toContain('Fast pass');
    expect(prompt).toContain('hall dig inom den givna ramen');
    expect(prompt).toContain('60 minuter');
    expect(prompt).toContain('Returnera BARA JSON');
  });

  test('builds anchored day prompt around fixed anchors', () => {
    const prompt = buildAiPlanSystemPrompt({
      planningMode: 'anchored-day',
      intent: 'create',
      userInput: 'mote 10 och 14',
      timeFrame: { date: '2026-05-23' }
    });

    expect(prompt).toContain('Dag med ankare');
    expect(prompt).toContain('fasta ankare');
    expect(prompt).toContain('2026-05-23');
  });

  test('builds free day prompt with softer scheduling language', () => {
    const prompt = buildAiPlanSystemPrompt({
      planningMode: 'free-day',
      intent: 'create',
      userInput: 'tvatta och handla'
    });

    expect(prompt).toContain('Fri dag');
    expect(prompt).toContain('startbar');
    expect(prompt).toContain('mindre schema');
  });
```

Update the import:

```ts
import {
  AI_PLANNING_MODE_LABELS,
  buildAiPlanSystemPrompt,
  normalizeAiPlanResponse,
  type AiPlanResponse
} from './ai-plan-engine.js';
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/lib/ai-plan-engine.test.ts
```

Expected: FAIL because `buildAiPlanSystemPrompt` does not exist.

- [ ] **Step 3: Implement prompt builder**

Add to `src/lib/ai-plan-engine.ts`:

```ts
function timeFrameText(timeFrame?: AiTimeFrame): string {
  if (!timeFrame) return 'Ingen exakt tidsram angiven.';
  const parts: string[] = [];
  if (typeof timeFrame.totalMin === 'number') parts.push(`${timeFrame.totalMin} minuter`);
  if (typeof timeFrame.startMin === 'number') parts.push(`startMin ${timeFrame.startMin}`);
  if (typeof timeFrame.endMin === 'number') parts.push(`endMin ${timeFrame.endMin}`);
  if (timeFrame.date) parts.push(`datum ${timeFrame.date}`);
  return parts.length ? parts.join(', ') : 'Ingen exakt tidsram angiven.';
}

function modeInstruction(mode: AiPlanningMode): string {
  if (mode === 'fixed-session') {
    return 'Fast pass: start och slut ar normalt givna. Optimera insidan, hall dig inom den givna ramen, skapa progression, overgangar, variation och ett tydligt avslut.';
  }
  if (mode === 'anchored-day') {
    return 'Dag med ankare: respektera fasta ankare som moten, deadlines och hamtning. Bygg realistiska arbetsblock runt dem med buffert och prioritering.';
  }
  return 'Fri dag: gor roran startbar med mjuk ordning, sma steg och paminnelser. Skapa mindre schema och mer stod.';
}

export function buildAiPlanSystemPrompt(request: Pick<AiPlanRequest, 'planningMode' | 'intent' | 'timeFrame' | 'currentPlan' | 'workspaceContext'>): string {
  const label = AI_PLANNING_MODE_LABELS[request.planningMode];
  const frame = timeFrameText(request.timeFrame);
  const currentPlan = request.currentPlan?.trim() ? request.currentPlan.trim() : 'Ingen befintlig plan.';
  const context = request.workspaceContext ? JSON.stringify(request.workspaceContext) : '{}';

  return `Du ar Day Timers AI Plan Engine.

Lage: ${label}
Intent: ${request.intent}
Tidsram: ${frame}
Kontext: ${context}
Befintlig plan: ${currentPlan}

${modeInstruction(request.planningMode)}

Returnera BARA JSON i detta format:
{
  "text": "Day Timer-format",
  "assumptions": ["kort antagande"],
  "changes": ["kort andring"],
  "warnings": ["kort varning"]
}

Regler:
- Texten i "text" ska vara strikt Day Timer-format.
- Aktiviteter ska ha korta svenska namn.
- Underpunkter borja med "-".
- Kommentarer borja med "&".
- Om lage ar Fast pass ska total planerad tid halla ramen sa langt det gar.
- Om lage ar Dag med ankare ska fasta tider respekteras.
- Om lage ar Fri dag ska planen vara mild och startbar, inte overplanerad.`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- src/lib/ai-plan-engine.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai-plan-engine.ts src/lib/ai-plan-engine.test.ts
git commit -m "feat: add planning mode prompts"
```

## Task 3: Wire Server Endpoint to Structured AI Plan Engine

**Files:**
- Modify: `src/routes/api/plan/+server.ts`
- Modify: `src/lib/ai.ts`
- Test: `npm test`

- [ ] **Step 1: Extend client request types**

Modify `src/lib/ai.ts` imports and `requestAiPlan` signature:

```ts
import type { AiPlanIntent, AiPlanningMode, AiPlanResponse } from './ai-plan-engine.js';
```

Replace `requestAiPlan` with:

```ts
export async function requestAiPlan(
  config: AiConfig,
  message: string,
  mode: 'parts' | 'agenda',
  context: Record<string, unknown>,
  planningMode: AiPlanningMode = mode === 'parts' ? 'fixed-session' : 'anchored-day',
  intent: AiPlanIntent = 'create'
): Promise<AiPlanResponse> {
  const res = await fetch('/api/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildAiPayload(config, { message, mode, context, planningMode, intent }))
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error);
  if (typeof data.text === 'string') {
    return {
      text: data.text,
      assumptions: Array.isArray(data.assumptions) ? data.assumptions : [],
      changes: Array.isArray(data.changes) ? data.changes : [],
      warnings: Array.isArray(data.warnings) ? data.warnings : []
    };
  }
  throw new Error('AI-tjansten saknade plantext');
}
```

- [ ] **Step 2: Update server imports and request typing**

In `src/routes/api/plan/+server.ts`, add:

```ts
import { buildAiPlanSystemPrompt, normalizeAiPlanResponse, type AiPlanIntent, type AiPlanningMode } from '$lib/ai-plan-engine.js';
```

Extend the request JSON type:

```ts
planningMode?: AiPlanningMode;
intent?: AiPlanIntent;
```

- [ ] **Step 3: Replace prompt selection with AI Plan Engine prompt**

Replace the `let systemPrompt` block with:

```ts
  const planningMode: AiPlanningMode = planningModeFromInput(mode, bodyPlanningMode);
  const intent: AiPlanIntent = bodyIntent ?? 'create';
  const systemPrompt = buildAiPlanSystemPrompt({
    planningMode,
    intent,
    userInput: message,
    currentPlan: typeof context?.currentPlan === 'string' ? context.currentPlan : undefined,
    timeFrame: {
      startMin: context?.startMin,
      endMin: context?.endMin,
      totalMin: context?.totalMin,
      date: todayISO
    },
    workspaceContext: {
      mode: mode === 'parts' ? 'plan' : 'agenda',
      dayTitle: typeof context?.dayTitle === 'string' ? context.dayTitle : undefined,
      extraInfo: typeof context?.extraInfo === 'string' ? context.extraInfo : undefined
    }
  });
```

Add helper near `safeErrorMessage`:

```ts
function planningModeFromInput(mode: 'parts' | 'agenda', value: AiPlanningMode | undefined): AiPlanningMode {
  if (value === 'fixed-session' || value === 'anchored-day' || value === 'free-day') return value;
  return mode === 'parts' ? 'fixed-session' : 'anchored-day';
}
```

When destructuring request JSON, alias the new fields:

```ts
planningMode: bodyPlanningMode,
intent: bodyIntent
```

- [ ] **Step 4: Return structured metadata**

Replace:

```ts
    return json({ text });
```

with:

```ts
    const normalized = normalizeAiPlanResponse(text);
    return json(normalized);
```

- [ ] **Step 5: Run checks**

Run:

```bash
npm test
npm run check
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai.ts src/routes/api/plan/+server.ts
git commit -m "feat: route ai planning through plan engine"
```

## Task 4: Add Planning Mode UI State

**Files:**
- Modify: `src/routes/+page.svelte`
- Modify: `src/lib/components/SessionEditorPanel.svelte`
- Modify: `src/lib/components/PlanEditorPanel.svelte`
- Modify: `src/lib/components/AgendaPanel.svelte`
- Modify: `src/lib/components/AgendaImportPanel.svelte`

- [ ] **Step 1: Add local planning mode state**

In `src/routes/+page.svelte`, import the type:

```ts
import type { AiPlanningMode } from '$lib/ai-plan-engine.js';
```

Add local state near existing AI config state:

```ts
let sessionAiPlanningMode: AiPlanningMode = $state('fixed-session');
let agendaAiPlanningMode: AiPlanningMode = $state('anchored-day');
```

- [ ] **Step 2: Pass planning mode to AI calls**

Find session AI call and update:

```ts
const text = await requestAiPlan(aiConfig, aiInput, 'parts', {
  startMin: s.startMin,
  totalMin: totalMin(),
  currentPlan: serializeBlocks(s.blocks, undefined, s.extraInfo),
  dayTitle: s.dayTitle,
  extraInfo: s.extraInfo
}, sessionAiPlanningMode, 'create');
```

Then use:

```ts
handlePartsInput(text.text, true);
```

Find agenda AI call and update:

```ts
const text = await requestAiPlan(aiConfig, agendaAiInput, 'agenda', {
  date: localDateISO(),
  currentPlan: s.agendaText
}, agendaAiPlanningMode, 'create');
```

Then replace current string usage with:

```ts
setActiveAgendaText(text.text);
const aiDays = parseAgenda(text.text);
```

- [ ] **Step 3: Pass mode props to components**

For `SessionEditorPanel`, pass:

```svelte
aiPlanningMode={sessionAiPlanningMode}
onSetAiPlanningMode={(mode) => { sessionAiPlanningMode = mode; }}
```

For `AgendaPanel`, pass:

```svelte
aiPlanningMode={agendaAiPlanningMode}
onSetAiPlanningMode={(mode) => { agendaAiPlanningMode = mode; }}
```

- [ ] **Step 4: Pass props through SessionEditorPanel**

In `src/lib/components/SessionEditorPanel.svelte`, import:

```ts
import type { AiPlanningMode } from '$lib/ai-plan-engine.js';
```

Add destructured props:

```ts
aiPlanningMode,
onSetAiPlanningMode,
```

Add prop types:

```ts
aiPlanningMode: AiPlanningMode;
onSetAiPlanningMode: (mode: AiPlanningMode) => void;
```

Pass them to `PlanEditorPanel`:

```svelte
{aiPlanningMode}
{onSetAiPlanningMode}
```

- [ ] **Step 5: Add props to PlanEditorPanel**

In `src/lib/components/PlanEditorPanel.svelte`, import:

```ts
import { AI_PLANNING_MODE_LABELS, type AiPlanningMode } from '$lib/ai-plan-engine.js';
```

Add props:

```ts
aiPlanningMode,
onSetAiPlanningMode,
```

Add prop types:

```ts
aiPlanningMode: AiPlanningMode;
onSetAiPlanningMode: (mode: AiPlanningMode) => void;
```

Render inside the open AI panel before strict/helpful mode buttons:

```svelte
<div class="ai-mode-row">
  {#each Object.entries(AI_PLANNING_MODE_LABELS) as [mode, label]}
    <button class="ai-mode-btn" class:on={aiPlanningMode === mode} onclick={() => onSetAiPlanningMode(mode as AiPlanningMode)}>{label}</button>
  {/each}
</div>
```

- [ ] **Step 6: Pass props through AgendaPanel**

In `src/lib/components/AgendaPanel.svelte`, import:

```ts
import type { AiPlanningMode } from '$lib/ai-plan-engine.js';
```

Add destructured props:

```ts
aiPlanningMode,
onSetAiPlanningMode,
```

Add prop types:

```ts
aiPlanningMode: AiPlanningMode;
onSetAiPlanningMode: (mode: AiPlanningMode) => void;
```

Pass them to `AgendaImportPanel`:

```svelte
{aiPlanningMode}
{onSetAiPlanningMode}
```

- [ ] **Step 7: Add props to AgendaImportPanel**

In `src/lib/components/AgendaImportPanel.svelte`, import:

```ts
import { AI_PLANNING_MODE_LABELS, type AiPlanningMode } from '$lib/ai-plan-engine.js';
```

Add props and types matching `PlanEditorPanel`.

Render the same compact mode row inside the agenda AI panel before strict/helpful mode buttons.

- [ ] **Step 8: Run checks**

Run:

```bash
npm run check
```

Expected: PASS. If Svelte reports prop or handler names that differ from actual local code, adjust names to match current component conventions without changing behavior.

- [ ] **Step 9: Commit**

```bash
git add src/routes/+page.svelte src/lib/components/SessionEditorPanel.svelte src/lib/components/PlanEditorPanel.svelte src/lib/components/AgendaPanel.svelte src/lib/components/AgendaImportPanel.svelte
git commit -m "feat: add ai planning mode controls"
```

## Task 5: Surface AI Metadata in Preview Feedback

**Files:**
- Modify: `src/routes/+page.svelte`
- Modify: `src/lib/components/SessionEditorPanel.svelte`
- Modify: `src/lib/components/PlanEditorPanel.svelte`
- Modify: `src/lib/components/AgendaPanel.svelte`
- Modify: `src/lib/components/AgendaImportPanel.svelte`

- [ ] **Step 1: Add local metadata state**

In `src/routes/+page.svelte`, import:

```ts
import type { AiPlanResponse } from '$lib/ai-plan-engine.js';
```

Add:

```ts
let sessionAiLastResponse: AiPlanResponse | null = $state(null);
let agendaAiLastResponse: AiPlanResponse | null = $state(null);
```

After each successful AI response:

```ts
sessionAiLastResponse = text;
```

and:

```ts
agendaAiLastResponse = text;
```

On AI errors, set the corresponding response to `null`.

- [ ] **Step 2: Pass metadata props**

For `PlanEditorPanel`:

```svelte
aiLastResponse={sessionAiLastResponse}
```

This prop must be passed through `SessionEditorPanel` to `PlanEditorPanel`.

For `AgendaPanel`:

```svelte
aiLastResponse={agendaAiLastResponse}
```

This prop must be passed through `AgendaPanel` to `AgendaImportPanel`.

- [ ] **Step 3: Render metadata chips**

In both components, import the type:

```ts
import type { AiPlanResponse } from '$lib/ai-plan-engine.js';
```

Add prop:

```ts
aiLastResponse: AiPlanResponse | null;
```

Render after AI error and before the generate button:

```svelte
{#if aiLastResponse && (aiLastResponse.assumptions.length || aiLastResponse.changes.length || aiLastResponse.warnings.length)}
  <div class="ai-meta-list">
    {#each [...aiLastResponse.changes, ...aiLastResponse.assumptions, ...aiLastResponse.warnings] as item}
      <span class="ai-meta-chip">{item}</span>
    {/each}
  </div>
{/if}
```

- [ ] **Step 4: Add compact CSS**

In both components' style sections, add:

```css
.ai-meta-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 6px 0;
}

.ai-meta-chip {
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 3px 7px;
  font-size: 11px;
  color: var(--muted);
  background: var(--panel);
}
```

- [ ] **Step 5: Run checks**

Run:

```bash
npm run check
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/routes/+page.svelte src/lib/components/SessionEditorPanel.svelte src/lib/components/PlanEditorPanel.svelte src/lib/components/AgendaPanel.svelte src/lib/components/AgendaImportPanel.svelte
git commit -m "feat: show ai planning metadata"
```

## Task 6: Final Verification

**Files:**
- Existing app files only

- [ ] **Step 1: Run full automated checks**

Run:

```bash
npm test
npm run check
```

Expected: PASS.

- [ ] **Step 2: Start dev server**

Run:

```bash
npm run dev -- --host 127.0.0.1
```

Expected: Vite reports a local URL, usually `http://127.0.0.1:5173/`.

- [ ] **Step 3: Browser smoke test**

Open the app and verify:

- Planera AI panel still opens.
- It shows Fast pass, Dag med ankare, Fri dag.
- Generating without API key still shows the existing missing-key error.
- Agenda AI panel still opens.
- Existing strict/helpful controls still work.
- No text overlaps in the compact AI panel at desktop width.

- [ ] **Step 4: Commit final polish if needed**

If verification requires CSS or copy fixes:

```bash
git add src/routes/+page.svelte src/lib/components/PlanEditorPanel.svelte src/lib/components/AgendaImportPanel.svelte
git commit -m "fix: polish ai planning controls"
```

If no fixes are needed, do not create an empty commit.

## Self-Review

- Spec coverage: Fas 1 request model, planning modes, intent, metadata, provider compatibility, preview feedback, and no-agent boundary are covered.
- Placeholder scan: No task uses placeholder work; each implementation task includes concrete code or exact behavior.
- Type consistency: `AiPlanningMode`, `AiPlanIntent`, and `AiPlanResponse` names are used consistently across tasks.
- Scope check: Fas 2 and Fas 3 are intentionally excluded from implementation and remain roadmap items in the design spec.
