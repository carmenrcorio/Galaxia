## Galaxy orbital structure — derived concentric rings (branch `cursor/galaxy-orbital-structure-34da`) — 2026-07-12

**Trigger**: The `/app` constellation placed every non-self person on a single
circle of one fixed radius (`0.36·min(W,H)`), evenly spaced by angle — so a
person's distance from the centre user encoded nothing about their relationship,
and at 14+ people it read as an undifferentiated blob. This is the
layout/positioning skeleton for the galaxy: distance is now DERIVED from bond
type. Same canvas renderer — no PixiJS/Three.js.

`[ADDED]` **Derived orbital radius (`ringIndex` + orbital layout in `apps/web/app/app/page.tsx`).**
A person's ring is computed from their relationship, ordered by closeness and
matched to the product taxonomy (`partner, child, parent, grandparent, sibling,
friend, ancestor` + synonyms): centre = self · 1 partner (binary-star treatment
kept) · 2 children · 3 parents · 4 siblings · 5 friends · 6 grandparents/
ancestors ("ancient light, still arriving" — furthest, softest; grandparents
share the ancestor tier because they share the "ancient" celestial form).
Unknown relations orbit with the friends band. This extends the existing
derived-position principle (form from bond, colour from element, brightness from
precision) — position is never hand-assigned or random.

`[ADDED]` **Within-ring distribution + organic variation.** People on the same
ring are spaced evenly around the circle; each ring is rotated by the golden
angle for a spiral-arm feel, and every star gets small, *stable* radius (±7%)
and angle jitter derived from a deterministic hash of its id (never
`Math.random` per frame) so the result reads as an elegant galaxy, not a rigid
dartboard. The existing gentle drift, entrance ignition, twinkle, nebulae and
bezier constellation lines all sit on top of the new positions unchanged (links
redraw against the derived positions automatically).

`[CHANGED]` **Responsive ring radii (few people and 14+, desktop and mobile).**
Only the rings actually present are collapsed onto evenly spaced radii between an
inner `rMin` (keeps the innermost ring clear of the self star) and an outer
`rMax` (`min(W,H)/2 − 48`, so the outermost glow + label stays inside the frame
at any size incl. 375px). So a partner + 4 kids spreads out to use the space,
while 14+ people stay inside the frame without cramming — the closeness ORDER is
always preserved while the galaxy expands/contracts to fit. Verified at desktop
and 375px, at both few-people and 14-people counts.
