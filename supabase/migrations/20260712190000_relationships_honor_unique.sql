-- Remembrance Phase 3: honor-constellation uses the dormant `relationships` table.
-- One declared remembrance/continuity connection per (owner, person_a, person_b, type).
-- person_a = passed person; person_b = living carrier; relation_type = 'remembrance'.
-- Prevents duplicate rows so declare/remove round-trips cleanly (reversible).
create unique index if not exists relationships_owner_pair_type_uidx
  on relationships (owner_id, person_a, person_b, relation_type);

comment on table relationships is
  'Owner-declared person-to-person bonds. Honor-constellation (Phase 3) uses relation_type = remembrance for continuity edges between a passed person (person_a) and a living carrier (person_b). Never inferred from people.relation.';
