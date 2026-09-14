## Soft nebula guide rings with two-layer drift (branch `cursor/d10-nebula-rings-4e88`) — 2026-09-14

**Trigger**: Guide rings on `/app` were thin single-stroke ellipses, redrawn
every frame with a 1.2% radius breath. They read as technical against the
glowing stars. D10 turns them into cached nebula bands with stardust, and
lets only the dust orbit.

`[CHANGED]` **Guide rings are nebula bands, not hairline strokes.**
`RING_BAND_COLORS` in `@galaxia/core` (`galaxy-seat.ts`, keyed `2`–`5` to
match `GALAXY_GUIDE_RINGS`) paints a wide glow pass plus a crisp core. Gold /
violet / rose / grey-mist tiers. Deterministic stardust (seed `ring * 31`,
count scaled to circumference, 20–80) sits on each band. `ringBandRadius`,
`GALAXY_RING_NORMS`, and `GALAXY_GUIDE_RINGS` are unchanged, so skeleton seats
stay on the same geometry.

`[CHANGED]` **Rings are cached, not per-frame.** Two canvases sit between the
atmosphere layer and the motion canvas (`pointer-events: none`). They
repaint only on size, DPR, the rings toggle, or `lowPerf`. The motion loop no
longer strokes ellipses and the 1.2% breath is gone. Share-image export
paints the same bands onto a CPU canvas under the stars when
`showRingsRef` is on.

`[ADDED]` **Two-layer CSS orbit.** Inner (rings 2+3) clockwise 90s; outer
(rings 4+5) counter-clockwise 70s. `prefers-reduced-motion: reduce` sets
`animation: none`. The motion canvas is never rotated, so hit testing and
drag stay in CSS pixels.

`[DECISION]` **FOUNDER-REVIEW** before merge: desktop and 390px screenshots
in the PR. Rings only; person dots, links, and labels must look unchanged.
