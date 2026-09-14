-- Weekly constellation letter: independent opt-out, send ledger, and
-- engagement counts (sends / opens / clicks).
--
-- Timestamp is 20260914250000 so this runs after
-- 20260914240000_comparison_history.sql (same-day collision on the original
-- 240000 prefix). The purge body is a copy of that migration plus the
-- constellation_letters delete. search_path stays pinned (20260914140000).
--
-- Consent is OPT-OUT, default ON, independent of daily_nudge_emails_enabled
-- and of relational_transit_alerts. Unsubscribe reuses profiles.unsubscribe_token
-- (already unique, service-role only) via a dedicated route that flips only
-- this column.
--
-- constellation_letters is the send + measurement ledger: one row per
-- (owner_id, week_of), inserted only after a real send is claimed. Opens and
-- clicks are recorded by the first-party pixel/click wrapper and optionally
-- by the Resend webhook. Service-role only (no client policies), same posture
-- as daily_nudge_emails / trial_emails.

alter table public.profiles
  add column if not exists weekly_constellation_letter_enabled boolean not null default true;

comment on column public.profiles.weekly_constellation_letter_enabled is
  'Opt-out consent for the Sunday constellation letter. Default true (opt-out, default-on, independent of daily_nudge_emails_enabled). Owner-writable from Settings. The send cron checks this per owner before sending.';

revoke insert on table public.profiles from anon, authenticated;
revoke update on table public.profiles from anon, authenticated;

grant insert (
  id, display_name, house_system, timezone, daily_nudge_emails_enabled,
  relational_transit_alerts, onboarding_step, onboarding_completed_at,
  weekly_constellation_letter_enabled
) on table public.profiles to authenticated;

grant update (
  id, display_name, house_system, timezone, daily_nudge_emails_enabled,
  relational_transit_alerts, onboarding_step, onboarding_completed_at,
  weekly_constellation_letter_enabled
) on table public.profiles to authenticated;

create table if not exists constellation_letters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  week_of date not null,
  person_ids uuid[] not null,
  transit_fingerprint text not null,
  resend_id text,
  sent_at timestamptz not null default now(),
  opened_at timestamptz,
  clicked_at timestamptz,
  open_count integer not null default 0,
  click_count integer not null default 0,
  unique (owner_id, week_of)
);

comment on table public.constellation_letters is
  'Idempotency and measurement ledger for the weekly constellation letter. One row per (owner_id, week_of). person_ids and transit_fingerprint record which real hits the letter named. opened_at/clicked_at are first-touch; open_count/click_count are totals. Service-role only.';

create unique index if not exists constellation_letters_resend_id_idx
  on constellation_letters (resend_id)
  where resend_id is not null;

create index if not exists constellation_letters_owner_idx
  on constellation_letters (owner_id);

alter table constellation_letters enable row level security;
-- No client policies: only the service role (send cron, tracking routes, Resend webhook) reads/writes this.

-- Additive CREATE OR REPLACE of purge_own_account_data: copy of
-- 20260914240000_comparison_history plus constellation_letters delete.

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

  -- Replaces the former bare `update people set linked_user_id = null where
  -- linked_user_id = uid`. Strips every mirror of me out of other people's
  -- galaxies before the link is dropped. The predicate is linked_user_id
  -- rather than a connection_grants join so it also catches a mirror whose
  -- grant row has already gone, and because people_linked_user_id_fkey is NO
  -- ACTION, every one of these rows has to be cleared before the auth.users
  -- row can be deleted at all.
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
  -- viewer. The viewer-side rows would also cascade from the people delete
  -- further down, but they go explicitly so this function's guarantee does
  -- not depend on a foreign key firing.
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

  delete from memorial_milestones
    where profile_id in (select id from people where owner_id = uid)
       or user_id = uid;

  delete from relational_transits where owner_id = uid;

  -- New: push_tokens.owner_id only (no people FK).
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
  -- away the sender's invite history, and doing it here means the purge
  -- alone produces the same end state as dropping the auth.users row.
  update invites set accepted_by = null where accepted_by = uid;

  delete from support_requests where owner_id = uid;
  update support_requests set handled_by = null where handled_by = uid;

  -- Restored: present in 20260723200000, dropped by a later CREATE OR REPLACE.
  -- created_by is ON DELETE CASCADE, but we do not wait for auth.users to fire it.
  delete from quick_share_snapshots where created_by = uid;

  -- ON DELETE CASCADE, same reason as push_tokens: this function used not to
  -- delete auth.users, so an explicit delete is required for completeness.
  delete from vela_rate_limits where user_id = uid;

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
  'Atomic self-serve purge of the caller''s owned Galaxia graph AND the auth.users login row, in one transaction. Deletes thread_participants (any thread), owned messages, quick_share_snapshots, vela_rate_limits, admin_users, comparison_history, constellation_letters, and matching early_access email, then nulls admin_audit_log FKs and deletes auth.users. Also ends every constellation-connect relationship in both directions. SECURITY DEFINER; auth.uid() only. Any error rolls the entire body back.';
