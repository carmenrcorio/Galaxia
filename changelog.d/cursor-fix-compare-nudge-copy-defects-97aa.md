## Fix repeated compare openers and ungrammatical Venus copy (branch `cursor/fix-compare-nudge-copy-defects-97aa`) — 2026-09-11

**Trigger**: two live shipped copy defects. (A) Every Compare page's catches
(and flows) group heading rendered the exact same hardcoded sentence
("Say the tender thing out loud before it hardens into scorekeeping:")
regardless of which two real bodies were aspected, because
`RELATION_ACTION_REGISTER` held exactly one string per relationship type per
nature. (B) `VENUS_NEED.Virgo` was a to-infinitive ("...through to have the
details noticed") substituted into the fixed template "they feel loved
through {X}.", producing an ungrammatical sentence for Virgo Venus.

`[FIXED]` **`VENUS_NEED`'s twelve values now each read as one grammatical
noun-phrase sentence.** Virgo's to-infinitive (the shipped bug) is gone, and
the other eleven were also rewritten to noun phrases for consistency (several
previously appended a second, loosely-punctuated clause). Read all twelve
aloud against `"With {sign} Venus, they feel loved through {value}."` before
editing; see `packages/astro/src/compare-guidance.ts`.

`[FIXED]` **`THEME_WORD.mercury` in the nudge-copy generator changed from
"thoughts and talk" (plural) to "communication" (singular).** Every
templated `copy-matrix.ts` sentence uses a singular verb after the subject
noun phrase, so the plural noun caused a subject/verb disagreement across
every Mercury-themed drop/full-specificity/gentle line (54 sentences, not the
34 the original audit counted — the audit only matched sentence-initial
capitalized instances and missed lowercase mid-sentence subject positions in
`self`/`child`/`colleague` framings). Fixed once at the generator level and
`copy-matrix.ts` regenerated; zero manual edits to the generated file.

`[FIXED]` **The nudge "partner" drop-line closing tip no longer reuses one
shared sentence across all 10 planetary themes.** `FRAMING_ADDR.partner.tip`
was a single string reused everywhere; added a theme-keyed `PARTNER_DROP_TIP`
map (10 distinct tips) and wired it into `dropSentence()`'s `partner` branch
only (not `FULL_SPECIFICITY`, per scope). Regenerated `copy-matrix.ts`;
`COPY_MATRIX_COUNTS` is unchanged (790 total) since no keys were added or
removed.

`[ADDED]` **`RELATION_ACTION_REGISTER` opener pools (8 hand-authored
paraphrases per relationship-type group per nature) + `pickOpener()` /
`stablePairHash()`.** The Compare opener heading is now a deterministic
function of the real aspect's two bodies (never row position, never
`Math.random`), so the same pair always renders the same heading and
different couples' pairings read differently instead of every page showing
the identical canned sentence. Pool size (8) is verified against the real
production case that shipped the bug (Stacy/Randall, romantic: jupiter-sun,
jupiter-mars, uranus-sun, uranus-mars — all four resolve to distinct
indices), not an exhaustive injective proof across all 55 possible body
pairs; grow the pool rather than special-case a future collision. Note the
one shipped consumer (`FlowsAndCatchesSection`) already dedupes the heading
to once per nature per page, so within-page repetition was already
structurally bounded — what this actually fixes is cross-comparison
repetition (every couple seeing the identical hardcoded line). "partners"
and "romantic" share one pool (the romantic register); the other five
relationship types each have their own.

`[ADDED]` **`RELATION_HEADLINE.romantic` and `RELATION_HEADLINE.platonic`.**
`compareHeadline()` previously fell through to the three generic score-band
lines for these two types — the exact pair the public, no-signup Quick
Compare (`/chart/compare`) offers — so its headline never read like an
authored relationship read. Both types now have their own authored line;
`platonic` intentionally matches `OG_PLATONIC_SUMMARY` in `og-card.ts` for
continuity (that file's own doc comment already anticipated this addition
and gates `resolveOgCompareSummary()`'s romantic branch before any
`RELATION_HEADLINE` lookup, so this cannot affect OG card safety behavior).

`[ADDED]` **Tests.** `packages/astro/src/__tests__/aspect-opener-variety.test.ts`
covers the exact shipped four-aspect scenario across every relationship type,
full-line distinctness, determinism (repeated calls, direction independence,
harmony-magnitude independence), and broader real-body-domain sampling.
`apps/web/lib/compare-guidance.test.ts` gained a twelve-case exact-string
assertion for every Venus sign's rendered "feel loved through" sentence, plus
a regex guard against the to-infinitive/bare-clause shape of the shipped bug,
and dedicated `compareHeadline` romantic/platonic coverage. `apps/web/lib/og-card.test.ts`
and `apps/mobile/src/lib/mobile-safety-parity.test.ts` updated for the new
authored strings (no coverage removed).
