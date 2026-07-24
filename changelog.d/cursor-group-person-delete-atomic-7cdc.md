## Atomic group + person delete (branch `cursor/group-person-delete-atomic-7cdc`) — 2026-07-24

**Trigger**: Groups had create/edit/preview but no delete; person delete on web was four non-atomic client deletes that could leave below-minimum cohorts (and fail on FK when conversations existed). Mobile had no person-delete path.

`[ADDED]` **`delete_own_group` / `delete_own_person` SECURITY DEFINER RPCs** — single-transaction, owner-checked (`auth.uid()`), matching account-purge FK order. Group delete destroys attached threads (not detach); person delete collapses any group that would fall below three members by **calling** `delete_own_group` (follow-up migration consolidates the earlier reimplementation). Web and mobile both call these RPCs.

`[DECISION]` **Below-minimum groups are deleted, not left degraded.** A cohort that cannot be created (<3) cannot meaningfully exist. Confirmation copy names the person, each collapsing group with its own conversation count (same voice as `formatGroupDeleteConfirmation`), and person/pair conversations (`formatPersonDeleteConfirmation`, FOUNDER-REVIEW). Legacy below-minimum rows no longer present generate/Ask Vela as if they work.

`[FIXED]` **Web person delete is atomic**; mobile gains the same person-delete path on profile (non-self). Non-owners are rejected by the function’s ownership check (RLS alone does not protect SECURITY DEFINER).

`[OPEN]` **SQL migrations are manual.** There is no CI that applies `supabase/migrations/**` on merge — only edge functions deploy via GitHub Actions. Production (`eigfvribtntbxyjutsma`) must receive `supabase db push` / Dashboard apply / MCP `apply_migration` before a web deploy that calls new RPCs, or delete breaks for every user.
