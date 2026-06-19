# Active Segment Checkoff Design

## Purpose

Segment checkoff represents progression through the running timer, not a general task list. A user must not be able to complete segments in the past or future from the timer interface.

## Behavior

- Show the checkoff control only on the currently active segment.
- Keep the control permanently visible with subdued styling; hover may strengthen it but must not be required to discover it.
- When the active segment is checked:
  - keep the time already elapsed in that segment;
  - transfer all remaining time to the directly following segment only;
  - mark the segment as done.
- Do not show a checkoff control on past or future segments.
- If there is no following segment, shorten the active segment without transferring time.
- Undo restores the checked segment's saved time by taking that exact amount back from the directly following segment.

## Boundaries

- Deleting or editing a future activity remains a planning action and is not part of checkoff.
- No proportional redistribution across several segments.
- No changes to session ordering, persistence, or the general block allocation algorithm.

## Implementation Shape

Move the checkoff time calculation into a small pure helper so active completion and undo can be tested independently. The page applies the returned minute values and maintains the temporary done state. The sidebar decides visibility from the existing active-segment calculation.

## Tests

- Completing an active segment transfers its remaining time only to the next segment.
- Later segments remain unchanged.
- Undo restores the original minutes for the completed and next segments.
- Completing the final segment does not transfer time.
- The sidebar renders the control only for the active segment and keeps it visible without hover.
