## Fix transit pronoun slots: typed subj/poss/obj (branch `cursor/fix-transit-pronoun-slots-b322`) — 2026-07-24

**Trigger**: Home "Today in your sky" rendered broken copy such as "for who their is" / "for who your is" — curated transit lines used a single `{poss}` token in subject and object positions, and subject verbs were conjugated for a possessive, not for you/they.

`[FIXED]` **Typed pronoun slots in `packages/astro/src/transit-interpretations.ts`.** Curated `TRANSIT_PAIR` copy now uses three independent tokens — `{subj}` (you/they), `{poss}` (your/their), `{obj}` (you/them) — substituted by `applyPronounSlots` / `pronounSlotsFor`. A possessive can no longer land in a subject or object position. All 22 mis-slotted occurrences across 19 curated entries were rewritten to the correct slot with base-form verbs (`are` / `feel` / `need`) so you and they conjugate. Composed `composeShort` / `composeLong` fallbacks were already possessive-plus-noun and are untouched.

`[ADDED]` **Structural forbidden-bigram test.** Renders every curated `TRANSIT_PAIR` entry in both self (`your`) and other (`their`) modes and asserts none of a forbidden bigram list (`they is`, `your is`, `their is`, `tell their`, `for they`, …). Extending that list is how this bug class stays impossible.

**Voice:** every rewritten curated string is marked `FOUNDER-REVIEW`. Call-site API (`interpretTransit(hit, { possessive })`) unchanged.
