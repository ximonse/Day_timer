## Day_timer Refactor Tasks

This file turns the architecture plan into concrete implementation slices against the current codebase.

### Current pressure points

- `src/routes/+page.svelte` still mixes timer runtime, plan editing, library actions, workspace actions, import, and timeline interaction.
- `Plan` still shares too much of the old session editor flow with `Now`, which makes selection and save behavior harder to understand.
- Mobile still carries some old layout assumptions (`timer` vs `plan`) that can fight the new section model.

### Recommended order

1. Strengthen `Plan` as its own editing context
   - Show a clear selected-block card with save state
   - Only show the plan editor when a block is actually selected
   - Keep raw agenda text framed as import, not as the main editor

2. Extract remaining section panels from `+page.svelte`
   - `NowEditorPanel`
   - `PlanEditorPanel`
   - `AgendaImportPanel`
   - Shared `SectionHero`

3. Normalize section navigation behavior
   - Remove leftover mobile-tab assumptions from old layout logic
   - Route all section changes through one helper

4. Introduce explicit plan item identity and editor state
   - Stable selection by item id
   - `selectedId`
   - `dirty`
   - `saveStatus`
   - `lastSavedAt`

5. Split state/services by domain
   - `timer`
   - `plan`
   - `library`
   - `workspace`
   - persistence helpers for agenda sync/import

6. Add ICS import on top of the stronger `Plan` model
   - preview imported events
   - choose editable vs linked import mode
   - surface source badges in the selected block editor

### File-by-file next targets

- `src/routes/+page.svelte`
  - continue shrinking orchestration/template weight
  - move section-specific form markup out into components

- `src/lib/components/PlanSelectionCard.svelte`
  - grow into a richer selected-block header with save/source info

- `src/lib/components/AgendaImportPanel.svelte`
  - new extraction target for raw agenda import and future ICS controls

- `src/lib/state.svelte.ts`
  - future home for section-level editor metadata once the UI model is stable

- `src/lib/parse.ts`
  - keep import/parsing responsibilities here, separate from live editor concerns
