## F12 Phase 6 internal links and Phase 7 date stagger (branch `cursor/f12-phase6-phase7-d313`) - 2026-09-14

**Trigger**: Editorial F12. Concept terms in published posts were unlinked, and every `published_at` sat on 9 or 14 Sep 2026, which reads as batch publishing.

`[CHANGED]` First unlinked mention of each founder-confirmed term is now a markdown link (`[original text](/slug)`) in `public.posts.body` via `supabase/migrations/20260914221000_f12_internal_links.sql`. Headings, existing `[…](…)` spans, and self-links are skipped. Link text is existing copy (FOUNDER-REVIEW on the map, not new prose). No em dashes.

`[CHANGED]` `published_at` on all ten published posts is staggered across the past eight weeks, UTC noon, via `supabase/migrations/20260914230000_f12_stagger_published_at.sql`. Title, dek, category, and status are untouched.

`[DECISION]` Applied to production (`eigfvribtntbxyjutsma`) with MCP `apply_migration` after founder confirmation. Ledger identity is the snake_case suffix (`f12_internal_links`, `f12_stagger_published_at`).
