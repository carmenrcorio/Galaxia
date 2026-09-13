-- Constellation Connect, Phase 1: schema only.
--
-- Implements the schema section (section 2) of
-- design/galaxia-constellation-connect-plan.md, approved as PR #213. No RPC
-- functions, no routes, no UI: those are Phase 2 onward and are deliberately
-- absent here so this layer can be reviewed and applied on its own.
--
-- The load-bearing choice this schema exists to serve: the sender never
-- receives the recipient's birth data, only a copy of their computed chart.
-- If the birth columns are simply null on the sender's row there is no read
-- path to gate and no future feature that can leak them.
--
-- Two objects, because the handshake and the standing state are different
-- things. `invites` gains a third `kind` and stays the disposable handshake.
-- `connection_grants` is the durable, revocable, per-direction share grant
-- that outlives every invite row that created it.
--
-- Written against the live definitions in project eigfvribtntbxyjutsma read
-- on 2026-09-13, not against the migration history. Note that four committed
-- migrations (20260913030000 through 20260913030200, PR #205) were not yet in
-- the production ledger at that point. The purge_own_account_data() body
-- below is built on the committed 20260913030200 version, which is a strict
-- superset of what production was running, so applying this file never drops
-- a statement regardless of the order the two land in. Because of that,
-- 20260913030150_admin_audit_log_actor_id_nullable.sql must be applied before
-- this file, or the admin_audit_log statements at the end of the function
-- will fail at call time against a NOT NULL actor_id.

-- ─── invites: the connect handshake ───────────────────────────────────────

alter table public.invites drop constraint if exists invites_kind_check;
alter table public.invites add constraint invites_kind_check
  check (kind in ('shared_space', 'birth_data', 'constellation_connect'));

alter table public.invites
  add column if not exists accepted_by uuid references auth.users(id) on delete set null,
  add column if not exists accepted_at timestamptz,
  add column if not exists sender_shares_back boolean not null default false,
  add column if not exists sender_ack_at timestamptz;

comment on column public.invites.accepted_by is
  'The account that consumed this link. Needed for the sender''s acceptance notification, for the mutual-add step to know who to add, and for audit. ON DELETE SET NULL is deliberate: a later account deletion must not cascade away the sender''s own invite history, so a row can legitimately carry accepted_at with a null accepted_by, meaning "accepted, by an account since deleted".';

comment on column public.invites.accepted_at is
  'When the link was consumed. Orders the sender''s acceptance notification. Set in the same statement as accepted_by and never cleared, so it survives the accepting account''s deletion as the record that the invite was used.';

comment on column public.invites.sender_shares_back is
  'The sender''s up-front answer to "if they add you back, may they see your chart?", asked once on the share screen. Defaults to false, and stays false on a mutual add: the reverse grant lands as connection_grants.status = pending and needs the sender to approve it. Nobody''s chart moves without that person having said yes to that specific person.';

comment on column public.invites.sender_ack_at is
  'The sender dismissed the acceptance card on their home screen. Inline marker rather than a notifications table or an unread system, mirroring relational_transits.push_sent_at.';

comment on column public.invites.relationship_type is
  'The relation the sender picked, drawn from GALAXY_RELATION_PICKER_OPTIONS in packages/core/src/galaxy-orbit.ts. Nullable because the shipped birth_data kind never set it; required for constellation_connect by invites_connect_requires_relation. Constellation connect is not offered for the two picker values denoting a direct descendant generation, child and grandchild: a minor cannot hold a Galaxia account (COPPA gate on signup, Terms section 6), so the product must never appear to invite one. Those two relations continue through the existing birth_data flow. The exclusion is enforced in create_connect_invite (Phase 2), not by a CHECK here, because the canonical list lives in TypeScript and a SQL literal would drift from it silently.';

-- Constraints that make the new kind fail closed. Each predicate is trivially
-- true for every existing shared_space and birth_data row, so adding them
-- validates against live data without rewriting the table. They are added
-- validated rather than NOT VALID: the point of the first one is that a
-- connect invite cannot physically exist without an expiry, which an
-- unvalidated constraint would only half deliver.
alter table public.invites drop constraint if exists invites_connect_requires_expiry;
alter table public.invites add constraint invites_connect_requires_expiry
  check (kind <> 'constellation_connect' or expires_at is not null);

alter table public.invites drop constraint if exists invites_connect_requires_relation;
alter table public.invites add constraint invites_connect_requires_relation
  check (kind <> 'constellation_connect' or relationship_type is not null);

alter table public.invites drop constraint if exists invites_no_self_accept;
alter table public.invites add constraint invites_no_self_accept
  check (accepted_by is null or accepted_by <> from_user);

-- One-directional on purpose. The plan proposed
-- `(accepted_by is null) = (accepted_at is null)`, but that is unsatisfiable
-- alongside accepted_by's ON DELETE SET NULL: deleting the accepting user's
-- auth.users row nulls accepted_by while accepted_at stays set, so the
-- symmetric form would abort the account deletion it is supposed to survive.
-- This keeps the guarantee worth having (you cannot record who accepted
-- without recording when) and permits the anonymized post-deletion state.
alter table public.invites drop constraint if exists invites_accept_fields_together;
alter table public.invites add constraint invites_accept_fields_together
  check (accepted_by is null or accepted_at is not null);

-- invites RLS is unchanged and must not be broadened. The recipient must
-- never gain select on this table, because a broader policy would expose
-- every other invite the sender has outstanding. The recipient reaches the
-- invite only through the Phase 2 SECURITY DEFINER functions, which return a
-- fixed whitelisted projection.

-- ─── connection_grants: the standing, revocable share ─────────────────────

create table if not exists public.connection_grants (
  id uuid primary key default gen_random_uuid(),
  -- Whose chart is being shared. The data subject, and the only party who
  -- can change the level or revoke.
  subject_user uuid not null references auth.users(id) on delete cascade,
  -- Who may see it.
  viewer_user uuid not null references auth.users(id) on delete cascade,
  -- The row in the viewer's galaxy that represents the subject.
  viewer_person_id uuid not null references public.people(id) on delete cascade,
  share_level text not null default 'chart' check (share_level in ('chart', 'details')),
  status text not null default 'active' check (status in ('pending', 'active', 'revoked')),
  source_invite uuid references public.invites(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint connection_grants_not_self check (subject_user <> viewer_user)
);

comment on table public.connection_grants is
  'One row per direction of a constellation-connect share: subject_user''s chart is visible to viewer_user on viewer_person_id, at share_level, until revoked. After a mutual add the same pair of humans has two rows, independently levelled and independently revocable, which is why this cannot be a boolean on a single row. Writes are function-only (see the RLS note below).';

comment on column public.connection_grants.share_level is
  'chart: the computed chart only, the birth columns stay null on the mirrored row. details: the birth columns are copied across as well. Lives here rather than on people so the subject can change it later from their own settings, on a row their own RLS lets them read.';

comment on column public.connection_grants.status is
  'active: the mirror is live and tracks the source. pending: the reverse direction of a mutual add where the sender had not pre-authorized sharing back, awaiting their approval. revoked: the mirror has been stripped and the viewer is left a bare star with their own label and relation.';

comment on column public.connection_grants.viewer_person_id is
  'The people row in the viewer''s galaxy that carries the mirror. Unique, because one person row can be the mirror of at most one subject. ON DELETE CASCADE so a viewer deleting that star ends the grant with it.';

-- Unique on the pair: one standing grant per direction per pair of accounts.
create unique index if not exists connection_grants_pair_idx
  on public.connection_grants (subject_user, viewer_user);
create unique index if not exists connection_grants_person_idx
  on public.connection_grants (viewer_person_id);
create index if not exists connection_grants_subject_idx
  on public.connection_grants (subject_user);
create index if not exists connection_grants_viewer_idx
  on public.connection_grants (viewer_user);

alter table public.connection_grants enable row level security;

drop policy if exists "connection_grants subject read" on public.connection_grants;
create policy "connection_grants subject read"
on public.connection_grants for select to authenticated
using (subject_user = (select auth.uid()));

drop policy if exists "connection_grants viewer read" on public.connection_grants;
create policy "connection_grants viewer read"
on public.connection_grants for select to authenticated
using (viewer_user = (select auth.uid()));

-- Select-only for both parties, by design. There is no insert, update, or
-- delete policy: every write goes through a SECURITY DEFINER function added
-- in Phase 2, the same pattern as delete_own_person and
-- purge_own_account_data. An UPDATE policy cannot express "you may change
-- share_level but not viewer_person_id", and an INSERT policy checking only
-- subject_user would let anyone mint a grant pointing at a stranger's person
-- row. The revoke below makes that true at the privilege level too, not just
-- the policy level, following the same pattern profiles uses.
revoke insert, update, delete on table public.connection_grants from anon, authenticated;

-- ─── people: mark a mirrored chart ────────────────────────────────────────

alter table public.people
  add column if not exists chart_source text not null default 'local'
    check (chart_source in ('local', 'linked'));

comment on column public.people.chart_source is
  'local (default): this row''s chart was computed from the birth fields on this row. linked: the chart was mirrored from the account in linked_user_id, the birth fields may be null, and no code path may rebuild it locally. Gates the lazy recompute in apps/web/app/app/person/[id]/page.tsx and any future buildBirthInput call site. birth_precision on a linked row is the source row''s precision even though the birth fields are null: that is an honest statement of the fidelity of the chart the viewer holds, and it keeps the sharpness check, the minor-safety checks, and transit nudge eligibility behaving without special cases.';

-- ─── mirrored-chart freshness: two triggers, no cron ──────────────────────
--
-- A frozen copy of a chart the subject later corrects is a confidently wrong
-- chart, which ENGINEERING.md section 12 names as worse than no chart. The
-- mirror therefore follows the source in the database rather than through a
-- refresh endpoint a client has to remember to call or a cron job that can
-- silently stop running (ENGINEERING.md section 14). Fan-out is a handful of
-- rows per user.
--
-- Both functions are SECURITY DEFINER because they write rows owned by other
-- users, which no RLS policy should ever permit for the invoking user.

create or replace function public.sync_linked_chart_mirrors()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subject uuid;
begin
  -- Only a self row's chart is ever mirrored. A non-self row (including a
  -- mirror this function just wrote) resolves to null and returns, which is
  -- what stops the write below from recursing.
  select p.owner_id into v_subject
    from people p
   where p.id = new.person_id
     and p.is_self is true;

  if v_subject is null then
    return new;
  end if;

  -- computed_at travels with the chart: a mirror that claims to have been
  -- computed at the moment it was copied would misstate the freshness of the
  -- data the viewer is looking at.
  update charts c set
      data = new.data,
      house_system = new.house_system,
      engine_version = new.engine_version,
      computed_at = new.computed_at
    where c.person_id in (
      select g.viewer_person_id
        from connection_grants g
       where g.subject_user = v_subject
         and g.status = 'active'
    );

  return new;
end;
$$;

comment on function public.sync_linked_chart_mirrors() is
  'AFTER INSERT OR UPDATE on charts. When the affected row is a self row, re-copies data, house_system, engine_version, and computed_at into every viewer_person_id holding an active grant on that self row''s owner, so a mirrored chart follows its source instead of freezing. Updates only: creating the mirror row is the job of accept_connect_invite and approve_reverse_grant (Phase 2). The mirror carries the subject''s own house_system, because the subject''s preference governs their own chart and every surface derives that label from charts.house_system. SECURITY DEFINER because it writes rows owned by other users.';

drop trigger if exists charts_sync_linked_mirrors on public.charts;
create trigger charts_sync_linked_mirrors
after insert or update on public.charts
for each row
execute function public.sync_linked_chart_mirrors();

create or replace function public.sync_linked_person_mirrors()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- birth_precision travels to every active mirror regardless of level. It
  -- describes the fidelity of the chart the viewer holds, not the birth data
  -- itself, so it is not part of what share_level gates.
  update people v set birth_precision = new.birth_precision
    where v.id in (
      select g.viewer_person_id
        from connection_grants g
       where g.subject_user = new.owner_id
         and g.status = 'active'
    )
    and v.birth_precision <> new.birth_precision;

  -- The birth columns themselves travel only to viewers the subject granted
  -- 'details'. A 'chart' viewer's row keeps them null, which is the whole
  -- privacy argument: there is nothing there to leak.
  update people v set
      birth_date = new.birth_date,
      birth_time = new.birth_time,
      birth_place = new.birth_place,
      birth_lat = new.birth_lat,
      birth_lng = new.birth_lng,
      tz_offset_min = new.tz_offset_min
    where v.id in (
      select g.viewer_person_id
        from connection_grants g
       where g.subject_user = new.owner_id
         and g.status = 'active'
         and g.share_level = 'details'
    );

  return new;
end;
$$;

comment on function public.sync_linked_person_mirrors() is
  'AFTER UPDATE on people, gated by a WHEN clause to self rows whose birth columns or birth_precision actually changed. Re-copies birth_precision into every active mirror, and the birth columns into active mirrors with share_level = details. Cannot recurse: the mirror rows it writes have is_self false, so the trigger''s WHEN clause does not fire on them. SECURITY DEFINER because it writes rows owned by other users.';

drop trigger if exists people_sync_linked_mirrors on public.people;
create trigger people_sync_linked_mirrors
after update on public.people
for each row
when (
  new.is_self is true
  and (
    old.birth_date is distinct from new.birth_date
    or old.birth_time is distinct from new.birth_time
    or old.birth_place is distinct from new.birth_place
    or old.birth_lat is distinct from new.birth_lat
    or old.birth_lng is distinct from new.birth_lng
    or old.tz_offset_min is distinct from new.tz_offset_min
    or old.birth_precision is distinct from new.birth_precision
  )
)
execute function public.sync_linked_person_mirrors();

-- ─── account purge: mandatory, not optional ───────────────────────────────
--
-- Additive-only edit, same convention as
-- 20260909020000_memorial_milestones.sql and
-- 20260909030000_relational_transits.sql: every existing statement is copied
-- forward unchanged and new statements are added, with no signature change.
-- The base is the committed 20260913030200 body (thread_participants and
-- admin_audit_log included), diffed in full against the live production
-- definition first so nothing is dropped. The one existing statement that
-- changes is `update people set linked_user_id = null`, which is replaced by
-- a strict superset of itself and is called out inline below.
--
-- Without this edit the purge would leave the deleted user's mirrored chart
-- sitting in other people's galaxies forever, which is a privacy defect and a
-- broken promise in Privacy Policy section 8.

create or replace function public.purge_own_account_data()
returns void
language plpgsql
security definer
set search_path TO 'public'
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

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

  delete from profiles where id = uid;

  update public.admin_audit_log set actor_id = null where actor_id = uid;
  update public.admin_audit_log set target_user_id = null where target_user_id = uid;
end;
$$;

comment on function public.purge_own_account_data() is
  'Deletes the caller''s owned graph (including person_daily_nudges, daily_nudge_emails, memorial_milestones, relational_transits, thread_participants, and support_requests) then the profile row, and nulls admin_audit_log references so auth.users can be dropped afterwards. Also ends every constellation-connect relationship in both directions: mirrored charts and shared birth fields are stripped out of other people''s galaxies, connection_grants rows are deleted as subject and as viewer, and invites the caller accepted are anonymized rather than removed. What another user is left with is the bare star they named, their own label and their own chosen relation, with no chart and no birth data. SECURITY DEFINER; auth.uid() only.';
