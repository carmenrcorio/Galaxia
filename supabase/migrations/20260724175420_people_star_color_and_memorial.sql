-- Remembrance Phase 1 (P2): optional star color + memorial constellation column.
-- star_color NULL = derive from the existing element-based color (no visual change).
-- memorial_constellation ships nullable for P3; no drawing/UI in this migration.
alter table people
  add column if not exists star_color text default null,
  add column if not exists memorial_constellation text default null;

comment on column people.star_color is
  'Optional constellation node color (curated palette hex). NULL = derive from element-based color. Does not affect chart data.';

comment on column people.memorial_constellation is
  'Reserved for P3 memorial constellation drawing. NULL until declared. Unused by renderer in P2.';
