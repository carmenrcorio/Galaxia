## Fix flip card bleed in chart image export (branch `cursor/fix-flip-card-export-bleed-fb53`) — 2026-09-27

**Trigger**: Share chart image painted both faces of the Big Three cards at once. html-to-image clones the live DOM and ignores `backface-visibility`, so the interpretation paragraph sat on top of the sign name.

`[FIXED]` While a chart image is being captured, flip cards unmount the back face and drop the 3D transform. The interactive flip on the page is unchanged, and the wheel and metadata card stay in the export.
