-- Self-serve account deletion + attributable Quick Share snapshots.
--
-- 1) quick_share_snapshots.created_by (nullable): set when the creator has a
--    session. Anonymous funnel inserts stay NULL. ON DELETE CASCADE so auth
--    user removal clears attributed snapshots. Pre-existing rows stay NULL
--    and cannot be attributed.
-- 2) purge_own_account_data(): SECURITY DEFINER, single transaction, deletes
--    the caller's entire owned graph. Order verified against live FK delete
--    rules (NO ACTION blockers first). auth.users is deleted by the app via
--    auth.admin.deleteUser only after this function returns success.

-- ─── Share snapshot ownership ───────────────────────────────────────────────

alter table quick_share_snapshots
  add column if not exists created_by uuid references auth.users(id) on delete cascade;

create index if not exists quick_share_snapshots_created_by_idx
  on quick_share_snapshots (created_by)
  where created_by is not null;

comment on column quick_share_snapshots.created_by is
  'Auth user who created the share when signed in. NULL for anonymous funnel shares. Attributed rows cascade away when the user is deleted; anonymous historical rows cannot be attributed.';

-- ─── Atomic owned-graph purge ─────────────────────────────────────────────
--
-- Live FK delete rules that drive order (from pg_constraint.confdeltype):
--   NO ACTION (blocks): people.owner_id, people.linked_user_id,
--     relationships.{owner_id,person_a,person_b}, groups.owner_id,
--     group_members.person_id, synastry.{owner_id,person_low,person_high},
--     notes.{owner_id,about_person}, threads.{owner_id,subject_person,group_id},
--     thread_participants.user_id, transits.person_id, profiles.id
--   CASCADE: charts→people, group_members→groups, messages→threads,
--     thread_participants→threads, notes.group_id→groups,
--     invites.from_user→auth.users, invites.person_id→people,
--     trial_emails→auth.users, quick_share_snapshots.created_by→auth.users
--   SET NULL: notes.source_thread_id→threads
--
-- Postgres runs a function body in one transaction: any error rolls back all
-- statements. Partial deletion is impossible.

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

  -- Attributed share snapshots (also CASCADE on later auth.users delete).
  delete from quick_share_snapshots where created_by = uid;

  -- Participant rows on any thread (own or others').
  delete from thread_participants where user_id = uid;

  -- Other users' people may point linked_user_id at this account (NO ACTION).
  update people set linked_user_id = null where linked_user_id = uid;

  -- Owned notes first (about_person NO ACTION would block people delete).
  delete from notes where owner_id = uid;

  -- Defensive: clear about_person on any remaining rows pointing at our people.
  update notes
    set about_person = null
    where about_person in (select id from people where owner_id = uid);

  delete from synastry where owner_id = uid;
  delete from relationships where owner_id = uid;

  -- transits.person_id and group_members.person_id are NO ACTION on people.
  delete from transits
    where person_id in (select id from people where owner_id = uid);

  delete from group_members
    where person_id in (select id from people where owner_id = uid);

  delete from group_members
    where group_id in (select id from groups where owner_id = uid);

  -- Owned threads (messages + thread_participants CASCADE).
  delete from threads where owner_id = uid;

  -- Defensive: other threads must not keep NO ACTION FKs to our people/groups.
  update threads
    set subject_person = null
    where subject_person in (select id from people where owner_id = uid);

  update threads
    set group_id = null
    where group_id in (select id from groups where owner_id = uid);

  -- notes.group_id CASCADE; threads.group_id cleared above.
  delete from groups where owner_id = uid;

  -- charts CASCADE; invites.person_id CASCADE.
  delete from people where owner_id = uid;

  delete from trial_emails where user_id = uid;
  delete from invites where from_user = uid;

  delete from profiles where id = uid;
end;
$$;

revoke all on function public.purge_own_account_data() from public, anon;
grant execute on function public.purge_own_account_data() to authenticated;

comment on function public.purge_own_account_data() is
  'Atomic self-serve purge of the caller''s owned Galaxia graph. Single transaction; auth.users removed by the app after success.';
