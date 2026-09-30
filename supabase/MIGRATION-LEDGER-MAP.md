# Supabase migration ledger map (git ↔ production)

Production project: `eigfvribtntbxyjutsma`  
Snapshot date: 2026-09-30 (via Supabase MCP `list_migrations`)

This file documents **version string drift** between committed migration filenames and rows in `supabase_migrations.schema_migrations`. It does **not** rename files or edit the production ledger.

## Summary

| Category | Count | Action |
|----------|------:|--------|
| Same logical migration, different version timestamp | 6 | Tracking only — content applied under prod version |
| Git filename with no prod name match | 1 | **Manual review** — may be unapplied |
| Prod ledger name with no git name match | 1 | Empty name on prod — likely same as git `people_notes_messages_indexes` |

## Version mismatches (same name suffix)

| Git file | Production version | Notes |
|----------|-------------------|--------|
| `20260927032000_account_export_rate_limit.sql` | `20260927034139` | Same feature; prod timestamp differs |
| `20260929230323_blog_post_timely_and_drop_pricing_lines.sql` | `20260930020205` | |
| `20260930021501_blog_publication_phase_2.sql` | `20260930030211` | |
| `20260930031243_blog_index_phase_3.sql` | `20260930034357` | |
| `20260930035909_older_post_heroes.sql` | `20260930041030` | |
| `20260930145501_blog_polish_round_3.sql` | `20260930164350` | |

For these pairs, compare file checksums or `pg_dump` diff if unsure; historically they were re-timestamped before apply, not divergent SQL.

## Git-only migration (not in production ledger by name)

| Git file | Status |
|----------|--------|
| `20260929210958_blog_post_image_urls.sql` | **Not listed in production** — do not apply automatically; confirm with Carmen whether content was folded into another migration or is pending. |

## Production-only ledger entry (no git name suffix)

| Production version | Name in ledger |
|--------------------|----------------|
| `20260914023000` | *(empty)* |

Git has `20260914023000_people_notes_messages_indexes.sql` at the same version prefix — treat as the same migration with a missing name in the ledger.

## Applying new work

New migrations (e.g. `20260930210000_security_phase_1_fixes.sql`) must use a version strictly after the highest production entry per `AGENTS.md` / `ENGINEERING.md` §16. At snapshot time the highest ledger entry was `20260930164350`.

## Applied via MCP (2026-09-30)

Git file `20260930210000_security_phase_1_fixes.sql` was applied to production in **two** MCP `apply_migration` records (same SQL, split for delivery):

| Production version | Name |
|--------------------|------|
| `20260930200957` | `security_phase_1_fixes` (rate limits + early_access policy) |
| `20260930201023` | `security_phase_1_fixes_account_purge` (`purge_user_account` + disabled `purge_own_account_data`) |
