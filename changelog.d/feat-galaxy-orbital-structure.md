## Galaxy spiral structure — fills the canvas + siblings/colleagues (branch `feat/galaxy-orbital-structure`) — 2026-07-12

**Trigger**: The `/app` constellation derived distance-from-bond (prior branch
`cursor/galaxy-orbital-structure-34da`) but still HUDDLED in the centre third: a
single scalar ring radius was capped at `min(W,H)/2 − 48`, so on a wide desktop
canvas (~860×440) the outermost ring reached only ~172px and the horizontal
edges were dead. This branch makes the structure read like a real spiral galaxy
reaching the edges, and adds two new relationship types. Same 2D canvas renderer
— no PixiJS/Three.js. All derived rules kept (form from bond, colour from
element, brightness from precision); this adds derived POSITION that fills the
frame.

`[ADDED]` **`siblings` + `colleagues` as relationship types.** Added `colleague`
to `packages/core` `RelationshipType` and to the `/welcome` add-person picker;
`sibling` already existed and is now explicit everywhere. Derived form + colour,
consistent with the reference legend
(`design/reference/galaxia-constellation-prototype.html`, "star · friend/
sibling"): **siblings → a Star, element air (violet `#B79AD8`)** — the kindred/
mental register they share with a partner, rendered as a free main-sequence star
rather than a bound binary; **colleagues → a Star, element earth (gold
`#cdbd7a`)** — the grounded, practical register of shared work, distinct from
friends' fire. Both flow through the galaxy (`ringIndex`/`formFromRelation`/
`elementFromRelation`), the add UI, and the legend (now lists Partner, Child,
Parent, Sibling, Friend, Colleague, Ancestor). The edit-person panel already
uses a free-text relation field, so it accepts both. NOTE (out of scope here):
Compare (`lib/compare-guidance.ts`) still has no dedicated `colleagues` lens — a
colleague pairing compares under the existing types (defaults to friends); adding
a colleague body-priority/frame there is a follow-up.

`[CHANGED]` **Ring order now self → partner → children → parents → siblings →
friends → colleagues → ancestors** (`ringIndex`, ordinals 0–7), colleagues
slotted between friends and the outermost ancestor ("ancient light") tier.

`[FIXED]` **Spiral now FILLS the canvas (no more centre huddle).** Replaced the
scalar `ringRadius` (capped at the short side) with an ELLIPTICAL fill: a
normalised ring radius in [0,1] maps onto separate x/y radii sized to the actual
canvas (`W/2 − 46`, `H/2 − 54`, the extra bottom room keeping name labels
inside), so a wide desktop canvas fills horizontally and a tall 375px canvas
fills vertically. Only the rings actually present are collapsed onto the range,
with the innermost kept clear of the self core (`RN_MIN = 0.34`) and the
outermost always reaching the edge margin — so a partner + 4 kids spreads to the
frame and 14+ people stay inside it, at every size.

`[ADDED]` **Spiral-arm sweep + outward entrance cascade.** Each ring keeps its
golden-angle rotation and now also gets a continuous radius-scaled twist
(`SPIRAL_TWIST`) so the arms sweep outward instead of forming concentric
bullseyes; stable per-star hash jitter (±6% radius, angle) keeps it a living
galaxy. The entrance ignition was reordered to cascade OUTWARD along the spiral
(inner rings first, strongest bond leading within a ring) rather than by raw
synastry score. Phase 1 entrance/light and Phase 2 depth (parallax, nebulae,
atmosphere, `prefers-reduced-motion`, perf guards) sit on top of the new
positions unchanged — links, drift, twinkle and nebulae all redraw against the
derived positions automatically.
