-- Corrective RLS hardening for person_daily_nudges (missed the
-- 2026-07-12 cross-user audit pass because it landed later, in PR #118 /
-- 2026-07-25). Same pattern as the FIX 4 "referenced people must be owned
-- by the writer" policies in 20260712210000_rls_cross_user_hardening.sql.
--
-- This is an INTEGRITY fix, not a read-leak fix: owner_id = auth.uid() was
-- already correctly enforced, so no other owner could ever SELECT a row
-- they don't own. The gap was that a caller authenticated as owner A could
-- INSERT/UPDATE a person_daily_nudges row whose person_id points at a
-- person owned by B (B still cannot read it, since owner_id stays A's).
-- Additive only: alters the existing policy, does not touch the table.

drop policy if exists "person_daily_nudges owner all" on person_daily_nudges;

create policy "person_daily_nudges owner all"
on person_daily_nudges for all
using (
  owner_id = auth.uid()
  and exists (
    select 1 from people p
    where p.id = person_daily_nudges.person_id
      and p.owner_id = auth.uid()
  )
)
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from people p
    where p.id = person_daily_nudges.person_id
      and p.owner_id = auth.uid()
  )
);
