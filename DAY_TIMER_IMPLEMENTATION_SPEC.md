# Day Timer Implementation Spec

## Goal

Introduce a stronger product foundation without rewriting the app:

- separate the product into `Now`, `Plan`, `Library`, and `Workspace`
- reduce beginner confusion about what is being edited
- prepare the codebase for ICS import and future calendar sources
- stabilize save/sync behavior around agenda-linked sessions

## Current File Mapping

### Main implementation

- [src/routes/+page.svelte](/mnt/c/Users/ximon/kodprojekt/day_timer/src/routes/+page.svelte)
  - currently contains timer rendering, drag logic, agenda logic, flows, sync, share, AI config, and most UI

- [src/routes/+layout.svelte](/mnt/c/Users/ximon/kodprojekt/day_timer/src/routes/+layout.svelte)
  - global CSS
  - layout primitives for sidebar, main, agenda, controls, toolbar, mobile tabs

### State

- [src/lib/state.svelte.ts](/mnt/c/Users/ximon/kodprojekt/day_timer/src/lib/state.svelte.ts)
  - app-wide persisted state

### Parsing / agenda model

- [src/lib/parse.ts](/mnt/c/Users/ximon/kodprojekt/day_timer/src/lib/parse.ts)
  - text import/export for session parts and agenda days

## Recommended Refactor Order

## Phase 1: Introduce Product Sections

### Scope

Add persisted top-level sections:

- `now`
- `plan`
- `library`
- `workspace`

### File changes

- `src/lib/state.svelte.ts`
  - add `activeSection`

- `src/routes/+page.svelte`
  - add section navigation UI
  - keep existing app behavior, but reorganize the control panel into section-based groupings

- `src/routes/+layout.svelte`
  - add section-nav and section-card styling

### Outcome

The app starts to feel like four product areas instead of one large settings card.

## Phase 2: Move Workspace Concerns Out of Main Editing

### Scope

Take these out of the primary editing flow and place them under `Workspace`:

- sync/login
- share
- AI provider config

### File changes

- `src/routes/+page.svelte`
  - move the current blocks around lines ~1964-2032 into a workspace section

### Outcome

Beginners see session editing first, not infrastructure settings.

## Phase 3: Strengthen Plan Editing

### Scope

Make `Plan` explicitly about editing the selected agenda block.

### File changes

- `src/routes/+page.svelte`
  - add selected block summary card
  - keep current title/parts/time editor usable in `Plan`
  - clarify when a session is linked to agenda

- `src/lib/parse.ts`
  - keep import behavior separate from structured editing behavior

### Outcome

Clicking an agenda block leads to a clearer editing experience.

## Phase 4: Library Separation

### Scope

Move template concerns under `Library`.

### File changes

- `src/routes/+page.svelte`
  - isolate save/load/add template controls in one section

### Outcome

Reusable sessions are clearly separated from today’s live plan.

## Phase 5: Save / Sync Reliability

### Scope

Fix identified reliability issues while the new structure is introduced.

### Required fixes

- agenda-linked edits must persist `extraInfo`
- clearing `extraInfo` from text parsing must really clear it
- section changes should not cause hidden state confusion

### File changes

- `src/routes/+page.svelte`
  - update `syncTimerToAgenda()`
  - update `handlePartsInput()`

## Phase 6: Future Component Extraction

After the section model is in place, split `+page.svelte` into components.

### Target components

- `src/lib/components/app/AppShell.svelte`
- `src/lib/components/now/NowView.svelte`
- `src/lib/components/plan/PlanView.svelte`
- `src/lib/components/plan/AgendaTimeline.svelte`
- `src/lib/components/plan/AgendaBlockEditor.svelte`
- `src/lib/components/library/LibraryView.svelte`
- `src/lib/components/workspace/WorkspaceView.svelte`

### Target services / stores

- `src/lib/services/agenda-sync.ts`
- `src/lib/services/import-ics.ts`
- `src/lib/stores/timer.ts`
- `src/lib/stores/plan.ts`
- `src/lib/stores/library.ts`
- `src/lib/stores/workspace.ts`

## First Coding Slice

The first implementation slice should do all of this without rewriting the whole app:

1. Add `activeSection` to persisted state.
2. Add a visible section nav in the main controls area.
3. Reorganize controls:
   - `Now` shows current session editing
   - `Plan` shows selected agenda context plus current session editor
   - `Library` shows templates
   - `Workspace` shows sync/share/AI
4. Fix agenda sync of `extraInfo`.
5. Fix clearing of `extraInfo` from text parsing.

## Commit Strategy

Because the worktree already contains many modified files, commit in small focused steps:

1. `foundation: add section model and implementation spec`
2. `ui: split controls into now plan library workspace`
3. `fix: persist agenda extra info reliably`

Only include files touched for the active slice when possible.
