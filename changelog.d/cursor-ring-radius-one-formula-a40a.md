## One ring radius for seats and guides (branch `cursor/ring-radius-one-formula-a40a`) — 2026-07-24

**Trigger**: After #100, Mommy/Daddy (parents, sketch Ring 2) still sat out near
the colleague band, and every node floated in the gaps between guide strokes.
Occupied-ring spread remapped parents to `0.79` whenever friends/colleagues were
empty — a different radius than the legend's Ring 2 band (`0.72`).

`[FIXED]` **ONE radius function** — `ringBandRadius(ring)`. Person seats and
guide ellipses both use it. A parent sits on the parents band; guides draw at
those exact same band radii (sketch Rings 1–4 always visible).

`[CHANGED]` **Dropped occupied-ring redistribution.** Empty rings no longer
pull living bands outward. Adding a person never changes another person's
radius (same-ring collision separation still may nudge angles in a cluster).

`[CHANGED]` **Within-band jitter** (`ringSeatRadius`, ±1.2%) clamped to ≤85% of
the half-gap to the neighbouring band — never enough to cross into another ring.

`[CHANGED]` **Tangential drift only** on `/app` — motion stays on the band;
radial clamp preserves angle so edge padding cannot shove a node into a gap.
