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
4. Deploy `vela-chat` edge function.
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
