## Memorial Timeline no longer hides year-only profiles; migration backfilled (branch `cursor/memorial-timeline-year-only-bbff`) — 2026-09-10

**Trigger**: Report that a memorial profile ("Viejita") had no visible Timeline
section. Diagnosis (ENGINEERING.md §4) found the profile's chart precision is
`date`, not `year` — she never failed the `chart.precision === "year"` gate at
all. The actual cause: migration `20260909020000_memorial_milestones.sql` had
never been applied to the linked Supabase project, so `people.died_on` did not
exist and the person page's own `people` select (which asks for that column)
failed outright — hiding the ENTIRE profile page, not just the Timeline. The
"unhide year-only profiles" ask below is a real, independently-valuable gap in
`shouldShowMemorialTimeline` (any genuinely year-only passed profile was fully
hidden), but it was not Viejita's bug.

`[FIXED]` **Applied the missing `memorial_milestones` migration to the
production Supabase project** (`eigfvribtntbxyjutsma`): adds the
`memorial_milestones` table + RLS policy and `people.died_on`. This is what
was actually blocking Viejita's (and every other memorial profile's) page —
confirmed by re-running the exact failing query before/after.

`[CHANGED]` **`shouldShowMemorialTimeline` no longer requires a real
(non-year-only) chart** — only that the person exists, is not the viewer's
self-profile, and has passed (`packages/core/src/memorial-timeline.ts`). A
year-only memorial profile still gets the Timeline section and the "Add a
memory" flow; milestones and their RLS policy never depended on chart
precision in the first place.

`[ADDED]` **`memorialTimelinePrecision(person)`** (`'exact' | 'approximate'`)
as the separate, honest answer to "how precisely can transits be dated for
this chart" — decoupled from "should the section render at all".

`[ADDED]` **`computeLifespanTransits` accepts a `precision` parameter.**
`'approximate'` (year-only) computes ONLY Saturn/Jupiter returns — sampled
directly at the mid-year instant `computeNatalChart` already uses for
year-precision charts, since `computeNatalChart` never stores Saturn/Jupiter
placements for a year-only chart — each marked `isApproximate: true` with an
integer `ageEstimate`, never a specific `dateUTC` shown to the user. Progressed
Moon and outer-planet conjunctions to Moon/Ascendant are excluded outright
(too fast / no birth time); conjunctions to natal Sun are excluded too,
following the codebase's own existing precedent that a year-only Sun position
is never confident (`evaluateSignConfidence`; `computeGenerational` omits Sun
entirely for year-only cohorts). `'exact'` behavior is unchanged
(byte-identical — regression test added).

`[ADDED]` **Web `MemorialTimeline`** shows a quiet, secondary-color disclosure
line for approximate profiles ("Tio's birth date is recorded as a year only,
so these moments are placed by age rather than by date.") and an "Around age
N" label on approximate transit entries. Owner-authored milestones always
render their exact, user-supplied date regardless of the person's own
precision.

`[OPEN]` No Expo/mobile counterpart of the Memorial Timeline exists yet
(mobile's person-profile screen is still a placeholder), so there is no
mobile-side change to make for this feature yet.
