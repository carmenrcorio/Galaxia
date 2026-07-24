## Constellation near-collisions no longer stack labels (branch `cursor/constellation-seat-collision-8357`) — 2026-07-24

**Trigger**: Follow-up on #91. Hash-near seats on the same ring (Abuelita Rosa,
Stevie, Viejita on Carmen's account) still drew on top of each other, undoing
the label-legibility work in that PR. Deterministic was satisfied; readable was
not.

`[FIXED]` **`galaxySeatsResolved` separates same-ring near-collisions** in
`@galaxia/core`. Raw seat stays `f(id, own ring)`; people whose raw angles fall
within `GALAXY_COLLISION_JOIN` (~14°) form a cluster and are re-spaced by
`GALAXY_COLLISION_SEP` (~20°) around the circular mean, ordered by id. Same
input → same output. Adding an unrelated person (outside the cluster) cannot
move existing seats; only joining a collision cluster re-spreads that cluster.

`[CHANGED]` **Web `/app` and mobile home both use `galaxySeatsResolved`**, so the
two clients share the same learnable map. Mobile's index-based circle is gone.
Regression covered with Carmen's live ids in `@galaxia/core` tests.
