## Glossary popover opacity and anchor fix (branch `cursor/glossary-popover-fix-edb2`) — 2026-10-03

**Trigger**: After the glass-card glossary styling landed in #405, "Why this reading" popovers stayed see-through over derivation text and `bottom`-based positioning placed them away from the trigger term.

`[FIXED]` **Glossary popover card.** `.glossary-term__floating` uses an opaque glass-card tone (solid base + gradient) and `z-index: 120` so chart cards and expanded derivations do not show through.

`[FIXED]` **Glossary popover placement.** `GlossaryTerm` measures the portaled card and anchors above or below the trigger with the same scroll/resize re-measure pattern as `WheelPlanetTooltip`, preferring below when it fits.
