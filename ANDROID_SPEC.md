# Day Timer — Android App Specification

## App Concept

Day Timer is a visual classroom timer for teachers. The core idea: a teacher, often stressed and working on an iPad between students, needs to start a timed session in under 10 seconds, plan the day visually, and trust that nothing is ever lost.

The app has three panels arranged horizontally:

- **Left panel** — the activity list for the current session
- **Center** — a large circular clock / timer
- **Right panel** — the day's agenda (sessions scheduled across time)

All input auto-saves the moment you leave a field. There is no Save button anywhere.

---

## Data Model

All times are stored as **minutes since midnight** (integers, range 0–1440). For example, 08:30 = 510.

### Activity
An individual task within a session.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (UUID) | Unique identifier |
| `title` | String | Display name, e.g. "Reading" |
| `durationMinutes` | Int | Allocated time for this activity |
| `isPinned` | Boolean | If true, duration is fixed; if false, it auto-scales |
| `note` | String | Optional sub-text shown below the title |

**Auto-scaling rule:** When the session's total duration changes (e.g. user drags the clock end handle), unpinned activities redistribute the remaining time equally. Pinned activities keep their exact duration. Formula: `unpinnedDuration = (totalSessionMinutes - sum(pinnedMinutes)) / unpinnedCount`.

### Session
A scheduled block of time containing an ordered list of activities.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (UUID) | Unique identifier |
| `title` | String | e.g. "Mathematics" |
| `startMinutes` | Int | Start time in minutes since midnight |
| `activities` | List\<Activity\> | Ordered list |
| `extraInfo` | String | Optional session-wide note |

Total session duration = sum of all activity durations.

### AgendaDay
One calendar day containing one or more sessions.

| Field | Type | Notes |
|-------|------|-------|
| `date` | String (YYYY-MM-DD) | ISO date |
| `sessions` | List\<Session\> | Ordered by startMinutes |

---

## The Clock (Center Panel)

The clock is a circular canvas-drawn view. It is the heart of the app.

**Geometry:** Circle with center at (180, 180) in a 360×360 coordinate space. Outer radius ≈ 155, inner radius ≈ 65 (hollow ring). Each activity in the current session occupies an arc sector proportional to its duration.

**Span modes:** The clock can show 60 minutes, 120 minutes, or 720 minutes (full 12-hour view). The user cycles through these via a button. In 60-minute mode, one full revolution = 1 hour. In 12-hour mode, one full revolution = 12 hours.

**The "now" hand:** A thin radial line from center to edge shows the current time. It rotates in real time.

**Drag handles:**
- **Start handle** (outer edge at session start): drag to shift when the session begins. All activity durations stay the same; only the start time moves.
- **End handle** (outer edge at session end): drag to stretch or compress the session. Unpinned activities scale proportionally.
- **Boundary handles** (between two adjacent activities): drag to redistribute time between those two activities. Their combined total stays constant.

**Colors:** Each activity gets a distinct color from the palette. Past sectors (already elapsed) are visually dimmed.

---

## Left Panel — Activities

This panel shows the activities in the currently loaded session.

- Each activity is a row: title on the left, duration chip on the right (e.g. "15m").
- **Tap title** → inline text field opens. Leaving the field auto-saves.
- **Tap duration chip** → opens a numeric input for minutes, OR the user can drag the boundary handle on the clock to set the duration visually.
- **Swipe left on a row** → delete (with undo snackbar, 4 seconds).
- **Long-press and drag a row** → reorder activities.
- **"+" button** at the bottom → adds a new empty activity and immediately focuses its title field.
- The currently active activity (the one whose time is now) is highlighted.

---

## Right Panel — Sessions / Agenda

This panel is a day planner.

**Top:** A horizontal week strip (Mon–Sun). Tap a day to select it.

**Below:** A vertical timeline for the selected day. Each session is drawn as a colored rectangle, height proportional to its duration, positioned at the correct time.

- **Tap "+"** → creates a new session. A bottom sheet opens with: title field, start time picker (HH:MM), end time picker (HH:MM). Leaving any field auto-saves.
- **Tap a session block** → loads it into the clock and left panel. The session becomes the active timer session.
- **Drag the top edge** of a session block → shifts its start time (duration stays fixed).
- **Drag the bottom edge** of a session block → changes its end time (start stays fixed, activities auto-scale).
- **Tap and hold a session block** → edit mode: title and times become editable inline. Leaving any field auto-saves.

---

## Auto-Save Behavior

Every input field saves automatically when it loses focus (onFocusLost). There is a 300ms debounce so rapid typing does not trigger excessive writes. Destructive actions (delete activity, delete session) show a snackbar with "Undo" for 4 seconds before committing to the database.

There is no manual Save button. The user should never feel that data can be lost.

---

## Recommended Android Stack

- **UI:** Jetpack Compose
- **Clock rendering:** Compose `Canvas` API with `drawArc` and `detectDragGestures`
- **State:** `ViewModel` + `StateFlow` / `MutableStateFlow`
- **Persistence:** Room database (local-only for v1, no network)
- **Navigation:** Single-activity, panels shown/hidden based on screen width; on phone, panels are swipeable tabs

---

## Key Implementation Challenges

1. **Clock drag math:** Converting a pointer position (x, y) to a time value requires polar coordinate conversion. You need to handle angle wrapping (going past 0°/360°) and clamp to valid time ranges.
2. **Activity auto-scaling:** Any time a session's total duration changes, you must recalculate all unpinned activity durations. This must be done atomically to avoid visual flickering.
3. **Boundary drag constraint:** When dragging the handle between activity A and activity B, neither can go below a minimum duration (suggest: 2 minutes). The total of A+B must remain constant.
4. **Timeline touch targets:** Session blocks in the right panel can be very small (a 10-minute session at 12h zoom). Top/bottom drag handles need a minimum hit area of 24dp regardless of block height.
5. **Focus-based auto-save in Compose:** `onFocusChanged` in Compose fires on every recomposition — be careful to only save when focus is actually lost (transitioning from focused to not focused), not on every render.
6. **Span mode and handle positions:** When the user switches span mode (60→720 min), all handle positions must be recalculated. The session may no longer be fully visible; decide on clamping vs scrolling behavior.
7. **Real-time clock hand:** The "now" hand must update every minute without causing a full recomposition of the entire clock. Use a separate `LaunchedEffect` + `delay(1000)` loop that only updates a `nowMinutes` state variable.
