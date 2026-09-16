## Restore sign tiles and OG share image (branch `cursor/restore-sign-tiles-og-image-71d8`) — 2026-09-16

**Trigger**: `GET /opengraph-image` 404'd. Sun/Moon/Rising tiles under the natal wheel were restored on `main` by #309; this branch keeps that landing and adds the missing App Router OG route.

`[FIXED]` **Site-wide `/opengraph-image`.** Added `apps/web/app/opengraph-image.tsx`, a Next.js metadata route that returns a 1200x630 branded PNG (deep navy `#09091c`, gold `#d4a855`, violet bloom, Cormorant Garamond, locked homepage tagline). Without this file, `app/[slug]/page.tsx` treated `/opengraph-image` as a missing blog post. `app/layout.tsx` still restates `openGraph.images` as `/og-image.png`.
