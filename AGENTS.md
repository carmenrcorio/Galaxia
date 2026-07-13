# AGENTS.md

## Cursor Cloud specific instructions

Galaxia is a pnpm + Turborepo monorepo. See `README.md` for the product overview and `ENGINEERING.md` for the (load-bearing) engineering standards — read `ENGINEERING.md` §2 before touching any config, and §8/§12 before touching astrology code.

Node 22 and `pnpm@9.15.9` (via corepack) are already present on the VM, and `pnpm install` is run automatically on startup. The notes below are the non-obvious things that are easy to get wrong.

### Services / packages

- `apps/web` (`@galaxia/web`) — Next.js 15 App Router companion. This is the app to run and test in the cloud VM (it renders in a normal browser).
- `apps/mobile` (`@galaxia/mobile`) — Expo Router (React Native) app, the *primary* product client, but it targets iOS/Android. See the mobile caveat below.
- `packages/astro`, `core`, `vela`, `ui` — shared workspace libraries. `@galaxia/astro` (deterministic astrology engine) and `@galaxia/vela` have real Vitest suites; the others have placeholder test/lint scripts.
- `supabase/` — SQL migrations + the `vela-chat` Deno edge function (Anthropic-backed). No local Supabase stack is wired up in-repo.

### Running & testing (standard commands live in root `package.json` / `README.md`)

- `pnpm dev` runs every app's dev server in parallel (turbo). To run just one: `pnpm --filter @galaxia/web dev` (Next.js on `:3000`) or `pnpm --filter @galaxia/mobile dev` (Expo/Metro on `:8081`).
- `pnpm test`, `pnpm typecheck`, `pnpm build` fan out through turbo. Real automated coverage is `@galaxia/astro` (33 tests) and `@galaxia/vela` (4 tests); `@galaxia/astro` tests make live calls to the Open-Meteo geocoding API, so they need network egress.

### Non-obvious caveats

- **`pnpm lint` fails on `apps/web`.** `apps/web` has no committed ESLint config, so `next lint` drops into an interactive "How would you like to configure ESLint?" prompt and turbo reports the task as failed in a non-interactive shell. This is a pre-existing repo state, not a regression — do not "fix" it by adding an ESLint config unless that is the actual task. The other five packages lint fine (placeholder scripts). `pnpm typecheck` (`tsc --noEmit`) is the reliable static check and passes across all packages.
- **The web app boots without real Supabase env.** `lib/supabase/client.ts` falls back to a placeholder Supabase URL/key, so the marketing site and the public **Quick Chart** flow (`/chart`, `POST /api/quick-chart`) work with zero configuration. Auth, account, `/app/*`, subscriptions, and Vela require real `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (+ `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY` for their respective features) — see `ENGINEERING.md` §6. Use `/chart` as the no-secrets smoke test: it exercises the shared `@galaxia/astro` engine end to end.
- **Billing is RevenueCat Web Billing (`apps/web` only); Stripe lives in the RC dashboard, not the app.** Env (see `lib/env.ts`): `NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY` (public), and server-only `REVENUECAT_SECRET_KEY` / `REVENUECAT_WEBHOOK_AUTH` / `REVENUECAT_PROJECT_ID` (never `NEXT_PUBLIC_`). The RC App User ID **is** the Supabase `user.id` (= `profiles.id`), so one RC customer ⇄ one profile. `POST /api/webhooks/revenuecat` is the **only** writer of paid status; it fails closed on the auth check (unset secret → 503, missing/forged `Authorization` → 401) and can be exercised without Supabase via curl (set `REVENUECAT_WEBHOOK_AUTH`, then a valid event with correct auth reaches the Supabase-config guard = auth passed). The paywall is monthly-only; `@galaxia/core hasAccess` is the single access decision and must stay unchanged. Subtlety: RC `CANCELLATION` keeps the user `active` (access continues to period end); only `EXPIRATION` → `canceled`.
- **The Expo mobile app cannot be fully run in the cloud VM.** It targets native iOS/Android (no simulator here). `expo start` starts Metro fine and the app typechecks, but the **web target does not render**: (1) in this pnpm hoisted monorepo Expo emits a broken bundle URL (`/../../node_modules/expo-router/entry.bundle`) that the browser 404s, and (2) Metro fails to bundle because `@supabase/supabase-js` does a lazy `import("@opentelemetry/api")` marked `webpackIgnore`/`turbopackIgnore`/`@vite-ignore` — Next.js/webpack ignore it, but Metro tries to statically resolve it and errors with `Unable to resolve "@opentelemetry/api"`. Treat mobile verification here as: install + `pnpm --filter @galaxia/mobile typecheck` + Metro boots. The app requires `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` at startup or it throws.
- **`.npmrc` uses `node-linker=hoisted`** and must not change (`ENGINEERING.md` §2) — it is required for Expo + pnpm.

### Verifying galaxy / canvas work (the `/app` constellation, `CosmicBackground`)

The animated canvases (parallax starfield, generational nebulae, entrance/living-light) are perf- and motion-sensitive, so hold canvas changes to a consistent bar and prove it — don't eyeball it. Standing checks:

- **Mobile smoothness at 375px.** Drive it with Playwright at a 375px, DPR-2 viewport under CPU throttling (`Emulation.setCPUThrottlingRate`, ~4× ≈ a mid/low phone) and measure sustained FPS with a `requestAnimationFrame` counter. Report the number; it should stay smooth (this pass held ~50–60fps). If it can't, degrade (fewer layers / cheaper effects), don't lag.
- **`prefers-reduced-motion`.** With `reducedMotion: 'reduce'`, twinkle/parallax/drift must be off and one static frame drawn. Verify by sampling canvas pixels twice with a delay and asserting they don't change.
- **Prove subtle motion objectively.** Parallax is intentionally subtle and won't read in a compressed video; use a pixel-diff (pointer-swept vs. held-still should change several× more than the twinkle-only baseline) and/or a chromatic overlay (left-frame in blue, right-frame in red → separated pairs = shift).
- **Gotcha — `/app` needs auth + Supabase, which the cloud VM lacks.** Middleware redirects unauthenticated `/app` → `/login`, and `waitUntil: 'networkidle'` **hangs** on the placeholder Supabase URL. To render the constellation for a test: `page.route('**/*.supabase.co/**', r => r.abort())`, use `waitUntil: 'domcontentloaded'`, and add a **temporary** client-side demo hook (seed `people` + `cohortByPerson` + `links`, set `loading=false`) plus a temporary middleware bypass. **Remove all temporary hooks/bypasses before committing** (grep for the marker you used, e.g. `__demo`/`TEMP-DEMO`) — nothing internal ships (`ENGINEERING.md` §7). `CosmicBackground` alone (starfield + atmosphere) renders on `/` with no auth, so test it there.
