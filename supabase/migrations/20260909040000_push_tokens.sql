-- Generations Feature 3 (part 2): push-notification token storage +
-- send-idempotency marker.
--
-- One row per (owner, device) — a user with two devices gets two rows, both
-- targeted on send, same "send to every registered device" default every
-- push provider expects. `expo_push_token` is globally unique (Expo issues
-- one token per app install, not per account) so re-registering the same
-- device under a different account moves the row rather than duplicating
-- it — never leaves a stale token pointed at the old owner.

create table if not exists push_tokens (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null unique,
    10|  platform text check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.push_tokens is
  'Expo push tokens for the mobile app (Generations Feature 3 push notifications). Client upserts its own token (owner-scoped RLS) on app launch; the relational-transit-push cron route (service role) reads all of an owner''s tokens to send.';

create index if not exists push_tokens_owner_idx on push_tokens (owner_id);

alter table push_tokens enable row level security;

    20|create policy "push_tokens owner all"
on push_tokens for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

-- Idempotency marker: once a push has gone out for a relational_transits
-- row, never re-send for it (this run or a later one). Mirrors
-- daily_nudge_emails' ledger role but inline on the row itself since a
-- relational transit is already a de-duplicated single event, not a
-- per-day fan-out.
    30|alter table relational_transits
  add column if not exists push_sent_at timestamptz default null;

comment on column public.relational_transits.push_sent_at is
  'Set once the relational-transit-push cron route has sent a push for this row (to every one of the owner''s registered devices at that time); null means "not yet pushed". Never reset — a transit that later re-enters its own window via a re-scan is still the same dedup_key row, not a new push.';

-- ─── Additive-only edit to the shared owner-delete function ────────────────
-- Same convention as the two prior Feature 3 migrations: every existing
-- statement unchanged, one new statement added, no signature change.
-- push_tokens.owner_id already has `on delete cascade` to auth.users, but
   40|-- purge_own_account_data doesn't delete the auth.users row itself (that is
-- a separate, deliberate step elsewhere), so an explicit delete here is
-- still needed — same reasoning as every other owner-scoped table in this
-- function.

create or replace function public.purge_own_account_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
    50|declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  update people set linked_user_id = null where linked_user_id = uid;

  delete from notes where owner_id = uid;

    60|  update notes
    set about_person = null
    where about_person in (select id from people where owner_id = uid);

  delete from synastry where owner_id = uid;
  delete from relationships where owner_id = uid;

  delete from person_daily_nudges
    where person_id in (select id from people where owner_id = uid)
       or owner_id = uid;

    70|  delete from daily_nudge_emails where owner_id = uid;

  delete from memorial_milestones
    where profile_id in (select id from people where owner_id = uid)
       or user_id = uid;

  delete from relational_transits where owner_id = uid;

  -- New: push_tokens.owner_id only (no people FK).
  delete from push_tokens where owner_id = uid;
    80|
  delete from transits
    where person_id in (select id from people where owner_id = uid);

  delete from group_members
    where person_id in (select id from people where owner_id = uid);

  delete from group_members
    where group_id in (select id from groups where owner_id = uid);

    90|  delete from threads where owner_id = uid;

  update threads
    set subject_person = null
    where subject_person in (select id from people where owner_id = uid);

  update threads
    set group_id = null
    where group_id in (select id from groups where owner_id = uid);

   100|  delete from groups where owner_id = uid;

  -- Clear pin before people delete (FK ondelete set null also covers this).
  update profiles set pinned_sky_person_id = null where id = uid;

  delete from people where owner_id = uid;

  delete from trial_emails where user_id = uid;
  delete from invites where from_user = uid;

   110|  delete from support_requests where owner_id = uid;
  update support_requests set handled_by = null where handled_by = uid;

  delete from profiles where id = uid;
end;
$$;

comment on function public.purge_own_account_data() is
  'Deletes the caller''s owned graph (including person_daily_nudges, daily_nudge_emails, memorial_milestones, relational_transits, push_tokens, and support_requests) then the profile row. SECURITY DEFINER; auth.uid() only.';
