# DayPlan Domain Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move agenda/session/timer writeback logic out of `src/routes/+page.svelte` into small tested domain modules so Day Timer stops accumulating layout and sync patches in the page component.

**Architecture:** Keep the current SvelteKit app and current UI. Add domain modules for DayPlan, ActiveSession binding, and AgendaLayout, then migrate one write path at a time. Day text remains a powerful import/export editor, but structured day/session data becomes the internal canonical representation for UI operations.

**Tech Stack:** SvelteKit 5, TypeScript, Vitest, existing `parse.ts`, `agenda.ts`, `session.ts`, and `session-agenda-binding.ts`.

---

## Why This Refactor

The current code has grown around `src/routes/+page.svelte`, now over 3300 lines. The page coordinates:

- agenda text parsing and save
- selected agenda day/session
- active session drafts
- timer segment dragging
- agenda block dragging/resizing
- Nu/Planera/Kör transitions
- sync/load/save orchestration

This causes recurring bugs because several UI surfaces can mutate related data through different paths:

- dagtext field
- agenda drag
- timer segment drag
- left/sidebar activity edits
- session title edits
- AI-generated text
- Nu/Kör auto-load

The refactor must improve product reliability and datatrygghet, not add technical ceremony. The target is a modular monolith with a clearer data model, matching `VISION_FRAMEWORK.md` and `WORKSPACE_SYNC_ARCHITECTURE.md`.

---

## Scope

### In Scope

- Add tested domain modules.
- Keep current visual UI.
- Keep current persistence API and workspace shape for this slice.
- Route agenda layout through a pure layout module.
- Route active session writeback decisions through a pure binding module.
- Reduce direct agenda/session mutation inside `+page.svelte` where touched.

### Out Of Scope

- No database change.
- No new sync backend.
- No Redux/global state framework.
- No CRDT/realtime collaboration.
- No full rewrite of `+page.svelte`.
- No UI redesign beyond behavior-preserving wiring.

---

## Target Model

```text
Day text draft
Left panel edits
Timer segment drag
Agenda drag / resize
AI suggestions
        |
        v
Domain actions
        |
        v
DayPlan + ActiveSessionBinding
        |
        v
Derived UI:
- Agenda layout items
- Timer blocks
- Serialized day text
- Save/sync payload
```

---

## Files

### Create

- `src/lib/day-plan.ts`
  - Small normalized day/session/activity model.
  - Conversion helpers from existing `AgendaDay`/`Flow`.
  - Conversion helpers back to existing agenda data so migration can be incremental.

- `src/lib/day-plan.test.ts`
  - Roundtrip and identity tests for DayPlan.

- `src/lib/agenda-layout.ts`
  - Pure timeline layout.
  - `minuteToY`, `yToMinute`, `layoutAgendaItems`, compact class decisions.

- `src/lib/agenda-layout.test.ts`
  - Tests for first-session positioning, short item height, y/minute conversion, drag scale.

- `src/lib/active-session-binding.ts`
  - Explicit active-session source and writeback rules.
  - Functions that decide if sidebar/timer edits write to agenda.

- `src/lib/active-session-binding.test.ts`
  - Tests for unscheduled, agenda-bound, template-copy, plan vs run behavior.

### Modify

- `src/lib/agenda.ts`
  - Keep low-level agenda helpers.
  - Gradually move layout-specific helpers into `agenda-layout.ts`.

- `src/lib/session-agenda-binding.ts`
  - Either wrap or delegate to `active-session-binding.ts`.
  - Keep old exports temporarily if existing UI still imports them.

- `src/lib/components/AgendaPanel.svelte`
  - Render `AgendaLayoutItem[]` instead of calculating layout percentages inline.

- `src/routes/+page.svelte`
  - Derive `DayPlan`, `ActiveSessionBinding`, and `AgendaLayout` in clearly named blocks.
  - Replace touched direct mutation paths with domain helper calls.

---

## Task 1: Add DayPlan Model

**Files:**
- Create: `src/lib/day-plan.ts`
- Create: `src/lib/day-plan.test.ts`

- [ ] **Step 1: Write failing tests for conversion from AgendaDay**

Create `src/lib/day-plan.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import type { AgendaDay } from './parse.js';
import type { Flow } from './state.svelte.js';
import { dayPlanFromAgendaDay, agendaDayFromDayPlan } from './day-plan.js';

function flow(patch: Partial<Flow>): Flow {
	return {
		id: patch.id ?? patch.title ?? 'flow',
		title: patch.title ?? 'Session',
		parts: patch.parts ?? ['Aktivitet'],
		minutes: patch.minutes ?? [30],
		warnings: patch.warnings ?? [true],
		notes: patch.notes ?? [''],
		extraInfo: patch.extraInfo ?? '',
		...(patch.startMin !== undefined ? { startMin: patch.startMin } : {})
	};
}

describe('day plan model', () => {
	test('converts an agenda day into stable sessions and activities', () => {
		const agendaDay: AgendaDay = {
			date: '2026-06-03',
			flows: [
				flow({
					id: 'morning',
					title: 'Morgon',
					startMin: 8 * 60,
					parts: ['Te', 'Planera'],
					minutes: [15, 20],
					notes: ['ute', ''],
					warnings: [true, false],
					extraInfo: 'lugnt'
				})
			]
		};

		const plan = dayPlanFromAgendaDay(agendaDay, 7 * 60, () => 'new-id');

		expect(plan).toEqual({
			date: '2026-06-03',
			sessions: [{
				id: 'morning',
				title: 'Morgon',
				startMin: 8 * 60,
				extraInfo: 'lugnt',
				activities: [
					{ id: 'morning-a0', title: 'Te', minutes: 15, note: 'ute', warning: true },
					{ id: 'morning-a1', title: 'Planera', minutes: 20, note: '', warning: false }
				]
			}]
		});
	});

	test('converts a day plan back to agenda day without losing ids', () => {
		const agendaDay = agendaDayFromDayPlan({
			date: '2026-06-03',
			sessions: [{
				id: 'session-1',
				title: 'Fokus',
				startMin: 9 * 60,
				extraInfo: '',
				activities: [
					{ id: 'a1', title: 'Start', minutes: 10, note: '', warning: true },
					{ id: 'a2', title: 'Jobb', minutes: 35, note: 'djupt', warning: false }
				]
			}]
		});

		expect(agendaDay.flows[0]).toMatchObject({
			id: 'session-1',
			title: 'Fokus',
			startMin: 9 * 60,
			parts: ['Start', 'Jobb'],
			minutes: [10, 35],
			notes: ['', 'djupt'],
			warnings: [true, false]
		});
	});
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```powershell
npm test -- src/lib/day-plan.test.ts
```

Expected: FAIL because `src/lib/day-plan.ts` does not exist.

- [ ] **Step 3: Implement DayPlan model**

Create `src/lib/day-plan.ts`:

```ts
import { buildAgendaItemsForDay } from './agenda.js';
import { type AgendaDay, totalFlowMinutes } from './parse.js';
import type { Flow } from './state.svelte.js';

export interface DayPlanActivity {
	id: string;
	title: string;
	minutes: number;
	note: string;
	warning: boolean;
}

export interface DayPlanSession {
	id: string;
	title: string;
	startMin: number;
	extraInfo: string;
	activities: DayPlanActivity[];
}

export interface DayPlan {
	date: string | null;
	sessions: DayPlanSession[];
}

export function dayPlanFromAgendaDay(day: AgendaDay, fallbackStart: number, createId: () => string): DayPlan {
	const items = buildAgendaItemsForDay(day, fallbackStart);
	return {
		date: day.date,
		sessions: items.map((item) => {
			const flow = item.flow;
			const sessionId = flow.id || createId();
			return {
				id: sessionId,
				title: flow.title,
				startMin: item.startMin,
				extraInfo: flow.extraInfo || '',
				activities: flow.parts.map((title, index) => ({
					id: `${sessionId}-a${index}`,
					title,
					minutes: flow.minutes[index] ?? 45,
					note: flow.notes?.[index] ?? '',
					warning: flow.warnings?.[index] ?? true
				}))
			};
		})
	};
}

export function flowFromDayPlanSession(session: DayPlanSession): Flow {
	return {
		id: session.id,
		title: session.title,
		startMin: session.startMin,
		parts: session.activities.map(activity => activity.title),
		minutes: session.activities.map(activity => activity.minutes),
		notes: session.activities.map(activity => activity.note),
		warnings: session.activities.map(activity => activity.warning),
		extraInfo: session.extraInfo
	};
}

export function agendaDayFromDayPlan(plan: DayPlan): AgendaDay {
	return {
		date: plan.date,
		flows: plan.sessions.map(flowFromDayPlanSession)
	};
}

export function totalDayPlanSessionMinutes(session: DayPlanSession): number {
	return session.activities.reduce((sum, activity) => sum + activity.minutes, 0);
}

export function dayPlanSessionFromFlow(flow: Flow, startMin: number): DayPlanSession {
	const sessionId = flow.id || flow.title || 'session';
	return {
		id: sessionId,
		title: flow.title,
		startMin,
		extraInfo: flow.extraInfo || '',
		activities: flow.parts.map((title, index) => ({
			id: `${sessionId}-a${index}`,
			title,
			minutes: flow.minutes[index] ?? totalFlowMinutes(flow),
			note: flow.notes?.[index] ?? '',
			warning: flow.warnings?.[index] ?? true
		}))
	};
}
```

- [ ] **Step 4: Run tests and verify pass**

Run:

```powershell
npm test -- src/lib/day-plan.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/day-plan.ts src/lib/day-plan.test.ts
git commit -m "refactor: add day plan domain model"
```

---

## Task 2: Add Agenda Layout Module

**Files:**
- Create: `src/lib/agenda-layout.ts`
- Create: `src/lib/agenda-layout.test.ts`
- Modify: `src/lib/agenda.ts`

- [ ] **Step 1: Write failing layout tests**

Create `src/lib/agenda-layout.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { buildAgendaLayout, minuteToY, yToMinute } from './agenda-layout.js';

describe('agenda layout', () => {
	test('places the first session near the top with breathing room', () => {
		const layout = buildAgendaLayout([
			{ id: 'a', title: 'Kort', startMin: 9 * 60, totalMin: 20 },
			{ id: 'b', title: 'Längre', startMin: 10 * 60, totalMin: 45 }
		]);

		expect(layout.window.start).toBe(8 * 60 + 30);
		expect(layout.items[0]).toMatchObject({
			id: 'a',
			topPx: 52.5,
			heightPx: 35,
			compact: true
		});
		expect(layout.items[1].topPx).toBe(157.5);
		expect(layout.items[1].heightPx).toBe(78.75);
		expect(layout.items[1].compact).toBe(false);
	});

	test('converts between minutes and y coordinates using the same window', () => {
		const layout = buildAgendaLayout([{ id: 'a', title: 'Kort', startMin: 9 * 60, totalMin: 20 }]);

		expect(minuteToY(9 * 60, layout.window)).toBe(52.5);
		expect(yToMinute(52.5, layout.window)).toBe(9 * 60);
		expect(yToMinute(60, layout.window, 5)).toBe(9 * 60 + 5);
	});
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```powershell
npm test -- src/lib/agenda-layout.test.ts
```

Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement agenda layout**

Create `src/lib/agenda-layout.ts`:

```ts
export const AGENDA_MINUTE_PX = 1.75;
export const AGENDA_TOP_BREATHING_ROOM_MIN = 30;
export const AGENDA_COMPACT_ITEM_MINUTES = 30;
export const AGENDA_DAY_START = 0;
export const AGENDA_DAY_END = 24 * 60;

export interface AgendaLayoutSourceItem {
	id: string;
	title: string;
	startMin: number;
	totalMin: number;
}

export interface AgendaLayoutWindow {
	start: number;
	end: number;
	minutes: number;
	heightPx: number;
}

export interface AgendaLayoutItem extends AgendaLayoutSourceItem {
	topPx: number;
	heightPx: number;
	topPct: number;
	heightPct: number;
	compact: boolean;
}

export interface AgendaLayout {
	window: AgendaLayoutWindow;
	items: AgendaLayoutItem[];
}

export function buildAgendaLayoutWindow(items: Pick<AgendaLayoutSourceItem, 'startMin' | 'totalMin'>[]): AgendaLayoutWindow {
	if (items.length === 0) {
		return {
			start: AGENDA_DAY_START,
			end: AGENDA_DAY_END,
			minutes: AGENDA_DAY_END - AGENDA_DAY_START,
			heightPx: (AGENDA_DAY_END - AGENDA_DAY_START) * AGENDA_MINUTE_PX
		};
	}
	const firstStart = Math.min(...items.map(item => item.startMin));
	const start = Math.max(AGENDA_DAY_START, firstStart - AGENDA_TOP_BREATHING_ROOM_MIN);
	const end = AGENDA_DAY_END;
	const minutes = Math.max(60, end - start);
	return { start, end, minutes, heightPx: minutes * AGENDA_MINUTE_PX };
}

export function minuteToY(minute: number, window: AgendaLayoutWindow): number {
	return (minute - window.start) * AGENDA_MINUTE_PX;
}

export function yToMinute(y: number, window: AgendaLayoutWindow, roundToMin = 1): number {
	const raw = window.start + y / AGENDA_MINUTE_PX;
	return Math.round(raw / roundToMin) * roundToMin;
}

export function buildAgendaLayout(items: AgendaLayoutSourceItem[]): AgendaLayout {
	const window = buildAgendaLayoutWindow(items);
	return {
		window,
		items: items.map((item) => {
			const topPx = minuteToY(item.startMin, window);
			const heightPx = item.totalMin * AGENDA_MINUTE_PX;
			return {
				...item,
				topPx,
				heightPx,
				topPct: topPx / window.heightPx * 100,
				heightPct: heightPx / window.heightPx * 100,
				compact: item.totalMin < AGENDA_COMPACT_ITEM_MINUTES
			};
		})
	};
}
```

- [ ] **Step 4: Run tests**

Run:

```powershell
npm test -- src/lib/agenda-layout.test.ts
```

Expected: PASS.

- [ ] **Step 5: Move layout constants from agenda.ts**

Modify `src/lib/agenda.ts` to re-export or remove duplicated layout helpers only after updating imports. Preserve public exports temporarily if existing code still imports them:

```ts
export {
	AGENDA_DAY_START as AGENDA_DAY_WINDOW_START,
	AGENDA_DAY_END as AGENDA_DAY_WINDOW_END,
	AGENDA_MINUTE_PX as AGENDA_TIMELINE_MINUTE_PX,
	AGENDA_TOP_BREATHING_ROOM_MIN,
	AGENDA_COMPACT_ITEM_MINUTES,
	buildAgendaLayoutWindow as buildAgendaVisualWindow
} from './agenda-layout.js';
```

Keep `AGENDA_DAY_WINDOW_MINUTES` and `AGENDA_TIMELINE_HEIGHT_PX` as compatibility constants if tests or existing imports require them.

- [ ] **Step 6: Run regression tests**

Run:

```powershell
npm test -- src/lib/agenda.test.ts src/lib/agenda-layout.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/lib/agenda-layout.ts src/lib/agenda-layout.test.ts src/lib/agenda.ts src/lib/agenda.test.ts
git commit -m "refactor: extract agenda layout model"
```

---

## Task 3: Route AgendaPanel Through Layout Items

**Files:**
- Modify: `src/routes/+page.svelte`
- Modify: `src/lib/components/AgendaPanel.svelte`

- [ ] **Step 1: Add derived layout in +page.svelte**

In `src/routes/+page.svelte`, import `buildAgendaLayout`:

```ts
import { buildAgendaLayout } from '$lib/agenda-layout.js';
```

Create a derived value after `agendaItems`:

```ts
const agendaLayout = $derived(buildAgendaLayout(agendaItems.map((item, index) => ({
	id: item.flow.id ?? `${item.startMin}-${item.flow.title}-${index}`,
	title: item.flow.title || '(utan rubrik)',
	startMin: item.startMin,
	totalMin: item.totalMin
}))));
```

Pass it to `AgendaPanel`:

```svelte
<AgendaPanel
  ...
  {agendaLayout}
  ...
/>
```

- [ ] **Step 2: Update AgendaPanel props**

In `src/lib/components/AgendaPanel.svelte`, import the type:

```ts
import type { AgendaLayout } from '$lib/agenda-layout.js';
```

Add prop:

```ts
agendaLayout,
```

and type:

```ts
agendaLayout: AgendaLayout;
```

- [ ] **Step 3: Render using layout items**

Inside each agenda item loop, map by index:

```svelte
{@const layoutItem = agendaLayout.items[ai]}
{@const topPct = layoutItem.topPct.toFixed(3)}
{@const heightPct = layoutItem.heightPct.toFixed(3)}
```

Replace compact expression:

```svelte
class:compact={layoutItem.compact}
```

Set timeline height:

```svelte
style="height: {agendaLayout.window.heightPx}px"
```

- [ ] **Step 4: Update drag math to use layout window**

In `src/routes/+page.svelte`, use:

```ts
const dropMin = yToMinute(dropY, agendaLayout.window, 5);
```

and store `window` or `windowMinutes` from `agendaLayout.window` at drag start.

- [ ] **Step 5: Run checks**

Run:

```powershell
npm run check
npm test -- src/lib/agenda-layout.test.ts src/lib/agenda.test.ts
```

Expected: `svelte-check` has 0 errors and the known existing warnings only; tests pass.

- [ ] **Step 6: Browser verification**

Run dev server if needed:

```powershell
npm run dev -- --host 127.0.0.1 --port 5174
```

Use browser/Playwright to verify:

- 09:00 first block is near top.
- 20m block height is 35px.
- Resizing does not scroll-jump.
- Drag preview still follows pointer.

- [ ] **Step 7: Commit**

```powershell
git add src/routes/+page.svelte src/lib/components/AgendaPanel.svelte
git commit -m "refactor: render agenda from layout model"
```

---

## Task 4: Add Active Session Binding Rules

**Files:**
- Create: `src/lib/active-session-binding.ts`
- Create: `src/lib/active-session-binding.test.ts`
- Modify: `src/lib/session-agenda-binding.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/active-session-binding.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { canWriteActiveSessionBack, nextBindingAfterSectionChange } from './active-session-binding.js';

describe('active session binding', () => {
	test('unscheduled and template sessions do not write back to agenda', () => {
		expect(canWriteActiveSessionBack({
			source: { kind: 'unscheduled' },
			activeSection: 'plan',
			planSelectionExplicit: true,
			forceUpdate: true
		})).toBe(false);

		expect(canWriteActiveSessionBack({
			source: { kind: 'template', templateId: 't1', title: 'Mall' },
			activeSection: 'plan',
			planSelectionExplicit: true,
			forceUpdate: true
		})).toBe(false);
	});

	test('agenda sessions write back only in explicit plan editing or forced update', () => {
		const source = { kind: 'agenda' as const, date: '2026-06-03', title: 'Pass', startMin: 9 * 60 };

		expect(canWriteActiveSessionBack({
			source,
			activeSection: 'plan',
			planSelectionExplicit: true,
			forceUpdate: false
		})).toBe(true);

		expect(canWriteActiveSessionBack({
			source,
			activeSection: 'plan',
			planSelectionExplicit: false,
			forceUpdate: false
		})).toBe(false);

		expect(canWriteActiveSessionBack({
			source,
			activeSection: 'now',
			planSelectionExplicit: false,
			forceUpdate: true
		})).toBe(true);
	});

	test('moving from implicit now inspection to plan clears agenda binding', () => {
		expect(nextBindingAfterSectionChange({
			oldSection: 'now',
			nextSection: 'plan',
			planSelectionExplicit: false,
			source: { kind: 'agenda', date: '2026-06-03', title: 'Pass', startMin: 9 * 60 }
		})).toEqual({
			source: { kind: 'unscheduled' },
			activeAgendaFlowRef: null,
			planSelectionExplicit: false
		});
	});
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```powershell
npm test -- src/lib/active-session-binding.test.ts
```

Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement binding rules**

Create `src/lib/active-session-binding.ts`:

```ts
import type { AppSection } from './state.svelte.js';
import type { AgendaFlowRef } from './agenda.js';
import type { SessionSource } from './session-agenda-binding.js';

export interface CanWriteBackInput {
	source: SessionSource;
	activeSection: AppSection;
	planSelectionExplicit: boolean;
	forceUpdate: boolean;
}

export function canWriteActiveSessionBack(input: CanWriteBackInput): boolean {
	if (input.source.kind !== 'agenda') return false;
	if (input.forceUpdate) return true;
	return input.activeSection === 'plan' && input.planSelectionExplicit;
}

export interface SectionChangeBindingInput {
	oldSection: AppSection;
	nextSection: AppSection;
	planSelectionExplicit: boolean;
	source: SessionSource;
}

export interface SectionChangeBindingResult {
	source: SessionSource;
	activeAgendaFlowRef: AgendaFlowRef | null | 'keep';
	planSelectionExplicit: boolean;
}

export function nextBindingAfterSectionChange(input: SectionChangeBindingInput): SectionChangeBindingResult {
	const clearImplicitAgendaSelection =
		input.oldSection === 'now' &&
		input.nextSection === 'plan' &&
		!input.planSelectionExplicit &&
		input.source.kind === 'agenda';

	if (clearImplicitAgendaSelection) {
		return {
			source: { kind: 'unscheduled' },
			activeAgendaFlowRef: null,
			planSelectionExplicit: false
		};
	}

	return {
		source: input.source,
		activeAgendaFlowRef: 'keep',
		planSelectionExplicit: input.planSelectionExplicit
	};
}
```

- [ ] **Step 4: Use binding rule in session-agenda-binding.ts**

Modify `syncSessionToAgenda()` in `src/lib/session-agenda-binding.ts`:

```ts
import { canWriteActiveSessionBack } from './active-session-binding.js';
```

Extend `SyncSessionToAgendaInput` with:

```ts
source: SessionSource;
```

Replace the current skip line:

```ts
if (!canWriteActiveSessionBack({
	source: input.source,
	activeSection: input.activeSection,
	forceUpdate: input.forceUpdate,
	planSelectionExplicit: input.planSelectionExplicit
})) return null;
```

- [ ] **Step 5: Update callers**

In `src/routes/+page.svelte`, update `syncTimerToAgenda()` call:

```ts
const result = syncSessionToAgenda({
  ...
  source: sessionSource,
  ...
});
```

- [ ] **Step 6: Run tests**

Run:

```powershell
npm test -- src/lib/active-session-binding.test.ts src/lib/session-agenda-binding.test.ts
npm run check
```

Expected: PASS and no new Svelte errors.

- [ ] **Step 7: Commit**

```powershell
git add src/lib/active-session-binding.ts src/lib/active-session-binding.test.ts src/lib/session-agenda-binding.ts src/lib/session-agenda-binding.test.ts src/routes/+page.svelte
git commit -m "refactor: centralize active session writeback rules"
```

---

## Task 5: Replace Section Binding Logic In Page

**Files:**
- Modify: `src/routes/+page.svelte`
- Modify: `src/lib/active-session-binding.test.ts`

- [ ] **Step 1: Add test for explicit plan selection preservation**

Append to `src/lib/active-session-binding.test.ts`:

```ts
test('keeps explicit agenda binding when moving from plan to now and back', () => {
	expect(nextBindingAfterSectionChange({
		oldSection: 'now',
		nextSection: 'plan',
		planSelectionExplicit: true,
		source: { kind: 'agenda', date: '2026-06-03', title: 'Pass', startMin: 9 * 60 }
	})).toEqual({
		source: { kind: 'agenda', date: '2026-06-03', title: 'Pass', startMin: 9 * 60 },
		activeAgendaFlowRef: 'keep',
		planSelectionExplicit: true
	});
});
```

- [ ] **Step 2: Run test**

Run:

```powershell
npm test -- src/lib/active-session-binding.test.ts
```

Expected: PASS if Task 4 implementation is correct.

- [ ] **Step 3: Replace logic in setActiveSection()**

In `src/routes/+page.svelte`, import:

```ts
import { nextBindingAfterSectionChange } from '$lib/active-session-binding.js';
```

Replace:

```ts
const clearImplicitAgendaSelection = oldSection === 'now' && section === 'plan' && !planSelectionExplicit;
```

and the related `if (clearImplicitAgendaSelection)` block with:

```ts
const bindingChange = nextBindingAfterSectionChange({
	oldSection,
	nextSection: section,
	planSelectionExplicit,
	source: sessionSource
});
```

Inside the `section === 'plan'` branch:

```ts
if (bindingChange.activeAgendaFlowRef === null) {
	activeAgendaFlowRef = null;
}
sessionSource = bindingChange.source;
planSelectionExplicit = bindingChange.planSelectionExplicit;
```

- [ ] **Step 4: Run checks**

Run:

```powershell
npm test -- src/lib/active-session-binding.test.ts
npm run check
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/routes/+page.svelte src/lib/active-session-binding.test.ts
git commit -m "refactor: use binding rules for section changes"
```

---

## Task 6: Browser Regression Pass

**Files:**
- No code files unless failures are found.

- [ ] **Step 1: Run full tests**

```powershell
npm test
npm run check
```

Expected:

- All Vitest tests pass.
- `svelte-check` reports 0 errors and only known existing warnings in `Sidebar.svelte`.

- [ ] **Step 2: Start dev server**

```powershell
npm run dev -- --host 127.0.0.1 --port 5174
```

- [ ] **Step 3: Verify agenda layout**

Create day text:

```text
@260603
#Kort 09:00
A 20m
#Längre 10:00
B 45m
#Minikort 11:00
C 15m
```

Expected:

- First item is near top.
- 20m item is 35px.
- Compact items keep same left color bar width.
- Scrolling to top and resizing a block does not jump back.

- [ ] **Step 4: Verify writeback**

Manual test:

1. Click an agenda block in Planera.
2. Edit title in left panel.
3. Confirm agenda block title updates.
4. Drag a timer segment.
5. Confirm same agenda block updates, not another block.
6. Switch to Nu and back to Planera without explicit plan selection.
7. Confirm no unexpected agenda writeback occurs.

- [ ] **Step 5: Verify day text**

Manual test:

1. Edit dagtext draft.
2. Confirm no autosave into agenda until `Spara i dagplan`.
3. Click `Spara i dagplan`.
4. Confirm selected day updates.
5. Confirm active agenda binding is either resolved or clearly released.

- [ ] **Step 6: Commit verification fixes if needed**

If browser testing reveals a regression, write a failing unit test for the corresponding domain module first, fix, and commit:

```powershell
git add <files>
git commit -m "fix: stabilize <specific behavior>"
```

---

## Task 7: Merge Readiness

**Files:**
- No code files unless documentation needs updating.

- [ ] **Step 1: Inspect branch diff**

Run:

```powershell
git diff --stat main
git diff main -- src/routes/+page.svelte
```

Expected:

- `+page.svelte` should have less business logic or clearer delegation.
- New modules should contain the logic for layout and binding.

- [ ] **Step 2: Run final checks**

```powershell
npm test
npm run check
```

- [ ] **Step 3: Push branch**

```powershell
git push origin codex/dayplan-domain-refactor
```

- [ ] **Step 4: Report to user**

Include:

- What was extracted.
- What behavior should be unchanged.
- What is now safer.
- What still remains in `+page.svelte`.
- Recommendation for merge or further iteration.

---

## Self-Review

### Spec Coverage

- Agenda layout: covered by Tasks 2 and 3.
- Active session binding: covered by Tasks 4 and 5.
- Dagtext/writeback: covered in Task 6 regression pass; full text-as-import refactor intentionally deferred.
- Sync/workspace: intentionally not changed in this slice, matching `WORKSPACE_PHASE1_SPEC.md` scope discipline.
- Avoiding god-file growth: covered by moving logic from `+page.svelte` into `day-plan.ts`, `agenda-layout.ts`, and `active-session-binding.ts`.

### Placeholder Scan

No `TODO`, `TBD`, or open-ended implementation placeholders are required to execute the plan. Browser verification steps are manual by nature but include exact expected behavior.

### Type Consistency

The plan consistently uses:

- `DayPlan`, `DayPlanSession`, `DayPlanActivity`
- `AgendaLayout`, `AgendaLayoutWindow`, `AgendaLayoutItem`
- `SessionSource`
- `canWriteActiveSessionBack`
- `nextBindingAfterSectionChange`

### Scope Check

This is intentionally one slice: domain extraction for layout and active-session binding. Workspace sync refactoring remains a later slice because doing both together would be too broad and would increase data-loss risk.
