## Galaxy hold-to-drag (branch `cursor/mobile-galaxy-drag-1b96`) — 2026-09-17

**Trigger**: Paint twin merged in #338 without reorder. Web `/app` hold-to-drag writes `people.custom_position`; mobile only played seats back.

`[ADDED]` **Hold-to-drag on Home.** Same recipe as web: 180ms hold or 8px move, self stays at the core, persist with `owner_id`, revert on failure. EditPerson still resets. Legend: “Tap a star to open · hold to move”.

`[CHANGED]` **Empty sky still scrolls.** Responder claims only a star hit; Home `scrollEnabled` turns off while a seat is moving so the page does not steal the drag.

`[TESTED]` Overlay / `dragSeatFromPointer` math, twin wiring, web `galaxy-interaction-wiring`. Typecheck. Device unverified.
