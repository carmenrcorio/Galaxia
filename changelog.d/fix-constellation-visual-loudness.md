## Constellation visual-loudness — glow + labels (branch `fix/constellation-visual-loudness`) — 2026-07-25

**Trigger**: QA read the `/app` constellation hero as "too bold." Phase 0 diagnosed the noise as connection lines, node glow, and label collisions — not the guide rings. Part 1 ships glow + label placement only; line gating / tap-focus deferred to part 2.

`[CHANGED]` **Outer node halo −30%** via single tunable `GLOW_OUTER_SCALE = 0.7` in `apps/web/app/app/page.tsx` `drawGlow`. Scales outer halo radius and alphas together. No per-node special cases. Inner white-hot bloom and the EMA `lowPerf` shed are untouched.

`[CHANGED]` **Label anchors radially outward** for outer seats. Dropped the prefer-toward-core flip that stacked ring labels onto the core / ring-1. Hard exceptions unchanged: self always below, partner / ring-1 always above. Placement-time only — no post-`fillText` correction.

`[CHANGED]` **Width-aware label join** in `@galaxia/core` `galaxyLabelOffsets`. Optional `halfW` per anchor; pair join is `max(legacy floor, halfW_a + halfW_b)`. `galaxyLabelHalfWidthPx` approximates half-width at `11px Inter` (`GALAXY_LABEL_CHAR_PX = 6.2`, floored at half of `GALAXY_LABEL_JOIN_PX`) so long names ("Carmen Sofia") clear short neighbours ("Mommy"). Deterministic push-apart kept; no physics.

`[OPEN]` **Part 2 — connection-line gating + tap-focus**, deferred (depends on focus-preview on the transit record). Synastry / honor draw paths and tap→person navigation are unchanged this pass.

**Not touched**: ring stroke / `GALAXY_GUIDE_RINGS` / `ringBandRadius` / ring alpha or count; `isMinorForSafety`; content copy (no new user-facing strings).

**Verified**: `@galaxia/core` vitest (label half-width + join regression); `pnpm --filter @galaxia/core typecheck` + `pnpm --filter @galaxia/web typecheck`. Phone verify at 375px after `ship.sh` (merged ≠ live): glow softer, no overlapping labels; lines and tap unchanged.
