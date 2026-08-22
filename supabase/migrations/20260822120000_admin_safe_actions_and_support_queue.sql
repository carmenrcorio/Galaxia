-- Admin portal Stage 2: safe email actions + support queue.
--
-- Stage 1 (20260821191500_admin_role_foundation.sql) already created
-- admin_users and admin_audit_log — nothing here touches either table's
-- shape. This migration ONLY adds the support_requests table that backs
-- the in-app "Contact support" form (Settings) and the admin support view
-- (/admin/support). The resend-email action (Stage 2's other safe action)
-- writes no new table — it calls the Supabase Auth Admin API directly and
-- logs to the existing admin_audit_log.
--
-- support_requests is NOT a zero-client-policy table like admin_users: an
-- authenticated user must be able to submit their own request. What it
-- shares with admin_users is that reads/updates are exclusively
-- service-role (behind requireAdmin()/requireAdminApi()) — there is no
-- select/update/delete policy for anon or authenticated at all, so a user
-- cannot read back their own submitted request, let alone anyone else's,
-- through the client. help@ ingestion is intentionally NOT built here —
-- the admin view only links out to the inbox.

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  email text not null,
  subject text not null,
  body text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  handled_by uuid references auth.users(id),
  handled_at timestamptz
);

comment on table public.support_requests is
  'In-app "Contact support" queue (Settings form -> here -> /admin/support). Authenticated users may INSERT their own row only (owner_id = auth.uid()) — no select/update/delete policy exists for anon or authenticated at all, so a user cannot read back even their own submitted request through the client. Admin reads and close/reopen writes go exclusively through the service-role client behind requireAdmin()/requireAdminApi() (apps/web/lib/admin/support-requests.ts), same "no policy = no client access" posture admin_users proved for those two commands. handled_by/handled_at are set only by the close/reopen admin actions, never by the client. No ON DELETE CASCADE from auth.users by design (matches trial_emails/invites) — purge_own_account_data() below is updated to delete/clear these rows explicitly instead, so self-serve account deletion is never blocked by a leftover support request.';

alter table public.support_requests enable row level security;

-- Belt-and-suspenders, same posture as admin_role_foundation's admin_users:
-- revoke every table privilege from anon/authenticated first, then grant
-- back only the single privilege (insert) the owner-insert policy below is
-- meant to allow. No select/update/delete grant exists for either role, so
-- those commands are permission-denied even if a policy were ever added
-- later without also reviewing the grant.
revoke select, insert, update, delete on table public.support_requests from anon, authenticated;
grant insert on table public.support_requests to authenticated;

create policy "support_requests owner insert"
on public.support_requests for insert
to authenticated
with check (owner_id = auth.uid());

create index if not exists support_requests_status_created_idx
  on public.support_requests (status, created_at desc);

-- ─── Light per-user insert rate limit ──────────────────────────────────────
--
-- The in-app form inserts directly against this table from the user's own
-- session (the owner-insert policy above is what allows it) — there is no
-- dedicated server route in front of it to rate-limit at, so the
-- vela_rate_limits table+RPC pattern (a separate table, wired to one
-- specific edge function) doesn't transplant directly. This reuses its
-- core idea — a bounded count in a rolling window, checked atomically
-- before the write is allowed to land — as a single BEFORE INSERT trigger
-- instead of a second table: cheap, and the insert still goes through the
-- plain owner-insert RLS policy, not a SECURITY DEFINER RPC that would
-- bypass it. SECURITY DEFINER only on the trigger function itself, so its
-- own COUNT read isn't blocked by support_requests having no select policy
-- for authenticated (see above).
create or replace function public.enforce_support_request_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count int;
begin
  select count(*) into recent_count
  from public.support_requests
  where owner_id = new.owner_id
    and created_at > now() - interval '1 hour';

  if recent_count >= 5 then
    raise exception 'Too many support requests. Please wait a while before submitting another.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

comment on function public.enforce_support_request_rate_limit() is
  'Per-owner support_requests insert cap: max 5 per rolling hour. Runs as a BEFORE INSERT trigger (not a table+RPC like vela_rate_limits) since the insert this guards is a plain client-session table insert, not a call through a dedicated server route. SECURITY DEFINER so its own COUNT read works despite authenticated having no select policy on this table.';

drop trigger if exists support_requests_rate_limit on public.support_requests;
create trigger support_requests_rate_limit
before insert on public.support_requests
for each row
execute function public.enforce_support_request_rate_limit();

-- ─── Account purge ──────────────────────────────────────────────────────────
--
-- support_requests.owner_id/handled_by both reference auth.users(id) with
-- no ON DELETE CASCADE (by design, matching trial_emails/invites), so an
-- unhandled row would otherwise block auth.admin.deleteUser() after
-- purge_own_account_data() returns — the same class of NO ACTION FK this
-- function already guards against for trial_emails/invites. Additive-only
-- edit to the function body (same convention as
-- 20260821030000_daily_nudge_emails_ledger.sql's own additive edit): every
-- existing statement is unchanged, two new ones are added, no signature
-- change.
create or replace function public.purge_own_account_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  update people set linked_user_id = null where linked_user_id = uid;

  delete from notes where owner_id = uid;

  update notes
    set about_person = null
    where about_person in (select id from people where owner_id = uid);

  delete from synastry where owner_id = uid;
  delete from relationships where owner_id = uid;

  delete from person_daily_nudges
    where person_id in (select id from people where owner_id = uid)
       or owner_id = uid;

  delete from daily_nudge_emails where owner_id = uid;

  delete from transits
    where person_id in (select id from people where owner_id = uid);

  delete from group_members
    where person_id in (select id from people where owner_id = uid);

  delete from group_members
    where group_id in (select id from groups where owner_id = uid);

  delete from threads where owner_id = uid;

  update threads
    set subject_person = null
    where subject_person in (select id from people where owner_id = uid);

  update threads
    set group_id = null
    where group_id in (select id from groups where owner_id = uid);

  delete from groups where owner_id = uid;

  -- Clear pin before people delete (FK ondelete set null also covers this).
  update profiles set pinned_sky_person_id = null where id = uid;

  delete from people where owner_id = uid;

  delete from trial_emails where user_id = uid;
  delete from invites where from_user = uid;

  -- New: this account's own support requests, and clear handled_by on any
  -- request this account (as an admin) previously closed/reopened for
  -- someone else — mirrors the people.linked_user_id "other rows may point
  -- at this account" handling above.
  delete from support_requests where owner_id = uid;
  update support_requests set handled_by = null where handled_by = uid;

  delete from profiles where id = uid;
end;
$$;

comment on function public.purge_own_account_data() is
  'Deletes the caller''s owned graph (including support_requests) then the profile row. SECURITY DEFINER; auth.uid() only.';
