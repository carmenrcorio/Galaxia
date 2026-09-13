-- Six owner-scoped policies created by migrations below this one predate
-- this repo's later convention of "drop policy if exists" before "create
-- policy". CREATE POLICY has no IF NOT EXISTS in Postgres, so each of
-- those six statements can only ever run once against a given database.
--
-- On production (eigfvribtntbxyjutsma) every one of the six was already
-- applied, but under a ledger version stamped at manual-apply time rather
-- than the committed file's own timestamp (the same skew ENGINEERING.md
-- section 16 names as expected: "MCP apply_migration stamps the apply time
-- as version"). A deploy that reconciles by that version column, rather
-- than by migration name, still sees each committed timestamp as pending
-- and tries to run it again, and the bare create policy then fails with
-- "policy ... already exists". Confirmed against production's live
-- pg_policy for person_daily_nudges before writing this file.
--
-- This migration drops each policy first, guarded so it is a no-op on a
-- database where the target table does not exist yet (a fresh replay,
-- where the six files below create both the table and the policy for the
-- first time) and a no-op when the policy is already absent. Every one of
-- the six is dropped and recreated again later, by
-- 20260726000000_person_daily_nudges_rls_hardening.sql for the first and
-- by 20260913030100_wrap_auth_uid_in_rls_policies.sql for all six, so the
-- final shape of each policy is unaffected by whether this file's drop
-- ever finds anything to do.
do $$
begin
  if to_regclass('public.person_daily_nudges') is not null then
    execute 'drop policy if exists "person_daily_nudges owner all" on public.person_daily_nudges';
  end if;
  if to_regclass('public.vela_rate_limits') is not null then
    execute 'drop policy if exists "vela_rate_limits owner read" on public.vela_rate_limits';
  end if;
  if to_regclass('public.support_requests') is not null then
    execute 'drop policy if exists "support_requests owner insert" on public.support_requests';
  end if;
  if to_regclass('public.memorial_milestones') is not null then
    execute 'drop policy if exists "memorial_milestones owner all" on public.memorial_milestones';
  end if;
  if to_regclass('public.relational_transits') is not null then
    execute 'drop policy if exists "relational_transits owner all" on public.relational_transits';
  end if;
  if to_regclass('public.push_tokens') is not null then
    execute 'drop policy if exists "push_tokens owner all" on public.push_tokens';
  end if;
end
$$;
