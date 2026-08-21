-- Nudge delivery Phase B2 (part 2 of 2): send-idempotency ledger for the
-- "your sky today" email.
--
-- One row per (owner_id, date) — NOT per person — enforces "one email per
-- owner per day" (never one email per person) at the database level, not
-- just in the send job's application logic. Mirrors the trial_emails
-- ledger pattern exactly (20260710183000_threads_status_and_trial_emails.sql):
-- same shape, same "no client policies, service-role only" posture.
create table if not exists daily_nudge_emails (
  owner_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  person_id uuid not null references people(id),
  sent_at timestamptz not null default now(),
  primary key (owner_id, date)
);

comment on table public.daily_nudge_emails is
  'Idempotency ledger for the nudge-send cron (Phase B2): one row per (owner_id, date), inserted only after a real send succeeds. person_id records which person''s nudge led the email (for support/debugging), but the primary key is owner+date so a user with several people can never be emailed twice in one day. Service-role only, same posture as trial_emails.';

alter table daily_nudge_emails enable row level security;
-- No client policies: only the service role (the nudge-send cron route) reads/writes this.

create index if not exists daily_nudge_emails_owner_idx
  on daily_nudge_emails (owner_id);

-- Clear the ledger alongside every other owned row on account purge, same as
-- trial_emails already is in purge_own_account_data() — additive-only edit
-- to that function's body (defined in 20260725040000_person_daily_nudges.sql),
-- no signature change, no other statement touched.
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

  delete from profiles where id = uid;
end;
$$;

comment on function public.purge_own_account_data() is
  'Deletes the caller''s owned graph (including person_daily_nudges and daily_nudge_emails) then the profile row. SECURITY DEFINER; auth.uid() only.';
