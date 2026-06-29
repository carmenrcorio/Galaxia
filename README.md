# Galaxia

Mobile-first relationship intelligence with an astrological lens.

## Monorepo

- `apps/mobile`: Expo Router app (primary client)
- `apps/web`: Next.js App Router companion (marketing + account landing)
- `packages/astro`: deterministic astrology engine helpers (generational layer implemented first)
- `packages/core`: shared domain copy and constants
- `packages/vela`: Vela prompt and context contracts
- `packages/ui`: shared tokens
- `supabase`: SQL migrations and edge functions

## Quick start

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Run everything in parallel:

   ```bash
   pnpm dev
   ```

3. Run tests:

   ```bash
   pnpm --filter @galaxia/astro test
   ```

## Current implementation status

- Scaffold from build spec section 14 step 1 complete.
- Deterministic generational astro layer from step 3 implemented with boundary tests.
- Mobile onboarding shell and web marketing/account shell in place for rapid iteration.
