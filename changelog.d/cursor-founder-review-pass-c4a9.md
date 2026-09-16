## Founder review pass: Tier 1 copy, tag removal (branch `cursor/founder-review-pass-2172`) — 2026-09-15

**Trigger**: Founder review of `FOUNDER-REVIEW`-tagged strings. Ten copy issues needed a rewrite. Forty-one code fragments and every remaining tagged string were approved as-is.

`[CHANGED]` **Ten user-facing strings (Tier 1).** Network, checkout, payment-pending, admin posts, synastry-wheel hedge, and chart-precision ladder copy now match founder voice. No em dashes. Two JSDoc tags on `/why-galaxia` and `/security` were comments only and were removed without rewriting the titles.

`[CHANGED]` **Removed every `FOUNDER-REVIEW` tag from app source and content.** Tags came off the 41 listed fragments and the rest of the approved strings without changing their copy. Applied SQL migrations, changelog fragments, `ENGINEERING.md`, and the historical inventory were left alone.

`[CHANGED]` **Tests that required a live `FOUNDER-REVIEW` marker now lock em-dash absence and the new checkout/pending copy instead.** SQL migration tests still assert the markers in applied migrations.
