-- Person-to-person relationship edges: approved vocabulary, no self-loops,
-- canonical UUID order, unique undirected pair+type, ON DELETE CASCADE.
--
-- 20260712190000_relationships_honor_unique is in the production ledger but
-- its unique index is not present on eigfvribtntbxyjutsma (only the PK).
-- This file is a new migration with a new constraint name. Do not edit
-- the applied honor-unique file.
--
-- Safe to apply via `supabase db push` / MCP apply_migration (transactional).
-- Does not need autocommit. Does not touch relationships RLS.

-- Canonical direction: lower uuid in person_a. Simultaneous assignment.
update public.relationships
set person_a = person_b,
    person_b = person_a
where person_a > person_b;

-- Replay of 20260712190000 creates this index; production does not have it.
-- Drop so the unique constraint below is the single uniqueness rule.
drop index if exists public.relationships_owner_pair_type_uidx;

alter table public.relationships
  drop constraint if exists relationships_relation_type_allowed;

alter table public.relationships
  add constraint relationships_relation_type_allowed
  check (relation_type in (
    'remembrance',
    'partner',
    'family',
    'friend',
    'colleague',
    'chosen',
    'other'
  ));

alter table public.relationships
  drop constraint if exists relationships_person_a_ne_person_b;

alter table public.relationships
  add constraint relationships_person_a_ne_person_b
  check (person_a <> person_b);

alter table public.relationships
  drop constraint if exists relationships_person_a_lt_person_b;

alter table public.relationships
  add constraint relationships_person_a_lt_person_b
  check (person_a < person_b);

alter table public.relationships
  drop constraint if exists relationships_owner_canonical_pair_type_key;

alter table public.relationships
  add constraint relationships_owner_canonical_pair_type_key
  unique (owner_id, person_a, person_b, relation_type);

alter table public.relationships
  drop constraint if exists relationships_person_a_fkey;

alter table public.relationships
  add constraint relationships_person_a_fkey
  foreign key (person_a) references public.people(id) on delete cascade;

alter table public.relationships
  drop constraint if exists relationships_person_b_fkey;

alter table public.relationships
  add constraint relationships_person_b_fkey
  foreign key (person_b) references public.people(id) on delete cascade;

comment on table public.relationships is
  'Owner-declared person-to-person bonds. relation_type is one of remembrance, partner, family, friend, colleague, chosen, other. person_a is the lower uuid. Distinct from people.relation / galaxy_relations (owner-relative). Honor-constellation uses remembrance. Never inferred from people.relation.';
