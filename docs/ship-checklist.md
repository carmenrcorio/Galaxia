# Galaxia Ship Checklist (Step 13)

## Mobile (Expo / EAS)

1. Configure app metadata:
   - `apps/mobile/app.json` bundle IDs/package names
   - app icons/splash assets
2. Set EAS project:
   - replace `expo.extra.eas.projectId`
3. Login and configure credentials:
   - `eas login`
   - `eas build:configure`
4. Build:
   - iOS preview/prod: `eas build --platform ios --profile preview|production`
   - Android preview/prod: `eas build --platform android --profile preview|production`
5. Submit:
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
5. Validate RLS and shared/minor guardrail behavior in staging.

## Store listing assets

- App subtitle/tagline
- 5 screenshots per platform
- Privacy policy URL
- Terms URL
- Support URL
- Age rating questionnaire responses

## Follow-ups (not this checklist)

- Env module public/private split (dedicated pass later).
