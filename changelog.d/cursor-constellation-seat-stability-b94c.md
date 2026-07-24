## Constellation seats stay put across loads (branch `cursor/constellation-seat-stability-b94c`) — 2026-07-24

**Trigger**: The `/app` constellation reshuffled seats between visits with the same
people, so the map was decoration — a user could never learn where anyone sits.
Labels also vanished when seats landed near the card edge, and year/none names
faded to ~0.46 alpha and read as missing.

`[FIXED]` **Seats are now a pure function of (person id, own semantic ring)** via
`@galaxia/core` `galaxySeatNorm` / `hash01` / `ringNormAbsolute`. Angle comes from
a full 32-bit FNV-1a of the id; radius from the person's own `ringIndex`, not from
which rings happen to be occupied and not from `members.indexOf` in the fetch
order. Same account, two loads, no data change → identical seats. Adding one
person moves only that person (zero peer dependence). Exact hash collisions stack
at the same seat — deterministic, no index-order fallback (peer-aware walking
would move existing people when the set changes).

`[FIXED]` **Name labels stay inside the canvas and stay legible.** Seats clamp
into a label-safe margin; labels flip above the node near the bottom edge. Label
alpha floors at 0.78 so year/none are readable; uncertainty is signaled with a
softer mist colour + italic, not near-invisibility. Every ignited node keeps its
name (still no label picker).

`[DECISION]` **No schema / no drag-to-arrange in this branch.** Persistence columns
are for a later rearrange feature. The seat helper lives in `@galaxia/core` so
mobile’s index-based circle can share it later — mobile is untouched here.
Web `/app` only; marketing `HeroGraph` unchanged (fixed demo).
