## Remembrance constellation picker collapsed by default (branch `cursor/collapse-constellation-picker-3183`) — 2026-07-24

**Trigger**: The Remembrance person page rendered the full memorial constellation library inline, burying chart framing, reflections, and Ask Vela under sixteen patterns plus myths.

`[CHANGED]` **Constellation picker collapses to one selection row.** Shows the current glyph, name, and a "Change" control. Myths, summaries, and the helper stay out of the collapsed row.

`[CHANGED]` **Full library opens only on Change.** A modal radiogroup lists ancient light plus the curated patterns (summary + myth). Choosing an option saves `people.memorial_constellation` and returns to the collapsed row; Escape / backdrop / × dismiss without changing.
