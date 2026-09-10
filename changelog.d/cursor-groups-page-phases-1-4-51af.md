## Groups page beginner ramp, Shared Sky exclusivity, glossary (branch `cursor/groups-page-phases-1-4-51af`) — 2026-09-10

**Trigger**: Phase 0 on the Groups page was approved. The Shared Sky section discarded partial clusters whenever any planet was fully shared; generational map columns had no sign names; planet and sign words had no beginner meaning; fourteen user-facing em dashes were still shipping.

`[ADDED]` **Beginner glossary.** `lib/astro-glossary.ts` authors one plain-English line for all ten planets and all twelve signs (`PLANET_MEANINGS`, `SIGN_MEANINGS`). `GlossaryTerm` is the first reusable popover in this codebase (no tooltip library): keyboard-focusable, Escape dismisses, `aria-describedby` always wired. Subtle dotted underline in accent gold. Applied to Generational Map row labels and column sign names, Fault Lines planet and sign text, Shared Sky text, and Pair Dynamics data lines.

`[ADDED]` **Generational map legibility.** Sign name under the glyph on all twelve columns, not only occupied ones. Compact legend maps avatar colour to member name via the existing `InitialAvatar` (palette unchanged). Framing line under the header explains that these planets move slowly, so everyone born within a few years shares them. Avatar placement logic and the summary line are unchanged (em dash stripped from the summary only).

`[FIXED]` **Shared Sky exclusivity bug.** Full-group lines and partial-cluster lines now render together, evaluated per planet. A group that all share Neptune while only two share Uranus keeps the Uranus fact. Partial overlaps are grouped by the set of members who share them (one sentence per set). `describePartialOverlap` now receives group size (`totalMembers`) and uses sharer count to distinguish a pair from a majority. Every Shared Sky line carries `GEN_PLANET_MEANING` plus a statically authored tail keyed by (coverage shape, planet). Nine distinct tails; no two lines in the mixed-planet fixture share a tail. FOUNDER-REVIEW on every new authored string.

`[CHANGED]` **Em dash purge** in `groups-copy.ts`, `groups/page.tsx`, and `generational-map.tsx`. User-facing U+2014 removed; sentences rewritten where the dash was load-bearing. `chart-grid-section.tsx` still ships em dashes (empty-cell glyph, truncated-grid note, patterns empty state) and is left for a later pass.

`[ADDED]` **First-visit intro card** below the page hero and above the group selector. Three short lines plus a Got it button. Dismissed state persisted via `lib/ui-settings.ts` (same named-key get/set shape as Settings prefs / mobile cache).

Untouched per spec: synastry/aspect engine, `cohortOverlay`, map avatar placement, Pair Dynamics cards/badges/click-through, Manage Group accordion, group selector, hero, palette/typography/avatar colour system.
