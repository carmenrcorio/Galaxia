## Guard footer, CTA, empty-state, and email hrefs (branch `cursor/audit-web-internal-links-d714`) — 2026-09-14

**Trigger**: After the Quick Chart nav lock (#228), other internal hrefs (footer, related-link CTAs, empty states, trial/nudge emails) were still hardcoded. A deleted page file would not fail the existing nav resolve suite.

`[ADDED]` **Footer, CTA, empty-state, and email hrefs live in `apps/web/lib/nav-links.ts` alongside the B1 nav config.** Consumers import those arrays/paths instead of a second hardcoded copy. Visual layout and destinations are unchanged.

`[ADDED]` **`lib/nav-hrefs-resolve.test.ts` now also asserts those hrefs.** Deleting a linked `page.tsx` fails the suite. `/synastry-chart-meaning` is an explicit published-blog allowlist entry served by `app/[slug]/page.tsx`; the catch-all is still not a match for an arbitrary path.

`[DECISION]` **No new next.config redirects.** `/quick-chart` and `/app/quick-chart` already 308 to `/chart`. `/app/family-compare` already 308s in middleware. No `vercel.json`.
