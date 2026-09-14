-- Per-person visual scale + free placement past the outer guide ring.
-- star_scale NULL is treated as 1.0 in app code (nullable-safe).
-- custom_position radius_pct ceiling rises from 1.0 to 2.5 as a data guard only;
-- the live bound is canvas geometry (maxSeatRadius), not this number.

alter table public.people
  add column if not exists star_scale numeric default 1.0;

alter table public.people
  drop constraint if exists people_star_scale_range;

alter table public.people
  add constraint people_star_scale_range
  check (
    star_scale is null
    or (star_scale >= 0.6 and star_scale <= 2.0)
  );

comment on column public.people.star_scale is
  'Visual size multiplier for this person on the constellation (core, glow, memorial glyph). NULL = 1.0. Does not affect seat position. Range 0.6–2.0.';

alter table public.people
  drop constraint if exists people_custom_position_shape;

alter table public.people
  add constraint people_custom_position_shape
  check (
    custom_position is null
    or (
      jsonb_typeof(custom_position->'angle') = 'number'
      and jsonb_typeof(custom_position->'radius_pct') = 'number'
      and (custom_position->>'radius_pct')::numeric >= 0.05
      and (custom_position->>'radius_pct')::numeric <= 2.5
    )
  );

comment on column public.people.custom_position is
  'Owner-chosen polar seat on the constellation. NULL = derived default (galaxySeatsResolved). Shape {angle: radians, radius_pct: >= 0.05}. Live bound is canvas geometry (maxSeatRadius); 2.5 is a data-guard ceiling only. Writable only via people owner all RLS (owner_id = auth.uid()). Never copied across constellation-connect mirrors.';
