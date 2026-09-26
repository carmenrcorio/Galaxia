## Natal retrograde Rx badge (branch `cursor/natal-rx-badge-f91b`) — 2026-09-26

**Trigger**: Natal planet cards showed the glyph, sign, and short reading but never said when a planet was retrograde at birth, even though the engine already computed that fact.

`[ADDED]` **Planet cards now show a small "Rx" badge when `Placement.retro` is true.** The natal engine already stored retrograde as `Placement.retro` (negative ecliptic longitude velocity at the birth moment). This change does not recompute motion or add a second field. Web placement rows pin the badge to the top-right of the planet glyph; compact lists and mobile place it inline after the sign. Direct planets are unchanged. New copy (`Rx`, accessible name `Retrograde`) is tagged FOUNDER-REVIEW.
