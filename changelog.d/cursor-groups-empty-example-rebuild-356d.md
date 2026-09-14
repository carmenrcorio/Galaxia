## Groups empty state: precomputed example reading (branch `cursor/groups-empty-example-rebuild-356d`) — 2026-09-14

**Trigger**: The Groups empty landing already showed an example, but it recomputed four natal charts on first paint and used a tight 1991-1997 friend group. That is not the shape of a real saved group reading. The founder's own Family Circle is six people, empty whole-group shared sky, and fault lines on Uranus, Neptune, and Pluto.

`[CHANGED]` **Example reading is a static snapshot.** `exampleGroupReading()` reads `groups-example-reading.json`. Charts are still produced by `@galaxia/astro` `computeNatalChart` / `cohortOverlay` / `compareGenerational`; tests recompute live and fail if the snapshot drifts. The empty page never invents a placement and never reads `people` / `groups` / `charts`.

`[CHANGED]` **Example set is four fictional people spanning real eras.** Noor (2001) and Theo (2003) share Uranus Aquarius, Neptune Aquarius, and Pluto Sagittarius. Jonah (1976) and Mira (1954) sit in earlier signs. Overlay label and fault-line shape match a real multi-generational group. Member order puts the same-generation pair in the first three highlights the page actually shows. Labelled Example, with copy that says it is not the user's group.

`[CHANGED]` **One-tap prefill caps at eight.** Chart grid max is 8. A roster larger than that (the founder's account has 16 people) now names and prefills the first eight instead of building an overlay the rest of Groups then truncates.

`[CONFIRMED UNTOUCHED]` **Live group compute, persistence, and `hasAccess`.** Example ids still use the `example:` prefix and cannot be saved, compared, or shared.
