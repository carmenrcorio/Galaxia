## Gift share: a free natal chart with a path back in (branch `cursor/gift-share-chart-3ef7`) — 2026-09-14

**Trigger**: The free chart was shareable, but the copied `/s/<token>` page was a read-only snapshot with no way for the recipient to add that person or compare, no expiry, and no revoke. The share control also did not say what the recipient would be able to see. Birth details belong to a real person, so the gift has to stay on an unguessable token with noindex.

`[DECISION]` **Reuse `/s/[token]`. Do not add a fourth token pattern.** Phase 0: `/s/<token>` is the real share route (tokenized snapshot, public, noindex). `/r/[slug]` is the native-app deep-link bridge (`galaxia://slug`), not a chart share. `/invite/[token]` collects birth data. `/connect/[token]` is constellation connect. The gift link stays `/s/<token>`. Compare return-path uses `/chart/compare?gift=<token>` so birth data never enters that URL either. Logged-out add reuses the invitation `signup?next=` return.

`[DECISION]` **Gift natal shares store an allowlisted `giftBirth` envelope behind the token.** The URL still never contains a name or birth params. Recipients who have the link can add the person or compare without retyping. Chart rows still strip lat/lng/time; OG cards ignore `giftBirth`. Compare shares do not store `giftBirth`. Older snapshots without the envelope stay readable and say they cannot be added or compared from the link.

`[DECISION]` **Shared chart URLs must not be indexed.** They already send `robots: noindex, nofollow` and are absent from the sitemap. `public/robots.txt` now also `Disallow: /s/`, `/invite/`, and `/connect/`. A shared chart contains a real person's birth date and often their birth place. Link-preview crawlers still unfurl the existing OG image.

`[ADDED]` **Shared natal view: chart, plain-language need, one-line Galaxia framing, no paywall.** Uses `singleChartNeed` (curated placement copy, never invented). Two actions: add this person to my own constellation, and see how you and this person compare (viewer enters only their own birth details).

`[ADDED]` **Expiry and revoke.** New shares default to 14 days (same window as invitations). Signed-in creators can pick 7 / 14 / 30 days or no expiry, and revoke from Settings. Anonymous shares always expire (they cannot revoke). Expired and revoked tokens 404 the same as unknown tokens. Migration `20260914280000_quick_share_expiry_and_revoke.sql` adds `expires_at` and `revoked_at`.

`[CHANGED]` **Copy share link discloses what the recipient will see**, including birth date and place on a gifted natal chart. PDF footnote now carries `galaxiamea.com`.
