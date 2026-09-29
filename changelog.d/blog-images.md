## Blog images and post dates (branch `blog-images`) — 2026-09-29

**Trigger**: The nine SEO posts needed today's date, the withheld Whole Sign article, and a hero plus one accessible figure each.

`[FIXED]` **Published dates are 2026-09-29.** `20260929210633_publish_whole_sign_and_date_seo_posts.sql` sets `published_at` to 12:00 UTC on that day for the eight posts that had later dates. The byline and Article `datePublished` both read that column.

`[DECISION]` **`whole-sign-houses-explained` is published as written.** Carmen asked for all nine articles. The draft still says Galaxia calculates with Whole Sign houses. The app default remains Placidus. Whole Sign is a settings option and the polar fallback.

`[ADDED]` **Hero and figure fields, plus the PNGs.** Nullable `hero_image_alt`, `figure_image_url`, `figure_image_alt`, `figure_caption`, `figure_long_description`, and `figure_after_heading`. Public files live at `apps/web/public/blog/<slug>/hero.png` (1600×840) and `figure.png` (1200×700). Alt text, captions, and long descriptions are the manifest strings, stored by `20260929210958_blog_post_image_urls.sql`. The figure follows the named H2. Its text description is a keyboard-focusable `<details>` control. Open Graph, Twitter, and Article JSON-LD use the hero.

`[OPEN]` **Image URLs are not applied yet.** `20260929210633` and `20260929210745` (the columns) are on production. Apply `20260929210958_blog_post_image_urls.sql` after the Vercel deployment that contains the PNGs is READY, then check all nine URLs.
