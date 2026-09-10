## Synastry reading library PASS 2: outer-planet entries (branch `cursor/synastry-pass2-outer-readings-01ab`) - 2026-09-10

**Trigger**: Phase 0 measurement found 53.3% of the compare reading grid falling through to five generic `ASPECT_NATURE` shorts, each shared by 24 pairs. Every pair involving uranus, neptune, or pluto was unauthored. Two rows in the same report could render byte-identical italic copy.

`[ADDED]` **120 curated synastry readings in `packages/astro/src/synastry-interpretations.ts`.** 24 unordered pairs (7 personal/social bodies x 3 outers, plus uranus-neptune, uranus-pluto, neptune-pluto) x 5 aspect types. Lookup is still `SYNASTRY_PAIR[PAIR(a,b)][aspect]`; relation type is not in the key, so every string is written to read on parent-child / ancestor / friends as well as partners. No sexual, romantic, or possessive charge. No U+2014. Every entry is tagged `FOUNDER-REVIEW`. Same-body pairs stay unauthored (the compare surface drops `from===to`).

`[CHANGED]` **`interpretSynastryAspect` fallback is now unreachable for any renderable outer pair.** The miss path remains for same-body pairs and is still proven never to leak natal `ASPECT_PAIR` voice.

`[OPEN]` Collision-gate extension (full rendered strings, same-report duplicates) and the U+2014 purge in `compare-guidance.ts` / compare UI are Phase 2 and Phase 3, held for founder review of these 120 strings.
