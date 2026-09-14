## Restore relationship-edge constraints (branch `cursor/relationships-edge-constraints-f22d`) — 2026-09-14

**Trigger**: Person-to-person galaxy lines were narrowed to remembrance-only. Phase 1 restores the table so other approved types can exist, without changing how the 21 existing remembrance edges read or draw.

`[ADDED]` **`supabase/migrations/20260914280000_relationships_edge_constraints.sql`.** CHECK on `relation_type` for the approved vocabulary (`remembrance`, `partner`, `family`, `friend`, `colleague`, `chosen`, `other`). CHECK `person_a <> person_b`. Data migration swaps any row where `person_a > person_b`, then CHECK `person_a < person_b` and UNIQUE `(owner_id, person_a, person_b, relation_type)` as `relationships_owner_canonical_pair_type_key`. Both person FKs are now `ON DELETE CASCADE`. Does not touch relationships RLS.

`[FIXED]` **The honor-unique index was in the ledger and missing live.** `20260712190000_relationships_honor_unique` is recorded on eigfvribtntbxyjutsma; `pg_indexes` showed only `relationships_pkey`. That applied file is not edited. This migration `DROP INDEX IF EXISTS relationships_owner_pair_type_uidx` (no-op on production, replay-safe) and adds the canonical unique constraint under a new name.

`[CHANGED]` **Honor inserts write canonical UUID order.** `buildHonorRelationshipInsert` uses `canonicalRelationshipPair` so a new remembrance row still satisfies `person_a < person_b`. `honorEdgesFromDeclaredRows` still draws remembrance from the passed person to the living carrier, so `bezierCP` (not symmetric) does not flip the nine swapped rows. Queries and `drawHonorLink` stay honor-filtered this phase.

`[DECISION]` **Vocabulary is undirected.** Canonical UUID order cannot encode parent vs child, so the CHECK list does not use Compare's directed frames or `galaxy_relations`.
