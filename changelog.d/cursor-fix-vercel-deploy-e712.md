## Unblock Vercel `next build` typedRoutes (branch `cursor/fix-vercel-deploy-e712`) — 2026-09-14

**Trigger**: PR #267 and every production deploy since #262 failed Vercel. Local `next build` (the same command Vercel runs in `apps/web`) type-checks after compile and stops on `save-to-galaxy-button.tsx`.

`[FIXED]` **`router.push(personProfileHref(person.id) as never)`.** `personProfileHref` returns `string`; Next `typedRoutes` wants `RouteImpl<string>`. The matching `Link` already used `as never`. Type-only cast; the href and navigation are unchanged. No `vercel.json`. No migration.
