## Fix aliased env reads in supabase.ts and vela.tsx so they inline in production (branch `cursor/fix-mobile-env-inline-1771`), 2026-09-13

**Trigger**: PR #214 (`cursor/wire-expo-public-site-url-3a2b`) measured the real Metro
production transform and found that `src/lib/supabase.ts` and `app/(app)/vela.tsx` both
read `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` through an aliased
`globalThis.process?.env` accessor. `babel-preset-expo`'s inliner only rewrites a literal
`process.env.EXPO_PUBLIC_...` member expression, and Metro's runtime `process.env` object
is injected in development only, so the aliased read compiles to a dead property access and
evaluates to `undefined` in any real `dev=false` bundle, even when the variable is correctly
set in EAS. `supabase.ts` then hard-throws at import time. That defect was flagged as
`[OPEN]` in PR #214 rather than fixed there, deliberately left for its own slice.

`[FIXED]` **`src/lib/supabase.ts` and `app/(app)/vela.tsx` now read both variables as
literal `process.env.EXPO_PUBLIC_...` member accesses**, behind a `typeof process`/
`process.env` guard, exactly the shape `src/lib/env.ts` already used. No behavior change
when the variables are set: `supabase.ts` still throws at import time naming both variables
when either is missing, and `vela.tsx`'s `functionUrl` still resolves to `null` when the
base is unset. Only the read shape changed, so the same value that used to require a
development-mode Metro server (or Expo Go) to appear now appears in a real production
bundle too.

`[ADDED]` **`src/lib/production-env-inline.test.ts`** pins the read shape for both files
and reruns the exact measurement PR #214 used: `@babel/core#transformFileSync` with
`babel-preset-expo` and a caller shaped like Metro's production caller (`isDev: false`,
`platform: "ios"`). It confirms the set values are now present as string literals in the
compiled output, that no live `process.env.EXPO_PUBLIC_SUPABASE_...` member access survives
the transform, and that unset variables still compile to `undefined` rather than a stale or
fabricated fallback. Also adds `@types/babel__core` as a dev dependency and augments
`TransformCaller` locally for the extra keys `babel-preset-expo` reads off the caller
object (`isDev`, `isServer`, `isNodeModule`, `platform`), which the upstream type does not
declare.

`[DECISION]` **Fixed in place rather than routed through `env.ts`.** `env.ts`'s
`requireSiteUrl` throws lazily, at the moment a link is assembled, because no shipping
surface is bricked by a variable it does not use yet. `supabase.ts` throws at module scope
on purpose, because nothing in the app works without a backend. Moving the Supabase reads
into `env.ts` would either change that throw timing or require a second, differently-shaped
helper, so the mechanical fix (literal access, same guard, same call site) was applied
directly to both files instead, matching what PR #214's own notes said the fix would look
like.

`[FIXED]` **Grepped the rest of `apps/mobile` for the same aliased-read pattern**
(`globalThis.*process`, `process?.env`, and any indirection other than a literal
`process.env.EXPO_PUBLIC_` member expression). Only `src/lib/supabase.ts` and
`app/(app)/vela.tsx` had it; `src/lib/env.ts` (added in PR #214) already used the correct
shape, and no other file in `apps/mobile` reads an `EXPO_PUBLIC_` variable at all.
