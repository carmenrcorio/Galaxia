## Surface chart precision and the upgrade path (branch `cursor/surface-chart-precision-6927`) — 2026-09-14

**Trigger**: Lower-precision charts are real charts, but the product often hid that fact or hid the views that need more detail. Silence made a working profile look broken. The never-fabricate rule says: say what this precision supports, what it does not, and how to add the missing input.

`[ADDED]` **Four-tier catalog in `@galaxia/core`.** Stored `birth_precision` is `exact` (time), `date`, `year`, or `none`. Exact time plus a city unlocks houses, Ascendant, and precise Moon. Date unlocks planetary signs, aspects, synastry, and daily sky notes (sign-level; no natal Moon orbs). Year unlocks the generational layer only; memorial timeline still shows, with transits placed by age. `none` is a person whose chart is waiting. The add-person ladder copy is the source of the labels and unlocks.

`[ADDED]` **Quiet precision fact on every person profile (web and mobile).** Secondary text, not a warning banner. Tap to read supports / does not / why. Exact-without-city is stated as time-known, city still needed.

`[ADDED]` **One upgrade action, prefilled with what is already known.** Year → add a date (never January 1 from the year-only working date). Date → add a time (and city). Exact without city → add a city. Shown once on the profile and once in the relevant empty state. Never a repeated prompt. Mobile has no editor, so it states the fact without promising a control.

`[FIXED]` **Features unavailable because of precision now say so in place.** Year-only aspects, daily sky notes, and houses already had a houses card; aspects and Right now no longer render as blank gaps. Memorial timeline mounts for a passed person with no chart yet, and names that lifespan transits need a birth year. Compare offers a single "Add a birth date" link to the year-only profile.
