## Phase 1 mobile hygiene (branch `cursor/mobile-hygiene-1b96`) — 2026-09-17

**Trigger**: Twin spec Phase 1 after Expo SDK 57 (`#331`). Stop lying about Free/Galaxia+, let a phone user write house system and prefs, and delete/export through the same purge as web (D5). No Skia.

`[FIXED]` **Free / Galaxia+ remnant copy is gone.** Entitlement provider exposes `hasAccess` / trial fields only. Home, onboarding, Compare, Groups, and Vela no longer sell a plan that does not exist. Directional Compare reads and group save are ungated (the authed tree already requires `hasAccess`). No people cap, no daily Vela cap.

`[ADDED]` **Settings writes the same profile columns as web.** House system (`HOUSE_SYSTEM_OPTIONS` from `@galaxia/astro`), daily sky email, weekly constellation letter, support_requests insert, and sign out. Relational transit alerts were already a writer.

`[ADDED]` **Mobile export/delete call the existing web APIs (D5).** `GET /api/account/export` and `POST /api/account/delete` now accept the user's Supabase JWT (`Authorization: Bearer`) as well as the cookie session. Copy and confirmation live in `@galaxia/core` (`ACCOUNT_DELETE_COPY`, `isDeleteConfirmation`). Mobile never RPCs `purge_own_account_data`. Cookie `AccountDataPanel` is unchanged.

`[CHANGED]` **`@galaxia/ui` matches web `:root`.** Ink is `#0a0717`, ink2/ink3/mist/earth match `globals.css`, gold hairline, glass radius 22. Splash and Android adaptive-icon background follow ink. Person profile no longer says "Wheel placeholder".

`[TESTED]` Wiring tests for remnant copy, Settings writers, Bearer account routes, and token alignment. Device unverified (Cloud Agent cannot prove native UI).

`[OPEN]` Device unverified. Phase 2 is fonts + current Skia CosmicBackground + tabs. No Skia in this PR.
