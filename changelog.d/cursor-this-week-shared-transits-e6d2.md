## This Week shared transits (branch `cursor/this-week-shared-transits-e6d2`) — 2026-09-27

**Trigger**: The live This Week feed was reprinting the same Saturn and Jupiter contacts as triples, subset pairs, and reordered pairs, all through two valence sentences.

`[FIXED]` **Shared transits are pairwise and synastry-gated.** A card is two people, and only when the natal points the transit touches already aspect each other within 3°. Incidental co-transits stay off the shared feed. Canonical ids collapse reordered pairs. A pair contained in a larger same-sky cluster is not shown beside that cluster. The 2026-09-27 seven-card snapshot collapses to 4 events, and the surface renders the top 3.

`[ADDED]` **Salience, cadence, and authored copy.** Orb tightness dominates. Applying contacts and faster bodies (Sun, Mercury, Venus, Mars) rank up, so the week can change. A seen event stays down until its exactness moves by a day. Card sentences come from a static template registry selected by a hash of the event id. New user-facing strings are tagged FOUNDER-REVIEW.

`[DECISION]` **Faster shared links are computed when the feed renders.** `relational_transits.transit_body` still allows only Jupiter through Pluto, so the daily job stores slow relational pairs only. The weekly surface does not read those rows as its cards.

`[OPEN]` **Long arcs.** Slow events that miss the weekly cut are returned by the pipeline and not rendered yet. Widening the stored `transit_body` check so push can name faster shared links needs a migration.
