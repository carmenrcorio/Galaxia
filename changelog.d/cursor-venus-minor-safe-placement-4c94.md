## Venus natal placement minor-safe curated copy (branch `cursor/venus-minor-safe-placement-4c94`) — 2026-07-24

**Trigger**: Venus `interpretPlacement` shorts/longs are attraction-framed ("loves
totally, guards fiercely", chase / devotion / merge). They rendered ungated in
expanded placements on public `/chart` and `/s`, and on `/app/person` despite
`personIsMinor` already being computed for transits. Venus-in-house longs on the
person page were the same gap, second table.

`[DECISION]` **/s always renders curated Venus — fail safe, not fail closed.**
Single shares strip birth PII, so age cannot be proved. Persisting
`subjectIsMinor` would assert "this subject is a child" on a public token (worse
leak than the PII strip removed, and it never unflags at 18). Dropping expanded
placements taxes every adult share. Cost accepted: adults get slightly softer
Venus wording on `/s` (and `/s` PDF) only. No new persisted field. Do not reopen
A/B without revisiting this reasoning.

`[ADDED]` **`PlacementSafetyOpts` + required `minorSafe` on `interpretPlacement`,
`interpretHouse`, and `bodyDomain`.** One lookup chooses the table; call sites
pass the boolean and never select `VENUS_IN_*_MINOR` / `PLANET_IN_SIGN.venus`
directly. A surface that can render Venus without the flag has the wrong shape.

`[ADDED]` **`VENUS_IN_SIGN_MINOR` (12 shorts + 12 longs) and
`VENUS_IN_HOUSE_MINOR` (12 shorts + 12 longs), plus domain `"How they care"`.**
All FOUNDER-REVIEW before merge. Mars unchanged (conflict-framed).

`[CHANGED]` **Surface gates:** `/chart` runs `isMinorForSafety` (adults keep
adult copy); `/s` single hardcodes `minorSafe: true`; PDF takes the
already-computed boolean from the caller (`/chart` real, `/s` true) and does
not recompute; `/app/person` applies existing `personIsMinor` to natal
placements and house blocks.

`[OPEN]` **Other bodies' house copy still carries romantic / intimacy framing**
(not gated in this branch): Moon 5/7, Sun 5/8, Mars 5 ("romantic in the
pursuit"), Jupiter 5/7, Saturn 5/7/8, Uranus 5/7/8, Neptune 5/7/8, Pluto 5/7/8.
House *meanings* for 5th ("Play, romance & making") and 8th ("Sex…") also show
on the person page for every subject. Inventory only — out of scope here.
