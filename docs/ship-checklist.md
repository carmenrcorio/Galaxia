# Galaxia Ship Checklist (Step 13)

## Mobile (Expo / EAS)

1. Configure app metadata:
   - `apps/mobile/app.json` bundle IDs/package names
   - app icons/splash assets
2. Set EAS project:
   - replace `expo.extra.eas.projectId`
3. Set the mobile env vars. **`EXPO_PUBLIC_*` values are inlined into the JS
   bundle by Metro at build time, so nothing in this repo supplies them and a
   build without them is broken.** There is no committed `.env` and `eas.json`
   carries no `env` block. Set all three on the EAS project (`eas env:create`,
   or the Expo dashboard) for each of the `development`, `preview`, and
   `production` profiles, and in each developer's untracked
   `apps/mobile/.env` for local `expo start`:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_SITE_URL` = `https://galaxiamea.com` (the origin used to build
     shareable web links, e.g. the paywall's "Open Galaxia on the web")

   Visibility is **Plain text**, not Secret: these land in the shipped bundle in
   the clear, so marking them secret would be a false claim. The app throws on a
   missing Supabase pair (`src/lib/supabase.ts`) and refuses to render a web
   link on a missing site URL (`src/lib/env.ts`); neither one guesses a value.

   Two non-obvious things about how these values actually reach the device:
   - A release bundle contains them only because Babel rewrote each
     `process.env.EXPO_PUBLIC_…` access into a string literal, and that rewrite
     matches one syntactic shape only. Reading through an alias or a computed
     key compiles to a property access that is `undefined` on device even when
     EAS is configured correctly. See the comment at the top of
     `apps/mobile/src/lib/env.ts`.
   - Metro caches transform results without keying on env values, so after
     changing one of these locally you need `expo start --clear` or the old
     value keeps getting bundled.
4. Login and configure credentials:
   - `eas login`
   - `eas build:configure`
5. Build:
   - iOS preview/prod: `eas build --platform ios --profile preview|production`
   - Android preview/prod: `eas build --platform android --profile preview|production`
6. Submit:
   - iOS: `eas submit --platform ios --profile production`
   - Android: `eas submit --platform android --profile production`

## Web (Next.js on Vercel)

1. Connect repository to Vercel.
2. Set env vars:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Build command: `pnpm --filter @galaxia/web build`
4. Output: `.next`
5. Configure domain for marketing + account landing.

## Supabase / Edge Functions

1. Deploy migrations.
2. Edge functions auto-inject `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
   `SUPABASE_SERVICE_ROLE_KEY` — do **not** manually set secrets with a
   `SUPABASE_` prefix (they will be rejected / ignored). Read them with
   `Deno.env.get` inside the function.
3. Set Vela secrets on the `vela-chat` function (Anthropic only):
   - `ANTHROPIC_API_KEY`
   - `ANTHROPIC_MODEL` (optional; defaults to `claude-sonnet-5`)
4. Edge function deploy is **CI**, not a laptop step. On merge to `main`,
   `.github/workflows/deploy-edge-functions.yml` deploys changed functions under
   `supabase/functions/**` to project `eigfvribtntbxyjutsma` with
   `--no-verify-jwt`, then asserts live `verify_jwt` is still `false`.
   `.github/workflows/edge-functions-parity.yml` compares deployed source bodies
   to `main` on every merge and on a daily cron (no path filter). Requires repo
   secret `SUPABASE_ACCESS_TOKEN` — a **CI-dedicated** Supabase personal access
   token (create at https://supabase.com/dashboard/account/tokens; do **not**
   reuse the laptop CLI token). Manual `supabase functions deploy` is break-glass
   only; if you use it, keep `--no-verify-jwt` and confirm the parity workflow
   stays green.
   `.github/workflows/migration-ledger-parity.yml` is the same shape for SQL:
   read-only `list_migrations` vs `supabase/migrations/` (name identity). It
   never applies. See `ENGINEERING.md` §16.
5. Validate RLS and shared/minor guardrail behavior in staging.

## Store listing assets

Copy lives in `content/store/app-store.md` and `content/store/play-store.md` (layer one: outcome first, never "an astrology app"). Hidden App Store keywords may include astrology. See `design/galaxia-voice-layers.md`.

- App subtitle/tagline
- 5 screenshots per platform
- Privacy policy URL
- Terms URL
- Support URL
- Age rating questionnaire responses

## Follow-ups (not this checklist)

- Env module public/private split (dedicated pass later).
