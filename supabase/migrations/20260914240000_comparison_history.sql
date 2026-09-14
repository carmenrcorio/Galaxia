-- Compare history: persist the pair and last viewed timestamp only.
--
-- Phase 0: no table records "I compared these two." The synastry table
-- stores a full jsonb result but nothing in the app writes to it.
-- notes.kind = compare_reading is an explicit "Save this reading" snapshot
-- of scores and top aspects, not a view ledger. quick_share_snapshots
-- freeze a share token payload. Compare landing is an empty form.
--
-- Transit data for a pair is recomputed: computeTransits(natal, whenUTC)
-- against each stored natal, same as the person page. Natal synastry is
-- constant. Storing the rendered reading would freeze transits that have
-- already moved. This table stores owner + ordered pair + last_viewed_at.
--
-- Safe to apply via `supabase db push` / MCP apply_migration (transactional).
-- Does not need autocommit. CREATE INDEX CONCURRENTLY is forbidden here.

create table if not exists public.comparison_history (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  person_low uuid not null references people(id) on delete cascade,
  person_high uuid not null references people(id) on delete cascade,
  last_viewed_at timestamptz not null default now(),
  unique (owner_id, person_low, person_high),
  check (person_low < person_high)
);

comment on table public.comparison_history is
  'Owner-scoped Compare history. Stores the pair and last_viewed_at only. The reading is recomputed on open. Never a rendered synastry payload.';

create index if not exists comparison_history_owner_viewed_idx
  on public.comparison_history (owner_id, last_viewed_at desc);

alter table public.comparison_history enable row level security;

create policy "comparison_history owner all"
on public.comparison_history for all
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

revoke all on table public.comparison_history from public, anon;
grant select, insert, update, delete on table public.comparison_history to authenticated;

-- ─── Additive-only edits to the shared owner-delete functions ──────────────
-- Same convention as memorial_milestones / relational_transits: every
-- existing statement is unchanged, new statements are added.

create or replace function public.delete_own_person(p_person_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  collapsing record;
  deleted_group_ids uuid[] := array[]::uuid[];
  deleted_group_names text[] := array[]::text[];
  n_group_threads int := 0;
  n_person_threads int := 0;
  group_result jsonb;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_person_id is null then
    raise exception 'Person id required';
  end if;

  if not exists (
    select 1 from people where id = p_person_id and owner_id = uid
  ) then
    raise exception 'Person not found';
  end if;

  if exists (
    select 1 from people where id = p_person_id and owner_id = uid and is_self is true
  ) then
    raise exception 'Cannot delete your self profile this way';
  end if;

  -- Groups that would fall below the create minimum (3) after removing this
  -- person: delete via delete_own_group (threads first, then group).
  for collapsing in
    select g.id as group_id, g.name as group_name, count(gm.person_id)::int as member_count
    from groups g
    join group_members gm on gm.group_id = g.id
    where g.owner_id = uid
      and g.id in (
        select group_id from group_members where person_id = p_person_id
      )
    group by g.id, g.name
    having count(gm.person_id) <= 3
  loop
    group_result := public.delete_own_group(collapsing.group_id);
    n_group_threads := n_group_threads + coalesce((group_result->>'deleted_threads')::int, 0);
    deleted_group_ids := array_append(deleted_group_ids, collapsing.group_id);
    deleted_group_names := array_append(deleted_group_names, collapsing.group_name);
  end loop;

  -- Remaining memberships on groups that still have 3+ after removal.
  delete from group_members where person_id = p_person_id;

  -- Notes scoped to this person or a pair including them (about_person NO ACTION).
  delete from notes
    where owner_id = uid
      and (
        about_person = p_person_id
        or pair_low = p_person_id
        or pair_high = p_person_id
      );

  delete from relationships
    where owner_id = uid
      and (person_a = p_person_id or person_b = p_person_id);

  delete from synastry
    where owner_id = uid
      and (person_low = p_person_id or person_high = p_person_id);

  -- comparison_history also CASCADEs from people; explicit so this function
  -- does not depend on that FK firing.
  delete from comparison_history
    where owner_id = uid
      and (person_low = p_person_id or person_high = p_person_id);

  -- transits.person_id is NO ACTION on people.
  delete from transits where person_id = p_person_id;

  delete from person_daily_nudges where person_id = p_person_id;

  -- memorial_milestones.profile_id is NO ACTION on people.
  delete from memorial_milestones where profile_id = p_person_id;

  -- Person / pair threads (group threads for collapsing groups already gone).
  delete from threads
    where owner_id = uid
      and (
        subject_person = p_person_id
        or pair_low = p_person_id
        or pair_high = p_person_id
      );
  get diagnostics n_person_threads = row_count;

  -- charts CASCADE; invites.person_id CASCADE.
  delete from people where id = p_person_id and owner_id = uid;

  return jsonb_build_object(
    'ok', true,
    'person_id', p_person_id,
    'deleted_group_ids', to_jsonb(deleted_group_ids),
    'deleted_group_names', to_jsonb(deleted_group_names),
    'deleted_group_threads', n_group_threads,
    'deleted_person_threads', n_person_threads
  );
end;
$$;

comment on function public.delete_own_person(uuid) is
  'Atomic owner-scoped person delete. Collapsing groups (<3 members after removal) are deleted by calling delete_own_group (thread-first); remaining memberships, notes, relationships, synastry, comparison_history, transits, person_daily_nudges, memorial_milestones, and person/pair threads cleared before people row. SECURITY DEFINER; enforces owner_id = auth.uid(); refuses is_self.';

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
  'Atomic self-serve purge of the caller''s owned Galaxia graph AND the auth.users login row, in one transaction. Deletes thread_participants (any thread), owned messages, quick_share_snapshots, vela_rate_limits, admin_users, comparison_history, and matching early_access email, then nulls admin_audit_log FKs and deletes auth.users. Also ends every constellation-connect relationship in both directions. SECURITY DEFINER; auth.uid() only. Any error rolls the entire body back.';
