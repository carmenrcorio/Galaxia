## Ban U+2014 in user-visible copy (branch `cursor/ban-em-dash-user-copy-1f87`) — 2026-09-11

**Trigger**: A repo scan found em dashes in live titles (homepage, /pricing, /chart, /download), FAQ answers, interpretation libraries, and all four `posts` rows. Galaxia's authored voice does not use U+2014.

`[CHANGED]` **Rewrote user-visible copy that contained U+2014.** Marketing titles/meta/OG alt, FAQ, emails, app UI, Vela edge-function messages, and the interpretation / copy-matrix libraries. Each string was rewritten (two sentences, comma, colon, or parentheses), never hyphen-substituted. Tagged `FOUNDER-REVIEW`. Comments, tests, and docs left alone.

`[CHANGED]` **`public.posts` bodies (and one dek) rewritten in a new migration.** All four published rows had U+2014. `supabase/migrations/20260911161000_posts_rewrite_em_dash.sql` updates them. Applied migrations were not edited. Live verification, if any, stays behind `assertDisposableDbTarget`.

`[ADDED]` **CI gate so U+2014 cannot re-enter user-visible copy.** `packages/astro/src/__tests__/no-em-dash-user-copy.test.ts` walks `apps/`, `packages/`, and `supabase/functions/`, strips comments, and fails on remaining em dashes. Fixtures prove fail-on-planted and pass-on-clean. The existing compare-only scanner is unchanged. Rule and exemptions documented in `ENGINEERING.md` §15.
