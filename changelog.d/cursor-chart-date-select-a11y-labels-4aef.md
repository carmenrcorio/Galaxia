## Chart date selects: accessible names (branch `cursor/chart-date-select-a11y-labels-4aef`) — 2026-08-25

**Trigger**: axe-core flagged a critical `select-name` violation on the public `/chart` acquisition tool: the Month/Day/Year (and, for exact-time precision, Hour/Minute) `<select>` elements had no associated `<label>` or `aria-label`, so screen readers could not distinguish them.

`[FIXED]` **Added `aria-label` to the Month/Day/Year/Hour/Minute selects in `BirthFields`**, matching the "Birth month"/"Birth day"/"Birth year" pattern already used by the marketing hero's quick-chart mini-form (`components/marketing/quick-chart-entry.tsx`). No visual or behavioral change. Verified with axe-core on `/chart` and `/chart/compare` (both default and exact-time precision): 0 critical violations before, versus 1 (`select-name`) previously reproduced against the unfixed code.
