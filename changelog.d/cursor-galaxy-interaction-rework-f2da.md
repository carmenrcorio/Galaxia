## Galaxy ring toggle + drag-to-reposition (branch `cursor/galaxy-interaction-rework-f2da`) — 2026-09-14

**Trigger**: Let people hide the orbital guides and drag stars to a personal
seat that survives devices, without breaking the derived learnable-map seats.

`[ADDED]` **Rings toggle on `/app`.** `SETTING_SHOW_RINGS` in
`apps/web/lib/ui-settings.ts` (`galaxia.setting.showRings`, default on).
`paintFrame` reads `showRingsRef` so hover state cannot tear down the loop.
Share-image export uses the same paint path, so hidden rings stay hidden.
Does not hide partner binary / ancient-light / self strokes.

`[ADDED]` **`people.custom_position` JSONB** (`{ angle, radius_pct }`,
0.05–1.0). Same space as `GalaxySeatNorm`. No new RLS policy — `people owner
all` already keys on `owner_id`. Client writes use `.eq("owner_id", …)`,
never `user_id`. Self stays pinned at the core. Custom seats skip tangential
drift. Reset lives on `EditPersonPanel`. Mobile home reads the column so the
map matches across devices; native drag is out of scope.

`[ADDED]` **`effectiveSeat` / `pointerToCustomPosition` in `@galaxia/core`**
with unit tests. Overlay during drag is a component-level ref (not effect
state) so `hoverPerson` cannot destroy the hold timer. Click-to-open is
suppressed only when `active && moved`.
