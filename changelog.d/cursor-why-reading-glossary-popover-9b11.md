## Why this reading glossary popovers (branch `cursor/why-reading-glossary-popover-9b11`) — 2026-10-03

**Trigger**: Expanded derivations linked out to full glossary pages instead of reusing the in-app glossary popover used on Compare and profile surfaces.

`[CHANGED]` **Why this reading glossary UX.** Derivation lines inline-wrap the matched term with `GlossaryTerm` (preview card, optional full-definition link) instead of a separate redirect link. Missing glossary entries still link to `/methodology`.

`[CHANGED]` **Disclosure polish.** Toggle styling is muted and small; person placement derivations sit inside the expanded row; `WhyReadingGroup` keeps one derivation panel open per page.

`[CHANGED]` **Glossary popover dismiss.** `GlossaryTerm` closes on pointer down outside the trigger or floating card (touch-friendly tap-outside).
