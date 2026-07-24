-- Durable founder/comp entitlement + close the profiles self-grant door.
--
-- BEFORE (profiles RLS — row policies only; every column was owner-writable):
--   "profiles owner read"   SELECT  USING (id = auth.uid())
--   "profiles owner upsert" INSERT  WITH CHECK (id = auth.uid())
--   "profiles owner update" UPDATE  USING (id = auth.uid()) WITH CHECK (id = auth.uid())
-- Column privileges granted UPDATE on ALL columns to anon + authenticated
-- (including subscription_status, trial_ends_at, plan, …). Convention said
-- "webhook-only"; the database did not enforce it.
--
-- AFTER: same row policies (owner still reads/updates/inserts their row), but
-- authenticated may UPDATE/INSERT only owner-controlled columns. Billing +
-- comped columns are service_role (and postgres) only.

alter table public.profiles
  add column if not exists comped boolean not null default false;

comment on column public.profiles.comped is
  'Durable complimentary access (founder / comped accounts). Independent of billing. hasAccess grants when true OR billing/trial is live. Never written by the RevenueCat webhook; service-role only.';

-- Owner-controlled columns a client may legitimately write.
-- `id` is included so PostgREST upserts of {id, display_name|house_system} keep working.
revoke insert on table public.profiles from anon, authenticated;
revoke update on table public.profiles from anon, authenticated;

grant insert (id, display_name, house_system) on table public.profiles to authenticated;
grant update (id, display_name, house_system) on table public.profiles to authenticated;

-- service_role / postgres retain full table privileges from prior grants.

-- Founder account: durable comp; replace the hand-set 2099 trial hack with the
-- real trial window (created_at + 14 days). Access now comes from comped, not
-- a fake trial date.
update public.profiles
set
  comped = true,
  trial_ends_at = created_at + interval '14 days'
where id = '8112465c-f74b-4842-9ef4-9d30e98d4ccb';
