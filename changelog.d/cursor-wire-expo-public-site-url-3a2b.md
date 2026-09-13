## Mobile reads `EXPO_PUBLIC_SITE_URL` so it can build a galaxiamea.com link (branch `cursor/wire-expo-public-site-url-3a2b`) — 2026-09-13

**Trigger**: Surfaced during the constellation-connect plan review
(`design/galaxia-constellation-connect-plan.md` §5.5 item 4 and the
Prerequisites row of §11): the client assembles `{siteUrl}/connect/{token}`,
web reads `publicEnv.siteUrl`, and mobile had no equivalent. Phase 0 diagnosis
confirmed it more broadly: `apps/mobile` had no site-URL variable, no share
feature, and not one `https://` literal, so there was no way to construct a
`galaxiamea.com` link from the app at all.

`[ADDED]` **`apps/mobile/src/lib/env.ts`**, the `apps/web/lib/env.ts`
counterpart mobile never had (`docs/ship-checklist.md` had carried "Env module
public/private split" as an open follow-up). Exports `siteUrl()` (the trimmed
origin with trailing slashes stripped, or `null`), `requireSiteUrl()`,
`siteUrlFor(path)`, `missingSiteUrlMessage()`, and `SITE_URL_VAR`. Reads use the
same defensive `globalThis.process?.env` accessor already duplicated in
`src/lib/supabase.ts` and `app/(app)/vela.tsx`, and happen inside each function
rather than at module scope, which is what lets callers choose whether a missing
value is fatal.

`[DECISION]` **The throw is lazy, not module-scope.** `src/lib/supabase.ts`
throws at import time because nothing in the app works without a backend. Doing
that for the site URL would brick startup over a variable no shipping surface
consumed yet, which is worse than the state it replaces, so `requireSiteUrl()`
throws at the moment a link is assembled instead. The message names
`EXPO_PUBLIC_SITE_URL` and gives the value to set, per `ENGINEERING.md` §6.

`[DECISION]` **No fallback origin, deliberately.** Every web consumer of
`NEXT_PUBLIC_SITE_URL` degrades softly, either to `window.location.origin`
(`components/ask-birth-data.tsx`) or to a hardcoded
`https://galaxia-three.vercel.app` (`app/layout.tsx`, `app/sitemap.ts`, the
cron routes). A native client has no request origin to recover, and guessing a
host would ship a link that confidently points at the wrong place, which §12
forbids. Unset means no link, never a broken one.

`[FIXED]` **The mobile paywall's "Continue on the web" is now reachable.**
`app/subscribe.tsx` was entirely an instruction to leave for the web (headline
"Continue on the web", body "Continue on the web to keep using Galaxia") with no
link and only an "I continued: refresh" button. It now builds
`{siteUrl}/subscribe` through `siteUrlFor` and opens it with `Linking.openURL`,
and refresh steps down to the secondary bordered style so there is one primary
action. When the variable is unset the screen renders no link at all, says so in
one honest line, and logs `[paywall] cannot build the web link: ...` naming the
variable. This is the first consumer, chosen because the affordance already
existed and was dead; the `/connect/{token}` share link the plan calls for lands
with that feature.

`[ADDED]` **`src/lib/env.test.ts`** (18 tests): unset, blank, and
whitespace-only all yield `null`; trailing slashes never double on a join; the
value is re-read per call rather than captured once at module load;
`requireSiteUrl`/`siteUrlFor` throw naming `EXPO_PUBLIC_SITE_URL` and provably
return no usable value when unset; plus wiring assertions in the
`mobile-safety-parity.test.ts` house style that `subscribe.tsx` goes through
`siteUrlFor`, holds no hardcoded origin and no `https://` literal at all, opens
the resolved URL rather than a `galaxia://` scheme, and logs rather than
swallows the failure.

`[CHANGED]` **`docs/ship-checklist.md` mobile section now lists the env vars.**
It previously named none, which is how two already-required variables
(`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`) came to be
supplied entirely out of band with nothing written down.

`[OPEN]` **This needs a manual step; the code change alone does not ship it.**
`EXPO_PUBLIC_*` values are inlined by Metro at build time, and the repo has no
committed `.env`, no `.env.example`, and no `env` block in any `eas.json`
profile. Someone must set `EXPO_PUBLIC_SITE_URL=https://galaxiamea.com` as a
**plain-text** (not secret) EAS environment variable on the `development`,
`preview`, and `production` profiles, and in each developer's untracked
`apps/mobile/.env`. Plain text is the honest classification: the value ships in
the bundle in the clear. Until that is done the paywall shows its no-link state
rather than a wrong link.

`[OPEN]` **`eas.json` was left alone.** Committing per-profile `env` blocks
would remove the manual step, but `eas.json` has never carried one and adding
the first is a config decision for a human (`ENGINEERING.md` §2 governs the
neighbourhood). Same reasoning for not inventing an `apps/mobile/.env.example`:
the root `.gitignore` whitelists `!.env.example` but no such file exists
anywhere in the monorepo, so adding one would set a new convention rather than
follow one.

`[OPEN]` **Noted while reading the plan, not fixed here.** §5.5 item 3 states
"there is no `assetlinks.json` in the repo". There is:
`apps/web/app/.well-known/assetlinks.json/route.ts`, serving
`ANDROID_PACKAGE_NAME ?? "com.galaxia.app"` with `ANDROID_SHA256_FINGERPRINTS`.
The substance of the point stands, since the native half is still unconfigured
(`app.json` has `"scheme": "galaxia"` but no `ios.associatedDomains` and no
Android `intentFilters`) and the web AASA file still carries the placeholder
`TEAMID.com.galaxia.app`. Only the claim about the file's absence is wrong.
