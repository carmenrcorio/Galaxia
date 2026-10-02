-- Hero credit line and optional inline image slots for blog posts.
-- Template-level rendering only; no post body edits.

alter table public.posts
  add column if not exists hero_image_credit text,
  add column if not exists inline_images jsonb;

comment on column public.posts.hero_image_credit is
  'Optional photo or illustration credit shown under the hero image.';

comment on column public.posts.inline_images is
  'Optional array of {after_heading, url, alt, caption, credit} objects for full-width inline figures.';
