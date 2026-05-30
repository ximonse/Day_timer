# Save and Sync Rules

This document is the working contract for Day Timer save behavior. It exists to keep `Nu`, `Planera`, agenda editing, run mode, local persistence, and account sync from drifting apart.

## Data Layers

Day Timer has four relevant layers:

- Active session state: `dayTitle`, `blocks`, `extraInfo`, and `startMin`. This drives the clock and left panel.
- Editor drafts: `nowDraft` and `planDraft`. These preserve the last editor state for `Nu` and `Planera`.
- Agenda text: `agendaText` and `agendaText2`. These are the saved day plans for the open and private agenda views.
- Workspace sync: the account-backed document saved through `/api/sync`, including drafts, agendas, templates, history, and display preferences.

`localStorage` is allowed to update often. Redis/Vercel sync should not update on every keystroke.

## General Rule

Local persistence is immediate. Account sync is delayed or flushed at a clear boundary.

Immediate local persistence means the app can recover from reloads and crashes. Delayed account sync keeps Redis/Vercel usage reasonable and avoids network noise while the user is still typing.

## Account Sync Timing

Account sync should happen in these ways:

- Debounced after edits, normally after a short pause.
- Immediately when the user clicks explicit sync/save controls.
- Immediately when a pending autosave is flushed by a boundary: focus leaves an input, the user clicks another surface, switches app section, or toggles run/menu mode.
- On drag end for timer and agenda interactions, not during every pointer move.
- Never as a duplicate POST for the same workspace hash while an identical save is already in flight.

## Nu

`Nu` is the current working session.

When `Nu` is backed by an agenda block, edits to title, activities, comments, undertext, durations, and timer segment drags may write back to the agenda immediately.

When `Nu` has no agenda block, quick-start creates a new agenda item when the user starts the session.

## Planera

`Planera` has two modes:

- Selected agenda block: edits autosave back to that block.
- New unsaved draft: edits stay as a draft until the user saves or creates a block.

For a selected agenda block, title edits, activities, undertext, `&` comments, `&&` comments, timer duration changes, and left-panel edits should update the agenda immediately and then use debounced account sync.

For a new unsaved draft, the app must not create agenda blocks on every keystroke. The user must commit the draft with `Spara` or `Nytt`.

## Dagtext

Dagtext is separate from the active session editor.

Typing in the day text area only edits the draft. It becomes real agenda data when the user clicks `Spara i dagplan` or approves an AI draft.

Automatic cloud loading must pause while day text has unsaved changes.

## Agenda Panel

Agenda block actions operate directly on agenda text:

- Rename block: save immediately.
- Delete block: save immediately.
- Resize block by dragging top or bottom: update visually during drag, save on drag end.
- Move block in the agenda: update on drop, save on drag end.
- Add block: create a 45-minute block and select it for editing.

These changes should persist locally immediately and use account autosave without duplicate identical POSTs.

## Run Mode

Run mode is read-focused. It may inspect agenda blocks and current session activities, but it should not open write surfaces on reload.

The play/menu toggle should flush pending account autosave before switching state.

## Sync Safety

Automatic sync should not overwrite local unsaved day text.

Manual save is never skipped, even if the workspace hash appears unchanged, because manual saves may intentionally create snapshots.

Automatic saves may be skipped when the workspace hash is already synced or an identical save is already in flight.

## Regression Coverage

Keep tests around these rules:

- Non-manual autosave skips unchanged workspace data.
- Non-manual autosave skips identical in-flight workspace data.
- Manual save is not skipped.
- Selected agenda block edits from `Planera` update agenda text.
- New unsaved `Planera` drafts do not create agenda blocks per keystroke.
- Active `Nu` agenda edits write back to the agenda.
- Drag interactions save on end, not during every pointer move.
