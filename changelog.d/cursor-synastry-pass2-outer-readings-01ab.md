## Synastry reading library PASS 2: outer-planet entries (branch `cursor/synastry-pass2-outer-readings-01ab`) - 2026-09-10

**Trigger**: Phase 0 measurement found 53.3% of the compare reading grid falling through to five generic `ASPECT_NATURE` shorts, each shared by 24 pairs. Every pair involving uranus, neptune, or pluto was unauthored. Two rows in the same report could render byte-identical italic copy. Em dashes (U+2014) had also shipped on three compare surfaces.

`[ADDED]` **120 curated synastry readings in `packages/astro/src/synastry-interpretations.ts`.** 24 unordered pairs (7 personal/social bodies x 3 outers, plus uranus-neptune, uranus-pluto, neptune-pluto) x 5 aspect types. Lookup is still `SYNASTRY_PAIR[PAIR(a,b)][aspect]`; relation type is not in the key, so every string is written to read on parent-child / ancestor / friends as well as partners. No sexual, romantic, or possessive charge. No U+2014. Every entry is tagged `FOUNDER-REVIEW`. Same-body pairs stay unauthored (the compare surface drops `from===to`).

`[CHANGED]` **`interpretSynastryAspect` fallback is now unreachable for any renderable outer pair.** The miss path remains for same-body pairs and is still proven never to leak natal `ASPECT_PAIR` voice.

`[ADDED]` **`selectCompareAspectRows` in `packages/astro/src/compare-guidance.ts`.** Shared assembler for the flows/catches surface (web Compare, Quick Compare, share snapshots, Quick Check). Drops same-body aspects and keeps the tighter orb when A→B and B→A share an unordered pair and aspect type, so two directions cannot render identical italic copy. Collision tests and UI cannot drift.

`[CHANGED]` **Collision gate at `packages/astro/src/__tests__/aspect-tail-collisions.test.ts` now covers the reading layer.** It compares full rendered strings (opener + tactic, and the italic+tactic row the page shows), not authored tails only, and fails when two rows in a single rendered report share a string. A 200-pair engine simulation is part of the gate.

`[CHANGED]` **Removed every U+2014 from authored Compare copy.** Rewrites in `compare-guidance.ts` (register openers, need/how tables, early tactics, headlines, house overlay, element lines) and user-facing strings on `/app/compare`, `/chart/compare`, and mobile Compare. Meaning unchanged.

`[ADDED]` **Lint test `no-em-dash-in-compare-copy.test.ts`.** Strips comments, then fails on U+2014 in string literals or JSX of the compare copy files.
