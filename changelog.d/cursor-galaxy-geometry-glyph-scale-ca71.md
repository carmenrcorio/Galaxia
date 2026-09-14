## Galaxy geometry, glyph scale, free placement (branch `cursor/galaxy-geometry-glyph-scale-ca71`) — 2026-09-14

**Trigger**: The home constellation wasted horizontal space (circular radius from the short side), rendered memorial glyphs too small, clamped custom seats at rn 1 (inside the outer guide), and drew the partner star smaller than self.

`[CHANGED]` **`galaxyGeometry(width, height)` in `@galaxia/core` is the only geometry source** for web `/app` and mobile home. Independent `radX` / `radY` (gutters 44 / 48, floor 70) with an eccentricity cap of 1.30. Guide rings pass `radX * fraction` and `radY * fraction` to `ctx.ellipse`. `pointerToCustomPosition` inverts the same ellipse (`hypot(dx/radX, dy/radY)`). Ring fractions and `GALAXY_GUIDE_RINGS` are unchanged.

`[CHANGED]` **Memorial glyphs use `GLYPH_BASE_PX = 34` / `GLYPH_BASE_PX_LITE = 26`.** Partner (`binary`) core radius is 7, equal to self.

`[ADDED]` **`people.star_scale` (numeric, default 1.0, check 0.6–2.0).** Null reads as 1.0. Multiplies that person's star core, glow, and glyph only; seats do not move. Slider "Star size" lives beside star color on the edit panel.

`[CHANGED]` **Free placement bounded by the canvas, not by rn = 1.** `maxSeatRadius` clamps `rn` on drag, on write, and on every render (so a desktop-edge seat replays inside a phone canvas). Extent is per-node (glow vs memorial glyph, after `star_scale`). Data-guard ceiling on `radius_pct` is 2.5. Grab cursor on draggable nodes; "Reset position" clears `custom_position`.
