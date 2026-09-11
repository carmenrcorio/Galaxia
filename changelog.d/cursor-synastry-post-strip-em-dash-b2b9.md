## Strip reintroduced U+2014 from synastry-chart-meaning (branch `cursor/synastry-post-strip-em-dash-b2b9`) — 2026-09-11

**Trigger**: `20260909120000_synastry_post_internal_links.sql` was written before the em-dash purge (`20260911161000_posts_rewrite_em_dash.sql`) and was applied to production after it. That UPDATE restored 14 U+2014 characters into the `synastry-chart-meaning` body while adding the three missing internal links.

`[FIXED]` **Rewrote only the reintroduced em dashes in `public.posts.body` for slug `synastry-chart-meaning`.** New migration `supabase/migrations/20260911230000_synastry_post_strip_reintroduced_em_dash.sql`. Same rewrite approach as the original purge (comma, colon, parentheses, or two sentences; never a hyphen). The three internal links (`/meet-vela`, `/generations`, `/chart/compare`) and their anchor text are unchanged. `title` and `dek` are untouched. FOUNDER-REVIEW on every rewritten sentence. Neither prior migration was re-run.

Applied to production via MCP `apply_migration` (`name=synastry_post_strip_reintroduced_em_dash`, recorded as version `20260911223154`). Live re-query: `body like '%' || chr(8212) || '%'` is false; em-dash count is 0; all three links and original anchors remain. `https://galaxiamea.com/synastry-chart-meaning` renders the rewritten sentences with `x-vercel-cache: MISS` and zero U+2014 in the HTML.

A concurrent production apply named `synastry_post_em_dash_keep_links` (`20260911223101`) set `read_time_minutes` to 6. Restored to the Phase 0 value of **7** via `execute_sql` so this fix does not change that column. The committed migration never writes `read_time_minutes`.
