# Save and run flow review

Status: 2026-05-27

## Current model

Day Timer currently has several state layers that can look like one thing in the UI:

- Active editor/session: `dayTitle`, `blocks`, `extraInfo`, `startMin`.
- Section drafts: `nowDraft` and `planDraft`.
- Day agenda text: `agendaText` / `agendaText2`, plus the editable `agendaDraft`.
- Workspace sync: the account-backed document saved through `/api/sync`.

Local persistence happens often through `appState.persist()`. Account sync can happen manually and through autosave. Day text is different: typed agenda text does not become the real agenda until `Spara i dagplan`.

## Main UX problem

The app has several context-dependent buttons:

- `Nu` both changes view and loads the active or next agenda session.
- `Kör` in the compact/menu layer enters run mode and also loads what should happen now.
- `Kör!` in the Nu editor starts/saves the current editor content into today's agenda.
- `Spara` in Planera updates the selected agenda block, but creates a new agenda block if no explicit block is selected.

This is powerful, but it makes the app feel unreliable because the user must know hidden state: active section, selected agenda block, dirty agenda draft, run mode, and sync state.

## Root issue found

The fallback session used by `Nu`/`Kör` was a real editable session:

```text
Lektion 45m
```

That meant a placeholder could leak into the editor, drafts, agenda, and sync. The user could then accidentally save a generated dummy lesson as real plan content.

## Target model

The app should separate these concepts:

- View what is happening now.
- Edit a real planned block.
- Create a new block.
- Import or mass-edit day text.
- Sync data between devices.

`Körläge` should be read-focused. It may load an active or upcoming agenda session, but it should not create real plan content just because no session exists.

`Nu` should show:

- active agenda session if one is running,
- otherwise next upcoming agenda session today,
- otherwise an empty "no session" state.

It should not manufacture a real `Lektion 45m`.

## Phase 1 changes

- Allow empty editor/session blocks as a valid state.
- Change default/fallback session from `Lektion 45m` to an empty "Inget pass just nu" state.
- Prevent `Kör!` / `Spara` from creating an agenda flow when there are no activities.
- Keep agenda text saving explicit through `Spara i dagplan`.

## Future cleanup

- Make button labels less conditional:
  - `Starta nu`
  - `Uppdatera valt block`
  - `Lägg till nytt block`
- Show explicit status:
  - `Utkast sparat lokalt`
  - `Dagplan ej sparad`
  - `Dagplan sparad`
  - `Synkat till konto`
- Move the state transitions behind small named functions instead of inline button handlers.
- Treat run mode as a read-only projection over agenda/session state.
