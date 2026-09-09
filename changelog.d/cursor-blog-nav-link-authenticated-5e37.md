## Add "Blog" link to the authenticated in-app nav (branch `cursor/blog-nav-link-authenticated-5e37`) — 2026-09-09

**Trigger**: "Blog" only appeared in the logged-out marketing nav (`MarketingNav`). A signed-in subscriber had no way to reach `/blog` from inside their account — no bookmark, no search hit, nothing — even though `/blog` itself needs no auth.

`[ADDED]` `components/app-nav.tsx` — one new entry in the `LINKS` array, `{ href: "/blog", label: "Blog" }`, placed after "Quick Chart". `AppNav` renders every `/app/*` route (via `app/app/layout.tsx`) plus `/account`, and both its desktop link row and its mobile drawer map over `LINKS`, so the new link picks up existing styling and behavior automatically — no new CSS, no separate mobile-only handling.

`[DECISION]` Left `QuickChartShell` (the chrome for `/chart`, `/chart/compare`) untouched. That shell is a deliberately minimal single-link header (either "← My constellation" or "Log in", by design — see its own doc comment), not a multi-item nav; it isn't "however that nav is already structured" to add a second link there. `AppNav` is the actual persistent authenticated app shell and is where users already navigate to reach `/chart` in the first place.

Verified live against the real Supabase project: created a confirmed test account via the Supabase admin API, logged in, completed onboarding, and confirmed "Blog" renders in both the desktop nav row and the mobile hamburger drawer, clicking it lands on `/blog` with posts loaded, and the user remains authenticated afterward (no redirect to `/login`). Deleted the test account and its dependent rows afterward.
