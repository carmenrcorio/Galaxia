-- Keep public.galaxy_relations in sync with GALAXY_RELATION_PICKER_OPTIONS
-- after the first-run orientation flow added three picker values.
--
-- The first-run flow asks "who do you want to understand first?" in the words
-- people actually use: my mother, my father, someone else. Flattening mother
-- and father to `parent` at write time would throw away something the user
-- told us, so both are now real picker values. `other` is the explicit
-- "someone else" choice.
--
-- `mother`, `father` and `other` all already resolved correctly in
-- packages/core/src/galaxy-orbit.ts: mother/father as FAMILY_RELS +
-- PARENT_FORM_RELS (family band, ring 3, fixed form), and `other` as the
-- unknown band at ring 4. Only the picker list and this SQL mirror changed;
-- no orbit, seat, or element behaviour moves.
--
-- Why this table needs the rows: create_connect_invite validates p_relation
-- against galaxy_relations (see 20260913180000_constellation_connect_functions.sql).
-- Without these rows, a person added as a mother could never be sent a
-- constellation connect invite, and the failure would look like a bug in
-- connect rather than a missing lookup row.
--
-- Same rationale as the original seed: child and grandchild stay in this table
-- even though connect refuses them at call time. This table is the canonical
-- relation list, not the connect-eligible list.
insert into public.galaxy_relations (value) values
  ('mother'), ('father'), ('other')
on conflict (value) do nothing;
