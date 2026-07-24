## Visible concentric rings + P1 ring remap (branch `cursor/constellation-visible-rings-8cb8`) — 2026-07-24

**Trigger**: Founder sketch for the constellation redesign — concentric rings as
visible structure, partner as a tight binary at the core, grandchildren no
longer misfiled as ancestors via a `*grand*` substring match.

`[CHANGED]` **One allowed seat remap after #91.** Semantic rings are now:
0 self · 1 partner (tight binary, not a guide) · 2 children (+ grandchildren) ·
3 parents / siblings / grandparents · 4 friends / relatives / unknown ·
5 colleagues / outer tracked · 6 passed + `ancestor` tag (ancient band until P3).
Seat contract unchanged after this remap: same `(id, own ring)` → same seat.

`[FIXED]` **Whole-value relation resolution** (`resolveGalaxyRelation`). No
substring matches on `grand` / `mom` / `dad`. `granddaughter` / `grandson` /
`grandchild` → ring 2 (children). Unknown free-text → ring 4 with `known: false`
(reported, not silently invented as a new type). No DB enum in this PR.

`[ADDED]` **Soft elliptical guide strokes** for sketch Rings 1–4 on the web
`/app` constellation canvas. Respect `lowPerf` (thinner / quieter) and
`prefers-reduced-motion` (no breath). Partner sits inside Ring 1; passed stay
ancient on the outer band with no extra guide until P3.

`[ADDED]` **Shared picker options** `GALAXY_RELATION_PICKER_OPTIONS` in
`@galaxia/core` — cousin, relative, aunt/uncle/niece/nephew, in-law, ex,
colleague, boss, professor, mentor, acquaintance, grandchild. Wired into web
welcome, save-to-galaxy, quick-check, and mobile onboarding. Colleague was
missing from mobile/save/quick-check. FOUNDER-REVIEW on every new label.
`pet` intentionally omitted.

`[DECISION]` **`ancestor` implies deceased-forebear display** (outer ancient
band) but never silently writes `passed_at`. Living `grandparent` is family
light on ring 3, not ancient.

`[DECISION]` **Web `/app` constellation card only for guides.** Today in Your
Sky / Resume regions untouched. Mobile home already shares `ringIndex` seats;
picker parity only on mobile this PR.
