## Rename duplicate 20260914280000 migration and apply it (branch `cursor/rename-duplicate-migration-8087`) — 2026-09-15

**Trigger**: Two files on `main` used timestamp `20260914280000` (PRs #286 and #285). `schema_migrations.version` is a primary key, so `npx supabase migration list` could not mark both REMOTE YES. `relationships_edge_constraints` (#286, first on main) was already applied. `quick_share_expiry_and_revoke` needed its own prefix.

`[FIXED]` **Renamed `20260914280000_quick_share_expiry_and_revoke.sql` to `20260914280200_quick_share_expiry_and_revoke.sql`.** 200 seconds after the collision, past the 60-second rule in `ENGINEERING.md` §16. File body unchanged.

`[FIXED]` **Applied `quick_share_expiry_and_revoke` on `eigfvribtntbxyjutsma` via MCP `apply_migration` under version `20260914280200`.** `relationships_edge_constraints` keeps `20260914280000`. `npx supabase migration list` shows both as REMOTE YES.
