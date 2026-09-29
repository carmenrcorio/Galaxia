# Cursor prompt: hero + supporting images (with accessible descriptions) for the 9 blog posts

Run this AFTER the 9-posts PR is merged and live, or stack it on that branch. Do not block the posts going live (Venus post must ship by Oct 1) on this work.

## Context
Nine SEO posts live at top-level `app/[slug]/page.tsx`, backed by the Supabase `posts` table. They currently have no images. Each post needs a **hero image** and one **supporting figure** with proper accessibility text. The images are already made. I'm adding the folder `blog-images/` (from blog-images.zip) to the repo. It contains, per slug, `<slug>-hero.png/.svg` (1600x840), `<slug>-figure.png/.svg` (1200x700), and `image-manifest.json` with the alt text, caption, and long description for every image.

## Ground rules
- Alt text, captions, and long descriptions come ONLY from `image-manifest.json`. Do not rewrite them. If one is missing or empty, fail loudly; never ship an image without alt text.
- No AI-generated or mocked-up app UI. These images are original illustrations and explanatory diagrams. Do not add any others.
- Follow the repo conventions: FOUNDER-REVIEW tag on any new authored user-facing string in code (not the manifest text), shared components over one-offs.
- Merged is not live: migrations and deploys are separate explicit steps.

## Steps
1. Inspect the `posts` schema and the post page component. Report in 5 lines how images could fit before changing anything (existing cover/OG columns? how body markdown is rendered?).
2. Copy `blog-images/` assets into the web app's public folder, e.g. `public/blog/<slug>/hero.png`, `figure.png` (use the repo's existing static-asset convention; prefer PNG plus keeping SVGs as source only). Keep width/height so there is no layout shift.
3. Schema: if no fields exist, add a migration for `hero_image_url`, `hero_image_alt`, `figure_image_url`, `figure_image_alt`, `figure_caption`, `figure_long_description`, `figure_after_heading` (all nullable text). Idempotent. Populate for all 9 slugs from the manifest and the placement map below.
4. Render:
   - **Hero** at the top of the post, below the title, with `next/image`, `priority`, `alt` from `hero_image_alt`. Full content width, rounded corners consistent with the site, and comfortable at 375px.
   - **Figure** as semantic `<figure>` with `<img alt>` and `<figcaption>` (the caption). Insert it after the section named in `figure_after_heading`; if that heading isn't found, append after the first H2 section and log it.
   - **Long description** for the figure in a `<details><summary>Text description of this diagram</summary>...</details>` directly under the caption, keyboard accessible, visible focus style, readable contrast.
   - Lazy-load the figure; hero is eager.
5. Sharing: set Open Graph and Twitter image to the hero (absolute URL, 1600x840 is fine), include `og:image:alt`, and add `image` to the Article JSON-LD.
6. Accessibility checks: every `<img>` has non-empty alt; long description is reachable by keyboard and screen reader; text/background contrast passes WCAG AA for any styled caption text; no images without dimensions; works at 375px with no horizontal scroll. Add a small test or build-time check that fails if a post with an image lacks alt text.
7. Open a PR with before/after screenshots at desktop and 375px for two posts, plus the list of slugs and what was verified.
8. After merge: apply the migration to production Supabase, confirm the Vercel deployment is READY, then check all 9 URLs in production: hero visible, figure and `<details>` present, OG image tag correct, images return 200. Report the results.

## Figure placement map (slug -> insert the figure after this H2 section)
- uranus-retrograde-gemini-2026-relationships -> "Why \"for your sign\" is the wrong unit"
- neptune-in-synastry-meaning -> "The mechanism: projection, not magic"
- venus-retrograde-2026-relationships -> "A gentle 41-day approach"
- how-people-used-astrology-what-they-got-right-and-wrong -> "A short history of how it was used"
- synastry-vs-composite-chart -> "Composite: the relationship as its own entity"
- moon-sign-in-relationships -> "A quick tour by element"
- whole-sign-houses-explained -> "How Whole Sign houses work"
- mercury-retrograde-relationships-2026 -> "Practical habits for the window"
- chart-without-birth-time -> "What stays reliable"

## Definition of done
All 9 posts show a hero and a supporting figure in production, every image has alt text from the manifest, each figure has a keyboard-accessible text description, OG images are set, and no layout break at 375px.
