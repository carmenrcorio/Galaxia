## Accessible names for the /chart Month/Day/Year selects (branch `cursor/chart-date-select-a11y-f350`) — 2026-08-25

**Trigger**: axe-core flagged a critical violation on `/chart` (the public, no-login Quick Chart tool): the Month/Day/Year `<select>` elements had no associated `<label>` or `aria-label`, so screen readers could not distinguish them.

`[FIXED]` **Added `aria-label`s to the Month/Day/Year selects in `BirthFields`.** `"Birth month"`, `"Birth day"`, and `"Birth year"` now give each select a programmatic accessible name, matching the labelling already used by the landing mini-form's own Month/Day/Year selects (`components/marketing/quick-chart-entry.tsx`). `BirthFields` renders twice on `/chart/compare` (Person A and B), so `aria-label` was used instead of `id`/`htmlFor` pairs to avoid duplicate-id collisions. No visual or behavioral change. Re-ran axe-core on `/chart`: 0 critical violations.
