# Planner AI and UX Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix planner AI date/dialog defects, clarify save actions, separate pass/day AI settings, and remove directly related dead interfaces.

**Architecture:** Add a small pure `planner-ai` module for AI request composition and selected-date context. Keep Svelte components presentational: `+page.svelte` owns conversation state and request execution, while planner components expose clear fields and action labels.

**Tech Stack:** SvelteKit 5, TypeScript, Vitest, Playwright scripts

---

### Task 1: Add tested planner-AI request helpers

**Files:**
- Create: `src/lib/planner-ai.ts`
- Create: `src/lib/planner-ai.test.ts`
- Modify: `src/lib/ai-plan-engine.test.ts`
- Modify: `src/lib/ai-plan-engine.ts`

- [ ] Write tests showing that agenda context uses the selected date and that follow-up input contains the original request, AI questions, and user answers.
- [ ] Run `npm test -- src/lib/planner-ai.test.ts src/lib/ai-plan-engine.test.ts` and verify the tests fail for missing behavior.
- [ ] Implement `buildAgendaAiContext` and `composeAiConversationInput`.
- [ ] Rename flexibility level 3 from `Autopilot` to `Fråga först`.
- [ ] Run the focused tests and verify they pass.

### Task 2: Implement coherent pass and agenda AI dialogue

**Files:**
- Modify: `src/routes/+page.svelte`
- Modify: `src/lib/components/PlanEditorPanel.svelte`
- Modify: `src/lib/components/AgendaImportPanel.svelte`

- [ ] Add separate session and agenda flexibility state.
- [ ] Add conversation seed state for each AI surface.
- [ ] Use the pure helpers in `runAiParts` and `runAiAgenda`.
- [ ] Render a pass-AI textarea again.
- [ ] When questions are returned, clear the answer field, retain the seed, and label the next action `Skicka svar`.
- [ ] Clear dialogue state after a usable plan is applied.
- [ ] Route schedule-import errors into the visible agenda AI error state.

### Task 3: Clarify planner save semantics

**Files:**
- Modify: `src/routes/+page.svelte`
- Modify: `src/lib/components/PlanEditorPanel.svelte`

- [ ] Use `Klar` for an explicitly selected agenda block.
- [ ] Use `Lägg till i dagplan` when creating an unscheduled block.
- [ ] Show `Lägg till som nytt` only while editing a selected block.
- [ ] Replace generic autosave wording with direct-edit or not-yet-added wording.

### Task 4: Remove directly related dead interfaces

**Files:**
- Modify: `src/lib/components/SessionEditorPanel.svelte`
- Modify: `src/lib/components/PlanEditorPanel.svelte`
- Modify: `src/lib/components/AgendaImportPanel.svelte`
- Modify: `src/routes/+page.svelte`
- Delete: `src/lib/components/PlanSelectionCard.svelte`

- [ ] Remove unused planner section props, unused help/history props, obsolete prompt-mode callbacks, the empty paste callback, and unused schedule UI state.
- [ ] Confirm `rg` finds no remaining references to removed props or `PlanSelectionCard`.
- [ ] Run `npm run check`.

### Task 5: Update planner E2E coverage and verify

**Files:**
- Modify: `tests/runda6-delning-admin-ai.mjs`
- Modify: `tests/runda4-planera-agenda.mjs` only if selectors are stale.

- [ ] Update selectors for `Hjälp av AI`, the restored textarea, flexibility slider, and `Skapa dagplan`.
- [ ] Run `npm test`.
- [ ] Run `npm run check`.
- [ ] Run `npm run build`.
- [ ] Run the available planner E2E script when its environment is usable; otherwise document the blocker.
- [ ] Inspect `git diff --check` and review the final diff against the design.

### Task 6: Commit

**Files:**
- Stage all files listed above plus the design and plan documents.

- [ ] Commit with `fix: harden planner ai and save ux`.
