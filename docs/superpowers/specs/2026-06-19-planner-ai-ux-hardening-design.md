# Planner AI and UX Hardening Design

## Goal

Make Planera safer and easier to understand without redesigning its overall structure.

## AI Behavior

- Agenda AI must use the selected planning date, not today's date.
- Pass AI and agenda AI keep separate flexibility settings.
- Flexibility level 3 is labelled `Fråga först`, matching its actual question-first behavior.
- Both AI surfaces support a two-step question flow:
  1. the user submits an initial request;
  2. if AI asks questions, the same input becomes an answer field and the next request includes the original request, AI questions, and user answers.
- AI output remains a draft. Agenda AI still requires explicit approval before saving.

## Planner Save UX

- Editing a selected agenda block is described as direct editing.
- The primary action for a selected block is `Klar`.
- The secondary action is `Lägg till som nytt`.
- With no selected block, the primary action is `Lägg till i dagplan`; the duplicate secondary action is hidden.
- Status text must distinguish direct editing from a new unsaved block.

## Code Boundaries

- Add pure planner-AI helpers for request composition and date context so regressions are unit tested.
- Keep request execution in `+page.svelte` for this phase.
- Remove only dead props and state directly connected to the changed planner and AI flow.
- Do not restructure the whole page, replace components, or change storage and sync architecture.

## Validation

- Unit tests cover selected-date context and question/answer composition.
- AI plan-engine tests cover the renamed flexibility label.
- Svelte checks and full tests pass.
- Planner E2E selectors and expectations reflect the current UI.
- Desktop and mobile planner surfaces are inspected when browser tooling is available.
