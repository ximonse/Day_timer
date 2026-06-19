# Active Segment Checkoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make segment completion follow the timer sequence by allowing completion only for the active segment and transferring remaining time only to its immediate successor.

**Architecture:** Add pure checkoff helpers to `src/lib/session.ts` so time transfer, undo, and control visibility are deterministic and unit tested. Keep temporary done state in `+page.svelte`, while `Sidebar.svelte` uses the visibility helper to show a subdued completion control for the active segment and checked undo controls for segments completed during the current run.

**Tech Stack:** SvelteKit 5, TypeScript, Vitest, CSS

---

### Task 1: Define active-segment time transfer

**Files:**
- Modify: `src/lib/session.test.ts`
- Modify: `src/lib/session.ts`

- [ ] **Step 1: Write failing tests for completion and undo**

Add imports for `completeActiveSegment`, `undoCompletedSegment`, and `showSegmentDoneControl`, then add tests asserting:

```typescript
test('moves an active segment remainder only to the directly following segment', () => {
	expect(completeActiveSegment([20, 10, 15], 0, 6)).toEqual({
		minutes: [6, 24, 15],
		savedMinutes: 14
	});
});

test('restores transferred time from the directly following segment', () => {
	expect(undoCompletedSegment([6, 24, 15], 0, 14)).toEqual([20, 10, 15]);
});

test('shortens the final active segment without transferring time', () => {
	expect(completeActiveSegment([10, 20], 1, 7)).toEqual({
		minutes: [10, 7],
		savedMinutes: 13
	});
});

test('shows completion for the active segment and undo for completed segments only', () => {
	expect(showSegmentDoneControl(true, false)).toBe(true);
	expect(showSegmentDoneControl(false, true)).toBe(true);
	expect(showSegmentDoneControl(false, false)).toBe(false);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- src/lib/session.test.ts`

Expected: FAIL because the three helper exports do not exist.

- [ ] **Step 3: Implement the minimal pure helpers**

Add functions to `src/lib/session.ts` with these signatures:

```typescript
export interface SegmentCompletion {
	minutes: number[];
	savedMinutes: number;
}

export function completeActiveSegment(
	minutes: number[],
	activeIndex: number,
	elapsedInSegment: number
): SegmentCompletion

export function undoCompletedSegment(
	minutes: number[],
	completedIndex: number,
	savedMinutes: number
): number[]

export function showSegmentDoneControl(isActive: boolean, isDone: boolean): boolean
```

`completeActiveSegment` rounds elapsed time, keeps a minimum duration of one minute, and adds the saved remainder only to `activeIndex + 1`. `undoCompletedSegment` restores the saved amount to the completed segment and subtracts it only from `completedIndex + 1`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- src/lib/session.test.ts`

Expected: all tests in `session.test.ts` pass.

### Task 2: Apply the sequential checkoff behavior

**Files:**
- Modify: `src/routes/+page.svelte`
- Modify: `src/lib/components/Sidebar.svelte`

- [ ] **Step 1: Replace proportional redistribution**

Import the three new helpers from `$lib/session.js`. In `toggleSegmentDone`, reject unchecked block IDs unless they are currently active. Apply `completeActiveSegment` to the current minute array and save its `savedMinutes`. For undo, apply `undoCompletedSegment`. Remove both calls to `allocateBlockMinutes` from the checkoff path.

- [ ] **Step 2: Restrict and clarify the completion control**

In `Sidebar.svelte`, render the button only when:

```svelte
{#if !isViewMode && onToggleSegmentDone && showSegmentDoneControl(isActive, doneBlockIds.includes(b.id))}
```

Keep the checked control available for undo. Update the unchecked title to state that remaining time goes to the next segment.

- [ ] **Step 3: Make the visible control subdued but discoverable**

Keep `.seg-done-btn` rendered at normal opacity with a muted border and foreground. Use hover and `.checked` only to increase contrast; do not depend on hover for visibility.

- [ ] **Step 4: Run focused tests and static checks**

Run:

```powershell
npm test -- src/lib/session.test.ts
npm run check
```

Expected: both commands exit successfully with no test or Svelte/TypeScript errors.

### Task 3: Verify the complete change

**Files:**
- Review: `src/lib/session.ts`
- Review: `src/lib/session.test.ts`
- Review: `src/routes/+page.svelte`
- Review: `src/lib/components/Sidebar.svelte`

- [ ] **Step 1: Run the full automated suite**

Run:

```powershell
npm test
npm run build
```

Expected: all Vitest tests pass and the production build exits successfully.

- [ ] **Step 2: Review the diff against the design**

Run: `git diff --check; git diff --stat; git diff`

Confirm there is no proportional redistribution in the checkoff path, later segments remain unchanged, and only active or already checked segments expose the control.

- [ ] **Step 3: Commit the implementation**

Run:

```powershell
git add src/lib/session.ts src/lib/session.test.ts src/routes/+page.svelte src/lib/components/Sidebar.svelte docs/superpowers/plans/2026-06-19-active-segment-checkoff.md
git commit -m "fix: keep segment checkoff sequential"
```
