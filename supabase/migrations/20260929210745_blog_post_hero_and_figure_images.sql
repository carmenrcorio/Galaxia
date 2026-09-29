-- Nullable image columns for blog heroes and supporting figures.
-- Older posts keep hero_image_url and leave these null.
-- Idempotent. Image URLs are set in the following migration so this
-- alter can land before the PNG files are deployed.

alter table public.posts
  add column if not exists hero_image_alt text,
  add column if not exists figure_image_url text,
  add column if not exists figure_image_alt text,
  add column if not exists figure_caption text,
  add column if not exists figure_long_description text,
  add column if not exists figure_after_heading text;
