## Quick Chart nav links and retired-path redirects (branch `cursor/fix-quick-chart-nav-links-9264`) — 2026-09-13

**Trigger**: Bookmarks and older shares still hit `/quick-chart` and `/app/quick-chart`, which are not real App Router pages. The live free chart is `/chart`. Neither nav currently points at the dead paths, but nothing redirected the old URLs, and nothing tested that nav hrefs still resolve.

`[FIXED]` **Marketing nav and app nav read Quick Chart from a shared link config that targets `/chart`.** There is no `/app/chart` page, so the authed shell also links out to the public chart rather than a missing in-app route. Visual layout is unchanged.

`[ADDED]` **Permanent redirects in `apps/web/next.config.mjs`:** `/quick-chart` -> `/chart` and `/app/quick-chart` -> `/chart` (`permanent: true`, 308). No `vercel.json` (ENGINEERING.md §2). Next.js applies these before middleware, so `/app/quick-chart` does not bounce through the login gate.

`[ADDED]` **Static vitest `lib/nav-hrefs-resolve.test.ts`.** Every internal href from `lib/nav-links.ts` (and any leftover literal `href` in the two nav components) must have a matching `apps/web/app/**/page.tsx`. Deleting a linked page file fails the suite. The catch-all `app/[slug]/page.tsx` is not treated as a match.
