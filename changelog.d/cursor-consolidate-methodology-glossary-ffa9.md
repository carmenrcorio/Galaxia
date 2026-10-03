## One chart methodology link and glass glossary popovers (branch `cursor/consolidate-methodology-glossary-ffa9`)

**Trigger**: Per-placement "How we compute this" links repeated on every "Why this reading" row. Glossary popovers used a flat dark overlay style that did not match placement glass cards.

`[ADDED]` **`ChartMethodologyLink`** on person profile, Quick Chart (`NatalSignReveal`), and authenticated/public compare wheels. Copy stays **How we compute this** (FOUNDER-REVIEW in `methodology-copy.ts`).

`[CHANGED]` **`WhyThisReading`** derivations now inline **GlossaryTerm** / **GlossarySign** / **GlossaryPlanet** spans only. No per-row methodology or glossary page links.

`[CHANGED]` **`whyReadingGlossarySegments`** highlights multiple terms on a line (for example planet + sign on natal placements).

`[CHANGED]` **Glossary popover** CSS reuses the shared **`.glass-card`** gradient, blur, border, radius, and shadow. **See full definition** uses the same gold underlined CTA treatment as chart methodology links.
