# Blog images (`apps/web/public/blog/`)

Images served from this folder power blog heroes, inline figures, and index cards. Every file must be owned by Galaxia or used under a license that allows web publication.

## Rules

- **Format:** WebP preferred (PNG acceptable during migration). One file per slot unless noted.
- **Width:** At least 1600px on the long edge for heroes and full-width inline images.
- **Weight:** Under 250 KB per file after compression.
- **Alt text:** Descriptive, stored in `posts.hero_image_alt` or the inline image `alt` field. Decorative heroes still need a plain-language alt in the database.
- **Credit:** Required when the license or photographer asks for it. Store in `hero_image_credit` or inline `credit`.
- **Naming:** `public/blog/{slug}/{name}.webp` (example: `public/blog/synastry-chart-meaning/hero.webp`, `public/blog/synastry-chart-meaning/inline-aurora.webp`).
- **No hotlinking:** Do not reference third-party URLs in post bodies or image fields. Copy files here (or into the Supabase `blog-images` bucket via admin upload) instead.

## Do not

- Pull stock photos from the open web without a verified license.
- Embed text headlines in hero art (index cards use title type instead).
