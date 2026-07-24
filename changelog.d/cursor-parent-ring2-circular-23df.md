## Parents on Ring 2 — circular seats (branch `cursor/parent-ring2-placement-23df`) — 2026-07-24

**Trigger**: After #105, Mommy/Daddy still *looked* off Ring 2 (Mommy near the
outer colleague band, Daddy dropped below) even though `ringIndex("parent") → 3`
and `ringBandRadius(3) = 0.72` were already correct.

`[FIXED]` **Root cause was geometry, not relation mapping.** Seats and guides
shared `ringBandRadius`, but `ringGeom` used a capped ellipse (`radY ≠ radX`).
Same parametric `rn` → different Euclidean distances by angle, so co-ring
parents read as different bands. Geometry is now a true circle
(`radX === radY = min(fit)`).

`[CHANGED]` **Guide stroke alpha** on lowPerf/mobile raised (~0.10 → ~0.22) so
Ring 2 is countable against the wash — faint guides made people judge rings by
landmarks (ancient rim) instead of the band stroke.

`[CHANGED]` **Labels prefer the core** (lower-half seats label above) so Daddy's
name on Ring 2 is not drawn past the outer bands.
