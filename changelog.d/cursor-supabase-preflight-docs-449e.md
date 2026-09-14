## Document the Supabase CLI pre-flight for Cloud Agent migrations (branch `cursor/supabase-preflight-docs-449e`), 2026-09-14

**Trigger**: a Cloud Agent migration task can look like it is ready to apply SQL when `SUPABASE_ACCESS_TOKEN` is missing or scoped to the wrong org, because `supabase projects list` then omits production.

`[ADDED]` **`AGENTS.md` now has a Supabase pre-flight section** that agents must run before writing or applying any migration: `npx supabase projects list` must show `eigfvribtntbxyjutsma`, otherwise stop and tell Carmen to refresh the Cloud Agent environment token. The same section records `npx supabase link --project-ref eigfvribtntbxyjutsma --yes` so later CLI calls in this repo resolve to production without repeating `--project-ref`.

`[CHANGED]` **`ENGINEERING.md` §5 now states the token requirement next to the production ref.** The Cloud Agent environment must have a `SUPABASE_ACCESS_TOKEN` scoped to the GALAXIA org (`agffssgigtqkagsxvjxg`); if `supabase projects list` does not return this ref, the token needs to be refreshed before any migration work starts.
