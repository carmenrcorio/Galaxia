## Fix Quick Share Vercel build (branch `cursor/fix-quick-share-client-bundle-6174`) — 2026-07-22

**Trigger**: PR #66 merged with a failed Vercel build. `lib/quick-share.ts` imported `node:crypto` and was pulled into Client Components via `/s/[token]`, so webpack failed with `UnhandledSchemeError` on `node:crypto`.

`[FIXED]` **Split server-only helpers into `lib/quick-share-server.ts`.** Token generation (`node:crypto`) and service-role Supabase read/write live there; Client Components import only the browser-safe `lib/quick-share.ts` (types, validation, framing, copy). Local `next build` passes again.
