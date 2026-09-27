## Sign metadata significance copy (branch `cursor/sign-metadata-significance-copy-2828`) — 2026-09-27

**Trigger**: the Sun sign reference card listed Element, Metal, and Birthstone as bare
labels. "Diamond" and "Iron" decorated the page without explaining anything. The symbol
origin already earned its place; the other items did not.

`[ADDED]` **`elementSignificance`, `metalSignificance`, and `birthstoneSignificance` on every
`SIGN_METADATA` entry (`packages/astro/src/sign-metadata.ts`).** One to two sentences each,
written per sign rather than per element or per material, because the same element reads
differently through each sign (Aries fire is ignition, Leo fire is a hearth) and two signs
sharing a material read it differently too (Taurus and Libra both get copper; Virgo and
Pisces both get platinum). All 36 strings are tagged `FOUNDER-REVIEW` and asserted verbatim
in `packages/astro/test/sign-metadata.test.ts`, so a reword is a deliberate test change, not
a drive-by edit.

`[CHANGED]` **The sign metadata card now shows every significance by default, on web and
mobile** (`apps/web/components/sign-metadata-cards.tsx`,
`apps/mobile/src/components/sign-metadata-cards.tsx`, so the person profile, Quick Chart, and
mobile profile all pick it up). The significances are short, so they are plain body copy in
the same mist style as the symbol origin, not a second thing to tap. The symbol origin stays
expandable because it is the long one. `Metal` and `Birthstone` moved from one horizontal
strip to stacked blocks so each value has room for its explanation underneath.

`[CHANGED]` **The card is built from three separated rows** (identity pills plus element
significance, symbol plus origin, then materials). Each row is a `sign-metadata-card__row`
with a hairline and 18px of padding above it, replacing the ad-hoc margins that made the card
feel cramped. The standing rule this encodes: if an item on this card has no meaning beyond
decoration, it does not belong on the card.
