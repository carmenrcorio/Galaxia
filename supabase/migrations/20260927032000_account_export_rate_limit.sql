-- Self-serve data export rate limit (Settings -> Account -> Download my data).
--
-- GET /api/account/export reads the caller's whole owned graph in one pass.
-- That is cheap for one person and expensive as a loop, so the route admits
-- one export per hour per user. The cap has to live in Postgres: the route
-- runs on serverless functions with no shared memory between invocations,
-- so an in-process counter would reset on every cold start.
--
-- Shape and concurrency argument are copied verbatim from
-- 20260725050000_vela_chat_rate_limit.sql: per-user fixed window, one row
-- per user, a single locking UPDATE as the check-and-record (no read-then-
-- write gap), SECURITY DEFINER bound to auth.uid() internally. Cap and
-- window are caller-supplied; the finalized constants live in
-- @galaxia/core ACCOUNT_EXPORT_RATE_LIMIT (1 per 3600s), not here.

create table if not exists public.account_export_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null default now(),
  count int not null default 0
);

comment on table public.account_export_rate_limits is
  'One row per user: the current /api/account/export rate-limit window. Written ONLY by check_and_increment_account_export_rate (SECURITY DEFINER); clients may only read their own row.';

alter table public.account_export_rate_limits enable row level security;

-- Read-only for clients. No insert/update/delete policy exists on purpose:
-- RLS default-deny overrides PostgREST's table-level grants, so authenticated
-- cannot write this table directly. All writes go through the RPC below.
drop policy if exists "account_export_rate_limits owner read" on public.account_export_rate_limits;
create policy "account_export_rate_limits owner read"
on public.account_export_rate_limits for select
using (user_id = (select auth.uid()));

create or replace function public.check_and_increment_account_export_rate(
  p_limit int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path TO 'public'
as $$
declare
  uid uuid := auth.uid();
  allowed boolean;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- A first-ever caller has no row yet; the UPDATE below would match nothing
  -- and that must not be misread as "denied". Idempotent under a concurrent
  -- first call: the loser hits the primary key and no-ops.
  insert into public.account_export_rate_limits (user_id, window_start, count)
  values (uid, now(), 0)
  on conflict (user_id) do nothing;

  -- Single locking statement. WHERE and both SET CASEs evaluate against the
  -- row's pre-update values, so the window-reset decision and the count
  -- decision are always consistent with each other.
  update public.account_export_rate_limits
  set window_start = case
                       when now() - window_start >= make_interval(secs => p_window_seconds)
                       then now()
                       else window_start
                     end,
      count = case
                when now() - window_start >= make_interval(secs => p_window_seconds)
                then 1
                else count + 1
              end
  where user_id = uid
    and (
      now() - window_start >= make_interval(secs => p_window_seconds)
      or count < p_limit
    )
  returning true into allowed;

  return coalesce(allowed, false);
end;
$$;

comment on function public.check_and_increment_account_export_rate(int, int) is
  'Atomic per-user fixed-window admission check for GET /api/account/export. Returns true (and records the hit) or false (no state change), for auth.uid() only. SECURITY DEFINER so it can write account_export_rate_limits despite the table having no client write policy.';

revoke all on function public.check_and_increment_account_export_rate(int, int) from public, anon;
grant execute on function public.check_and_increment_account_export_rate(int, int) to authenticated;

-- ─── Purge keeps up with the new table ─────────────────────────────────────
--
-- Additive CREATE OR REPLACE. Body is the deployed 20260917035202 body with
-- one statement added: account_export_rate_limits. The FK is ON DELETE
-- CASCADE, but this function deletes auth.users itself and every other
-- cascading table it owns is deleted explicitly, so waiting on a foreign key
-- would be the one exception. No RLS changes, no FK changes.

create or replace function public.purge_own_account_data()
returns void
language plpgsql
security definer
set search_path TO 'public'
as $$
declare
  uid uuid := auth.uid();
  caller_email text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Email is needed for early_access (waitlist is keyed by email, not user id).
  -- Read it before the auth.users row goes.
  select email into caller_email from auth.users where id = uid;

  -- Strips every mirror of me out of other people's galaxies before the link
  -- is dropped. people_linked_user_id_fkey is NO ACTION, so every one of
  -- these rows has to be cleared before the auth.users row can go at all.
  delete from charts
    where person_id in (select id from people where linked_user_id = uid);

  -- chart_source and linked_user_id clear in one statement. A CHECK is
  -- evaluated per statement, so splitting them would fail the moment the
  -- planned people_linked_chart_requires_link constraint lands.
  update people set
      chart_source = 'local',
      birth_precision = 'none',
      birth_date = null,
      birth_time = null,
      birth_place = null,
      birth_lat = null,
      birth_lng = null,
      tz_offset_min = null,
      linked_user_id = null
    where linked_user_id = uid;

  -- Both directions: rows where I am the subject, and rows where I am the
  -- viewer.
  delete from connection_grants where subject_user = uid or viewer_user = uid;

  delete from notes where owner_id = uid;

  update notes
    set about_person = null
    where about_person in (select id from people where owner_id = uid);

  delete from synastry where owner_id = uid;
  delete from comparison_history where owner_id = uid;
  delete from relationships where owner_id = uid;

  delete from person_daily_nudges
    where person_id in (select id from people where owner_id = uid)
       or owner_id = uid;

  delete from daily_nudge_emails where owner_id = uid;

  delete from constellation_letters where owner_id = uid;

  delete from email_sends where owner_id = uid;

  update email_templates set updated_by = null where updated_by = uid;
  update email_campaigns set created_by = null where created_by = uid;

  delete from memorial_milestones
    where profile_id in (select id from people where owner_id = uid)
       or user_id = uid;

  delete from relational_transits where owner_id = uid;

  delete from push_tokens where owner_id = uid;

  delete from transits
    where person_id in (select id from people where owner_id = uid);

  delete from group_members
    where person_id in (select id from people where owner_id = uid);

  delete from group_members
    where group_id in (select id from groups where owner_id = uid);

  -- Owned-thread messages CASCADE off threads; delete them first so this
  -- function's guarantee does not depend on that FK firing.
  delete from messages
    where thread_id in (select id from threads where owner_id = uid);

  -- Participant rows on any thread (own or others'). Must precede the
  -- auth.users delete: thread_participants.user_id is NO ACTION.
  delete from thread_participants where user_id = uid;

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

  -- Mirrors I was holding of other people go with my own rows; charts
  -- CASCADE off people, so this leaves no orphaned mirrored chart behind.
  delete from charts
    where person_id in (select id from people where owner_id = uid);

  delete from people where owner_id = uid;

  delete from trial_emails where user_id = uid;
  delete from invites where from_user = uid;

  -- Invites I accepted from other senders stay, anonymized. accepted_by is
  -- ON DELETE SET NULL precisely so an account deletion does not cascade
  -- away the sender's invite history.
  update invites set accepted_by = null where accepted_by = uid;

  delete from support_requests where owner_id = uid;
  update support_requests set handled_by = null where handled_by = uid;

  -- created_by is ON DELETE CASCADE, but we do not wait for auth.users to fire it.
  delete from quick_share_snapshots where created_by = uid;

  delete from vela_rate_limits where user_id = uid;

  -- New in this migration, same reason as vela_rate_limits.
  delete from account_export_rate_limits where user_id = uid;

  delete from admin_users where owner_id = uid;

  -- Waitlist is not FK'd to auth.users. Matching email is the only handle.
  if caller_email is not null and length(trim(caller_email)) > 0 then
    delete from early_access where lower(email) = lower(caller_email);
  end if;

  delete from profiles where id = uid;

  update public.admin_audit_log set actor_id = null where actor_id = uid;
  update public.admin_audit_log set target_user_id = null where target_user_id = uid;

  -- Login row last, after every NO ACTION FK is gone. Lives in this
  -- function so a mid-purge error cannot leave the graph gone and the
  -- login intact. auth.identities / sessions CASCADE from auth.users.
  delete from auth.users where id = uid;
end;
$$;

comment on function public.purge_own_account_data() is
  'Atomic self-serve purge of the caller''s owned Galaxia graph AND the auth.users login row, in one transaction. Deletes thread_participants (any thread), owned messages, quick_share_snapshots, vela_rate_limits, account_export_rate_limits, admin_users, comparison_history, constellation_letters, email_sends for the caller, and matching early_access email, then nulls admin_audit_log / email_templates / email_campaigns FKs and deletes auth.users. Also ends every constellation-connect relationship in both directions. SECURITY DEFINER; auth.uid() only. Any error rolls the entire body back.';
