## Wire isMinorForSafety into public Quick Compare (branch `cursor/quick-compare-minor-safety-51d4`) — 2026-07-22

**Trigger**: `/chart/compare` (no-login Quick Compatibility) never called `isMinorForSafety`, so romantic/attraction framing could render for a pairing involving a minor. Saved `/app/compare` already blocked this; the public path was a separate surface.

`[FIXED]` **`POST /api/quick-compare` returns `pairHasMinor`.** Computed with the existing `@galaxia/core` `isMinorForSafety` on both people (same call shape as save-to-galaxy: `{ isMinor: false, birthDate, birthPrecision }`). No `relationType` on the API; placement/orb computation unchanged. Year-only near the 17/18 edge still fails safe inside the util.

`[FIXED]` **`/chart/compare` reads `pairHasMinor` from the payload** (never re-derives age). When true: force the lens to Platonic, remove the Romantic toggle (mirror of `availableCompareRelationTypes`), and keep `blockRomanticMinorRender` as a backstop so attraction framing (`aspectActionLine` romantic register, Venus "feel loved" lens, attraction caption, romantic aspect sort) cannot paint. Platonic / non-romantic readings for a minor pairing still render fully, including the Warmth score dimension.

`[ADDED]` **FOUNDER-REVIEW copy** adapted to Romantic/Platonic only (saved-Compare's parent-child/siblings/friends/ancestor held-reading string does not fit this surface).
