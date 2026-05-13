# Day Timer Foundation Plan

## Why This Exists

`day_timer` is growing from a timer into a broader planning product. The current app already combines:

- a live timer
- a day planner / agenda
- a template library
- sync / sharing / AI configuration

That combination is promising, but the current interface and state model make it hard for beginners to understand what they are editing, what is saved, and where changes go. Before adding features like ICS import and calendar sources, the product needs a clearer foundation.

## Core Diagnosis

The current UX is action-first instead of object-first.

Users can change many things, but the app does not always make it obvious whether they are editing:

- the live timer session
- the selected agenda block
- imported raw agenda text
- a reusable template
- synced account/workspace data

This creates three problems:

1. Save behavior feels unreliable.
2. The settings/editing area mixes unrelated concerns.
3. Future features like ICS import will increase confusion unless the product model is clarified first.

## Product Direction

The app should be reorganized into four clear product areas:

### 1. Now

Purpose: run the current timer session.

Contains:

- clock
- current title
- current parts/blocks
- start/end controls
- warnings
- quick start

Rule: only session editing belongs here.

### 2. Plan

Purpose: manage today’s agenda/day plan.

Contains:

- agenda timeline
- selected block editor
- day navigation
- import tools
- future ICS/calendar source management

Rule: agenda and calendar work belong here.

### 3. Library

Purpose: manage reusable templates/mallar.

Contains:

- template list
- search/filter
- preview
- apply to timer
- add to plan

Rule: separate reusable sessions from today’s live plan.

### 4. Workspace

Purpose: app-level infrastructure and advanced features.

Contains:

- sync/login
- sharing
- AI provider config
- import source configuration
- advanced preferences

Rule: keep this away from the primary beginner flow.

## Information Architecture

Recommended desktop shell:

- left navigation rail
  - Now
  - Plan
  - Library
  - Workspace
- center main content area
- right contextual editor/details panel

Recommended mobile shell:

- bottom tabs
  - Now
  - Plan
  - Library
  - More

Where `More` opens Workspace-level tools.

## Editing Model

The app needs one consistent editing model for all important objects.

Every editable object should have:

- selection
- draft state
- dirty state
- save status

Example when clicking an agenda block:

- show a clear header like `Editing plan block`
- show the selected block name/time
- all visible controls edit that block only
- save status is always visible:
  - Saved
  - Unsaved changes
  - Saving...
  - Sync failed

## Save Strategy

Recommended strategy:

- local draft updates immediately
- autosave after a short debounce
- save on blur as backup
- save immediately on selection change
- always show save status

Reserve explicit buttons for higher-level actions only:

- Save as template
- Import ICS
- Sync now
- Start sharing

Do not mix `oninput`, `onblur`, and explicit save rules inconsistently for ordinary block editing.

## Plan / Agenda Model

Inside Plan, separate the UI into three conceptual areas:

### Timeline

- day overview
- drag blocks
- click block to select

### Selected Block

- title
- start
- duration / end
- parts
- notes
- warnings
- source badge

### Import

- paste plan text
- import ICS
- connect calendar sources later

This keeps raw import separate from structured editing.

## ICS / Calendar Direction

ICS import should be treated as a source pipeline, not as a random extra button.

Imported events should support provenance states such as:

- external
- linked
- converted
- detached

Beginner-friendly actions:

- Preview import
- Add to today’s plan
- Keep linked to calendar
- Edit manually

The user should always understand whether a block is:

- manually created
- from a template
- imported from a calendar
- detached from its source

## State Architecture

The current flat state should be split into domain state.

Suggested state domains:

- `timerState`
- `planState`
- `libraryState`
- `workspaceState`
- `uiState`

### timerState

- current session
- display mode
- warnings
- running timer context

### planState

- days
- agenda blocks
- selected day
- selected block id
- import metadata
- calendar source info

### libraryState

- templates
- sort/filter state
- recent/last used

### workspaceState

- sync auth
- sharing state
- AI config
- import settings

### uiState

- active section
- open panels
- dirty flags
- save indicators
- toasts

## Stable Identity

Agenda items and editable plan objects should be tracked by stable IDs everywhere.

Avoid relying on:

- array index
- parsed object identity
- title/time combinations as identity

Stable IDs are necessary for:

- reliable save behavior
- selection persistence
- conflict handling
- ICS/calendar provenance

## Component Refactor Direction

The large page should be gradually decomposed.

Suggested target components:

- `AppShell`
- `NowView`
- `TimerClock`
- `SessionEditor`
- `PlanView`
- `AgendaTimeline`
- `AgendaBlockEditor`
- `AgendaImportPanel`
- `LibraryView`
- `TemplateList`
- `WorkspaceView`
- `SyncPanel`
- `SharePanel`
- `AISettingsPanel`

Suggested support modules:

- `persistence`
- `agenda-sync`
- `import-ics`

## Beginner UX Principles

The redesign should follow these product rules:

1. One screen should have one main job.
2. One selected object at a time.
3. Save state must always be visible.
4. Major actions must say where the result goes.
5. Advanced features should not dominate the default view.

## Recommended Refactor Order

1. Add top-level product navigation:
   - Now
   - Plan
   - Library
   - Workspace

2. Move sync/share/AI config out of the main editing card into Workspace.

3. Build a dedicated selected-block editor for Plan.

4. Move template management into Library.

5. Split flat state into domain stores.

6. Add ICS import on top of the clearer Plan model.

## Immediate Priority

Before new import features:

1. clarify information architecture
2. unify the editing/save model
3. stabilize agenda identity and selection handling

These steps will make the app easier for beginners and safer to extend.
