-- Public SVG hero images for the ten published posts.
-- Bucket `blog-images` is public, service-role-write-only: same posture as
-- `post-images` (no storage.objects policy; public URLs bypass RLS for
-- reads; writes go through the service role). SVG-only: the generator in
-- scripts/dev/generate-blog-hero-images.mjs is a content tool, not a
-- production runtime.
-- ENGINEERING.md §2: new file, never an edit to an applied migration.
-- Origin is concatenated so the public API URL is not a single literal.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-images',
  'blog-images',
  true,
  2097152,
  array['image/svg+xml']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = array['image/svg+xml'];

update public.posts
set hero_image_url = concat(
  'https://',
  'eigfvribtntbxyjutsma',
  '.supabase.co/storage/v1/object/public/blog-images/',
  slug,
  '.svg'
)
where status = 'published'
  and slug in (
    'mothers-moon-sign-apology',
    'colleague-you-cannot-read',
    'synastry-chart-meaning',
    'moon-square-saturn-parent-child',
    'nobody-has-your-grandmother',
    'what-a-chart-cannot-tell-you',
    'sun-sign-not-personality',
    'synastry-aspects-explained',
    'reading-chart-of-someone-who-died',
    'compatibility-scores-wrong-question'
  );
