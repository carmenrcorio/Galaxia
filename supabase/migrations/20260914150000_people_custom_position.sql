-- Galaxy drag-reposition: per-owner polar seat on a person star.
-- NULL = derived default from galaxySeatsResolved (id + ring).
-- Shape: { angle: number (radians, same convention as GalaxySeatNorm.angle),
--          radius_pct: number (0.05–1.0, same space as GalaxySeatNorm.rn) }
-- Writable only via existing "people owner all" RLS (owner_id = auth.uid()).
-- Never copied across constellation-connect mirrors (those INSERTs list columns).

alter table public.people
  add column if not exists custom_position jsonb default null;

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
      and (custom_position->>'radius_pct')::numeric <= 1.0
    )
  );

comment on column public.people.custom_position is
  'Owner-chosen polar seat on the constellation. NULL = derived default (galaxySeatsResolved). Shape {angle: radians, radius_pct: 0.05–1.0 of ringGeom max radius}. Writable only via people owner all RLS (owner_id = auth.uid()). Never copied across constellation-connect mirrors.';
