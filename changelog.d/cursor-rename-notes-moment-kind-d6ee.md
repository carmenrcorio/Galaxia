## Rename notes_moment_kind off the shared 20260914270000 prefix (branch `cursor/rename-notes-moment-kind-d6ee`) — 2026-09-14

**Trigger**: Two files on `main` used timestamp `20260914270000`. `schema_migrations.version` is a primary key, so `npx supabase migration list` could mark only one of them REMOTE YES. `people_star_scale_and_free_seat` was already applied. `notes_moment_kind` needed its own prefix.

`[FIXED]` **Renamed `20260914270000_notes_moment_kind.sql` to `20260914270200_notes_moment_kind.sql`.** 200 seconds after the collision, past the 60-second rule in `ENGINEERING.md` §16. File body unchanged. `apps/web/lib/notes-moment-migration.test.ts` now points at the new path.

`[FIXED]` **Applied `notes_moment_kind` on `eigfvribtntbxyjutsma` via MCP `apply_migration` under version `20260914270200`.** `people_star_scale_and_free_seat` keeps `20260914270000`. `npx supabase migration list` has zero LOCAL YES / REMOTE NO rows.
