## Larger memorial glyphs + calmer star twinkle (branch `cursor/constellation-glyph-twinkle-ea2a`)

**Trigger**: memorial constellation glyphs read too small on the galaxy; star twinkle still felt like flicker rather than shimmer.

1. `CHANGED` **Memorial glyph seat ≥+50%** in `apps/web/app/app/page.tsx` (`drawMemorialGlyph` / `coreR` / label anchors): radius `12/14 → 18/21`, half-extent `11 → 17`. Line width stays stroke-light (`0.85` / `1.05`); star dots only nudged (`1.15/1.35 → 1.25/1.45`) so the larger pattern does not blow the frame budget with thicker ink or new glow layers. lowPerf still skips the soft wash.
2. `CHANGED` **Living-light node twinkle slowed ~3×** in `drawBody`: periods ~14–30s → ~45–100s (`sin(t·0.00018·sp)` + `sin(t·0.0001)`). Amplitude unchanged (~0.065). Same rate under `lowPerf` — no faster path on small viewports. `prefers-reduced-motion` still collapses `tw` to `1`.
3. `CHANGED` **Background starfield twinkle slowed ~3×** in `apps/web/components/cosmic-background.tsx`: per-star `tw` `0.0004–0.0019` → `0.00015–0.00065` (before layer `twMul`) so pulses land ~160–780s at 60fps. Far-layer shed under load does not change the rate of remaining stars.

**Not touched**: memorial picker SVG preview, transit pulse / form-specific shimmer, data meaning, §2 config.
