-- Constellation Connect, schema completion ahead of the transactional core.
--
-- supabase/migrations/20260913160000_constellation_connect_schema.sql (PR #217)
-- shipped the tables and columns from design/galaxia-constellation-connect-plan.md
-- section 2, but its own changelog fragment
-- (changelog.d/cursor-constellation-connect-schema-9087.md) deliberately
-- deferred four pieces because they are only consumed by the functions in
-- the next migration: the invites indexes, people_linked_user_idx, the
-- people_linked_chart_requires_link CHECK, and the galaxy_relations lookup
-- table. This file adds exactly those four, additively. It also tightens one
-- index from that migration; see the note above connection_grants_person_idx
-- below.

-- ─── invites: the indexes the functions need ──────────────────────────────

create index if not exists invites_from_user_status_idx
  on public.invites (from_user, status);

-- One live connect link per person at a time. Regenerate means revoke the
-- existing pending row, then insert; this index is what makes two live
-- links for one person impossible regardless of which code path tries it.
create unique index if not exists invites_one_pending_connect_per_person
  on public.invites (from_user, person_id)
  where kind = 'constellation_connect' and status = 'pending' and person_id is not null;

-- The sender's "accepted, not yet acknowledged" notification read.
create index if not exists invites_connect_unacked_idx
  on public.invites (from_user, accepted_at desc)
  where kind = 'constellation_connect' and status = 'accepted' and sender_ack_at is null;

-- ─── people: the index and CHECK the mirror relies on ─────────────────────

create index if not exists people_linked_user_idx
  on public.people (linked_user_id) where linked_user_id is not null;

-- A linked chart cannot exist without the link that produced it. Trivially
-- true for every existing row (chart_source defaults to 'local'), so this
-- validates against live data without a rewrite.
alter table public.people drop constraint if exists people_linked_chart_requires_link;
alter table public.people add constraint people_linked_chart_requires_link
  check (chart_source = 'local' or linked_user_id is not null);

-- ─── connection_grants: free a revoked mirror's person row for reuse ──────
--
-- connection_grants_person_idx as shipped in 20260913160000 is a plain
-- unique index on viewer_person_id with no status predicate. revoke_connection
-- (next migration) does not delete the grant row when it strips a mirror; it
-- sets status = 'revoked' and leaves the row in place, exactly as
-- design/galaxia-constellation-connect-plan.md section 3.5 describes ("leaves
-- the viewer a bare star... intact"). A sender can regenerate a connect
-- invite for that same now-bare person row (create_connect_invite's merge
-- target validation only requires linked_user_id is null and
-- birth_precision = 'none', both true again after a revoke), and a second
-- accept for it would then collide with the first grant's still-present
-- revoked row on this exact index, even though nothing is actually double
-- assigned. Narrowing the index to living rows only (status <> 'revoked')
-- keeps the real guarantee, at most one *live* mirror per person row, while
-- letting a revoked person row be reused. accept_connect_invite and
-- approve_reverse_grant (next migration) still create at most one row per
-- person: a fresh insert only ever targets a person row that just passed the
-- same linked_user_id is null check, so it cannot collide with a live row.
drop index if exists public.connection_grants_person_idx;
create unique index if not exists connection_grants_person_idx
  on public.connection_grants (viewer_person_id)
  where status <> 'revoked';

-- ─── galaxy_relations: the canonical relation list, in SQL ────────────────
--
-- Mirrors GALAXY_RELATION_PICKER_OPTIONS in packages/core/src/galaxy-orbit.ts
-- (21 entries; the plan's section 3.2 says 22, already corrected in
-- changelog.d/cursor-constellation-connect-schema-9087.md). create_connect_invite
-- (next migration) validates p_relation against this table because the
-- canonical list lives in TypeScript and a bare SQL literal would drift from
-- it silently. Deliberately not filtered: child and grandchild stay in this
-- table because they remain valid relations for the existing birth_data flow.
-- The refusal for constellation connect specifically is a runtime check
-- inside create_connect_invite, not a smaller seed list here, for the same
-- reason invites.relationship_type has no CHECK naming those two values: the
-- exclusion is a connect-specific product rule, not a fact about the relation
-- itself.
create table if not exists public.galaxy_relations (
  value text primary key
);

comment on table public.galaxy_relations is
  'Canonical relation picker values, mirrored from GALAXY_RELATION_PICKER_OPTIONS in packages/core/src/galaxy-orbit.ts. Read only by create_connect_invite to validate p_relation, because the source of truth for the list is TypeScript. Contains child and grandchild: those two are ordinary valid relations everywhere else in the product, the connect specific exclusion is enforced separately, at call time, inside create_connect_invite.';

insert into public.galaxy_relations (value) values
  ('partner'), ('child'), ('grandchild'), ('parent'), ('sibling'),
  ('grandparent'), ('friend'), ('cousin'), ('relative'), ('aunt'),
  ('uncle'), ('niece'), ('nephew'), ('in-law'), ('ex'), ('colleague'),
  ('boss'), ('professor'), ('mentor'), ('acquaintance'), ('ancestor')
on conflict (value) do nothing;
