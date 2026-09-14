-- Make self-serve account deletion atomic and complete.
--
-- PHASE 0 (disposable throwaway project, 2026-09-14):
-- After a profile-only wipe, leftover thread_participants.user_id (NO ACTION)
-- blocked DELETE FROM auth.users with:
--   update or delete on table "users" violates foreign key constraint
--   "thread_participants_user_id_fkey" on table "thread_participants"
-- That is the half-success the app route previously admitted: the graph
-- RPC returned, then auth.admin.deleteUser failed, and the login remained.
--
-- The latest committed body (20260913160000) already deletes
-- thread_participants. It still (a) does not delete auth.users, (b) dropped
-- the original quick_share_snapshots delete, and (c) never cleared
-- vela_rate_limits / admin_users, which only vanish if GoTrue later CASCADEs
-- them. A failed deleteUser after a successful RPC is a partial delete.
--
-- This rewrite keeps every existing statement, restores the missed deletes,
-- and removes the login row in the SAME function. Postgres runs a function
-- body as one transaction with the calling statement: any error rolls
-- everything back. BEGIN/COMMIT are not legal inside a FUNCTION; converting
-- to a PROCEDURE would change the RPC the clients already call.
--
-- No RLS changes. No FK changes to CASCADE. Additive CREATE OR REPLACE only.

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
  delete from relationships where owner_id = uid;

  delete from person_daily_nudges
    where person_id in (select id from people where owner_id = uid)
       or owner_id = uid;

  delete from daily_nudge_emails where owner_id = uid;

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
  'Atomic self-serve purge of the caller''s owned Galaxia graph AND the auth.users login row, in one transaction. Deletes thread_participants (any thread), owned messages, quick_share_snapshots, vela_rate_limits, admin_users, and matching early_access email, then nulls admin_audit_log FKs and deletes auth.users. Also ends every constellation-connect relationship in both directions. SECURITY DEFINER; auth.uid() only. Any error rolls the entire body back.';
