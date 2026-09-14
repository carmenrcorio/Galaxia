## Constellation name labels stay inside the canvas (branch `cursor/star-label-clamp-50d1`) — 2026-09-14

**Trigger**: Star names near the constellation canvas edge were clipped. The draw loop clamped the label centre to 8px from the sides, so half the measured text still ran off the canvas.

`[FIXED]` **Name labels clamp to the full measured glyph.** `clampGalaxyLabelPosition` keeps `labelX`/`labelY` so `textWidth / 2 + 8` and `textHeight / 2 + 8` stay inside the CSS-pixel canvas. Both memorial-glyph and living-star `fillText` paths share `fillClampedName`. Star seats, drag, and ring geometry are unchanged. A label may detach slightly from its star at the edge.

`[DECISION]` **`LABEL_PAD_X` still pads seats, not labels.** Edge clamping for names is independent of the seat pad box (36 / 22 / 26). Font, size, and default offset are unchanged.
