-- Allow raster photos in the public `blog-images` bucket so the admin
-- post editor can upload to `blog-images/photos/` and pick those files
-- (or the existing SVG heroes) as a post hero / inline body image.
-- ENGINEERING.md §2: new file, never an edit to an applied migration.
-- SVG stays allowed: the published hero SVGs already live at the bucket root.

update storage.buckets
set
  file_size_limit = 8388608,
  allowed_mime_types = array[
    'image/svg+xml',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif'
  ]
where id = 'blog-images';
