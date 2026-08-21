-- Admin role foundation (Phase 0 — storage + bootstrap only).
--
-- This migration ONLY establishes where "is this user an admin?" is decided
-- and locks the write path so a client can never grant itself admin. It does
-- NOT build the admin portal, user management, any billing-write action, or
-- content authoring — those import this foundation in a later phase.
--
-- Deliberately a separate table, not `profiles.role`: authorization
-- ("can this user act on other users' data/billing") is a different
-- question from entitlement ("can this user use the product" — profiles.
-- comped, subscription_status). `profiles` already carries billing columns
-- that have to be defended forever against the owner-write grant list
-- (see 20260724180000_comped_entitlement_and_profile_column_grants.sql's own
-- postmortem: "Convention said 'webhook-only'; the database did not enforce
-- it"). A `role` column there would be one more thing on that list to never
-- forget. `admin_users` instead gets a stronger property for free: RLS
-- enabled with ZERO policies for anon/authenticated means there is no
-- policy under which a client session could read OR write this table at
-- all — not merely "not client-writable" but "not even client-readable".
-- Same "no policy = no client access" pattern already proven out for
-- `trial_emails` (20260710183000_threads_status_and_trial_emails.sql) and
-- `person_daily_nudges` (20260725040000_person_daily_nudges.sql /
-- 20260726000000_person_daily_nudges_rls_hardening.sql).

create table if not exists public.admin_users (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin', -- vocabulary can grow later; the pure isAdmin() check in @galaxia/core decides which values count
  created_at timestamptz not null default now()
);

comment on table public.admin_users is
  'Authorization (not entitlement — see profiles.comped for billing) — who may use admin-gated surfaces. RLS enabled with NO policies for anon/authenticated by design: this table is not client-readable OR client-writable under any path. Only service_role/postgres may read or write it. Read via the shared requireAdmin()/isAdmin() guard (apps/web/lib/require-admin.ts, @galaxia/core), never inline. First row (the founder) is bootstrapped by this migration, keyed to a stable auth.users.id, not email.';

alter table public.admin_users enable row level security;

-- No policies created for anon/authenticated on purpose — "no policy = no
-- client access" under RLS covers every command (select/insert/update/
-- delete) with a default-deny. Belt-and-suspenders: also revoke the
-- underlying table privileges explicitly, so the property holds even if a
-- policy is ever added later without also reviewing the grant.
revoke select, insert, update, delete on table public.admin_users from anon, authenticated;

-- Audit log shape only, reserved now so the next phase (which builds real
-- admin actions) writes to a fixed schema from day one. NOTHING writes to
-- this table in this migration or this phase — there are no admin actions
-- yet to log. Same service-only posture as admin_users.
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id),
  action text not null, -- fixed vocabulary (e.g. grant_comp, revoke_comp, modify_account, grant_admin) — never free text
  target_user_id uuid references auth.users(id),
  before jsonb,
  after jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);

comment on table public.admin_audit_log is
  'Reserved shape for logging privileged admin actions (actor, fixed-vocabulary action, target, before/after state). Schema-only in this phase: nothing writes here yet, since no admin action exists yet to log. Same "no client policy" service-only posture as admin_users.';

alter table public.admin_audit_log enable row level security;
revoke select, insert, update, delete on table public.admin_audit_log from anon, authenticated;

-- FIRST-ADMIN BOOTSTRAP: a one-time, versioned, auditable migration insert,
-- exactly like profiles.comped's own founder grant in
-- 20260724180000_comped_entitlement_and_profile_column_grants.sql — which
-- made the same choice to key off the founder's auth.users.id rather than
-- her (mutable) email. Nothing in this repo ever branches on
-- carmen.r.corio@gmail.com; this migration doesn't start that pattern either.
insert into public.admin_users (owner_id, role)
values ('8112465c-f74b-4842-9ef4-9d30e98d4ccb', 'admin')
on conflict (owner_id) do nothing;
