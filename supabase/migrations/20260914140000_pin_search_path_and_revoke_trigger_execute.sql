-- Close the SECURITY DEFINER / mutable-search_path advisors without widening
-- RLS. Safe to apply via `supabase db push` (and MCP apply_migration): every
-- statement is transactional. Does not need autocommit. There is no
-- CREATE INDEX CONCURRENTLY and no other form that refuses to run inside a
-- transaction.
--
-- PHASE 0 (production eigfvribtntbxyjutsma, 2026-09-14), six tables with
-- RLS enabled and zero policies. Verdict for each: correctly deny all.
-- This file adds NO policies. A table nobody reads from a client session
-- does not need a policy; adding one only widens the surface.
--
--   admin_audit_log
--     Writes: service-role only, from writeAdminAuditLog
--     (apps/web/lib/admin/audit-log.ts) after requireAdmin/requireAdminApi
--     gated admin actions. Also purge_own_account_data() (SECURITY DEFINER)
--     nulls actor_id/target_user_id on self-delete.
--     Reads: service-role only, from readAdminAuditHistory
--     (apps/web/lib/admin/read-audit-history.ts) for /admin/users/[id].
--     Client session path: none. The table already revokes
--     SELECT/INSERT/UPDATE/DELETE from anon and authenticated
--     (20260821191500_admin_role_foundation.sql).
--     Verdict: correctly deny all.
--
--   admin_users
--     Writes: founder seed in 20260821191500; later grants are
--     dashboard/service-role only. Never a client insert (that would be
--     the self-grant-admin exploit requireAdmin exists to prevent).
--     Reads: service-role only, readAdminRow() inside requireAdmin /
--     requireAdminApi (apps/web/lib/read-admin-row.ts).
--     Client session path: none. Same revoke as admin_audit_log.
--     A session client returning zero rows here would fail closed for the
--     wrong reason (every user looks like a non-admin), which is why
--     requireAdmin refuses to use one.
--     Verdict: correctly deny all.
--
--   daily_nudge_emails
--     Writes/reads: CRON_SECRET-gated POST /api/cron/nudge-send, service
--     role key, idempotency ledger (owner_id, date). purge_own_account_data
--     deletes the caller's rows.
--     Client session path: none. The Settings toggle reads
--     profiles.daily_nudge_emails_enabled, not this ledger.
--     Verdict: correctly deny all.
--
--   galaxy_relations
--     Writes: seed in 20260913170000 (21 picker values). No app writer.
--     Reads: create_connect_invite and add_sender_to_constellation
--     (SECURITY DEFINER, table owner bypasses RLS). The picker UI reads
--     GALAXY_RELATION_PICKER_OPTIONS from packages/core, never this table.
--     Client session path: none. RLS was enabled by the rls_auto_enable
--     event trigger (the CREATE TABLE migration did not add a policy,
--     which is the intended posture).
--     Verdict: correctly deny all.
--
--   quick_share_snapshots
--     Writes: POST /api/quick-share via insertQuickShareSnapshot, service
--     role (apps/web/lib/quick-share-server.ts).
--     Reads: GET /s/[token] and its opengraph-image via
--     getQuickShareByToken, same service-role helper. A forged token
--     therefore cannot SELECT another row via the anon key (the original
--     20260722140000 comment).
--     Client session path: none. If a client session did read this table
--     today, /s/[token] would be silently empty; it does not.
--     Verdict: correctly deny all.
--
--   trial_emails
--     Writes/reads: CRON_SECRET-gated POST /api/cron/trial-emails, service
--     role key, idempotency ledger (user_id, kind).
--     Client session path: none.
--     Verdict: correctly deny all.
--
-- PHASE 1, only what that table approved:
--   1. Pin search_path on the one flagged function
--      (set_memorial_milestones_updated_at). It is a BEFORE UPDATE trigger,
--      SECURITY INVOKER, body is `new.updated_at = now(); return new`.
--      now() lives in pg_catalog, which is always searched, so an empty
--      search_path is enough. Same pin as validate_profile_timezone.
--   2. Revoke EXECUTE from public/anon/authenticated on the three trigger
--      functions that still had it. Postgres fires triggers as the table
--      owner; the inserting role does not need EXECUTE
--      (20260822130000_support_request_rate_limit_revoke_execute.sql).
--      Direct /rest/v1/rpc/<name> is what we are closing.
--
-- Intentionally NOT revoked: every SECURITY DEFINER RPC that a signed-in
-- user is supposed to call (create_connect_invite, accept_connect_invite,
-- connect_invite_preview, revoke_connect_invite, add_sender_to_constellation,
-- set_connection_share_level, revoke_connection, approve_reverse_grant,
-- acknowledge_connect_accept, delete_own_group, delete_own_person,
-- purge_own_account_data, check_and_increment_vela_rate). Those already
-- REVOKE from public/anon and GRANT to authenticated. Advisor 0029 will
-- keep flagging them; that finding is the intended PostgREST surface.

create or replace function public.set_memorial_milestones_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_memorial_milestones_updated_at() is
  'BEFORE UPDATE on memorial_milestones. Sets new.updated_at = now(). Trigger only: not an RPC. search_path pinned empty because the body qualifies nothing outside pg_catalog.';

-- 1. set_memorial_milestones_updated_at: BEFORE UPDATE trigger, INVOKER.
--    Advisor was function_search_path_mutable (0011). EXECUTE on this
--    function is not required for the update that fires the trigger.
revoke execute on function public.set_memorial_milestones_updated_at()
  from public, anon, authenticated;

-- 2. sync_linked_chart_mirrors: AFTER INSERT OR UPDATE on charts,
--    SECURITY DEFINER so it can write viewer-owned chart rows. Trigger
--    only; the product never calls it via supabase.rpc().
revoke execute on function public.sync_linked_chart_mirrors()
  from public, anon, authenticated;

-- 3. sync_linked_person_mirrors: AFTER UPDATE on people, SECURITY DEFINER
--    so it can write viewer-owned people rows. Trigger only.
revoke execute on function public.sync_linked_person_mirrors()
  from public, anon, authenticated;
