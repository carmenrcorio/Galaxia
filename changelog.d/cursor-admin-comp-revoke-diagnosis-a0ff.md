## Admin comp revoke stuck-pending fix (branch `cursor/admin-comp-revoke-diagnosis-a0ff`) — 2026-08-25

**Trigger**: Live evidence showed 7 `grant_comp` audit rows and zero
`revoke_comp` rows, with zero accounts ever landing in a "granted, then
revoked" state — the revoke button appeared to work ("Granting…" then a
stuck "revoking…" label) but no revoke ever reached the database. A Phase 0
diagnosis (code read + a live-DB run of `lib/admin/comp-verify.test.ts`
against the real project) proved the backend (`comp/revoke/route.ts`,
`transitionComp`'s guarded `UPDATE`, and the `revoke_comp` audit write) is
correct and fully functional — confirmed by that test flipping a real row's
`comped` and landing a real `revoke_comp` audit row. The bug is entirely
client-side.

`[FIXED]` **`CompActionButton` (`apps/web/components/admin/comp-action-button.tsx`)
never cleared its `pending` flag on the success path** — only the error
branch called `setPending(false)`. `router.refresh()` re-renders this
component in place (it does not remount it), so after a successful
grant/revoke `pending` stayed stuck `true` while the `comped` prop flipped
underneath it, permanently disabling the button and relabeling it for the
*opposite* action (e.g. a successful grant left the row's button forever
disabled and reading "Revoking…", with no revoke ever clicked). Since this
fires after every grant, it explains why no genuine revoke request has ever
reached the backend. Fixed by splitting `pending` into two independently-
tracked, always-resolving phases: `isSubmitting` (the POST itself, cleared
via `try/finally` on every path — resolved, rejected, or non-ok) and
`isRefreshing` (`router.refresh()`'s own completion, tracked via
`useTransition`/`startTransition` — the idiomatic App Router pattern for a
`router.refresh()` loading state, so the button stays disabled only until
the row's new `comped` prop actually lands, never past it). No route,
`transitionComp`, or audit-vocabulary change — diff is confined to the one
client component (plus test infra).

`[ADDED]` **`apps/web/components/admin/comp-action-button.test.tsx`** — a
jsdom + `@testing-library/react` regression test (mocked `fetch` and
`next/navigation`'s `useRouter`, no live database) proving: (1) after a
successful grant, the button ends up enabled and reads "Revoke comp" once
the post-refresh `comped` prop lands (not stuck disabled/mislabeled), and
the same in reverse for revoke; (2) a non-ok response and a rejected fetch
both clear `pending` and re-enable the button with the original action and
surfaced error, without calling `router.refresh()`. Verified this test
fails against the pre-fix component (exactly the two success-path cases,
reproducing the reported stuck-label symptom) and passes against the fix.

`[ADDED]` **Component-test infra**: `@testing-library/react` and `jsdom` as
`apps/web` devDependencies; `vitest.config.ts` now also discovers
`components/**/*.test.tsx` (unchanged `lib/**/*.test.ts` node-environment
tests are untouched — route handlers still import `server-only`
transitively, so they stay source-read rather than imported, same as
`comp-route-wiring.test.ts`) and sets esbuild's `jsx: "automatic"` for the
new `.tsx` test files. New component test files opt into jsdom individually
via a `// @vitest-environment jsdom` docblock rather than switching the
whole suite.

`pnpm --filter web test` (412 tests, 37 files) and `pnpm typecheck` (all 6
packages) both pass.
