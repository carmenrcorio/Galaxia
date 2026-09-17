## Phase 2 mobile shell twin (branch `cursor/mobile-shell-twin-1b96`) — 2026-09-17

**Trigger**: Twin spec Phase 2 after hygiene (`#333`). Phone next to `/app` should share night sky and type. No natal wheel (Phase 3). No living constellation (Phase 4).

`[ADDED]` **Fraunces + Inter via `expo-font`.** Same static TTFs (and OFL) as `apps/web/app/s/[token]/opengraph-image/fonts/`. Root layout holds splash until the four cuts load. Titles use Fraunces SemiBold; body and tabs use Inter. No italic cut in-repo, so brand italic is skipped.

`[ADDED]` **Authed Skia `CosmicBackground`.** `@shopify/react-native-skia@2.6.2` (bundled with SDK 57) plus `expo-blur`. Three parallax layers, cream stars, density/cap/lerp/EMA-shed copied from `apps/web/components/cosmic-background.tsx`. PictureRecorder paints the field (not one Circle per star). `prefers-reduced-motion` draws one static frame. Gyro is a no-op without a sensor, same as web when deviceorientation is silent.

`[ADDED]` **Glass card / pill / chip primitives** in `apps/mobile/src/components/glass.tsx`. Landing recipe: gold hairline, radius 22, blur, cream wash. Home and This Week sit on `GlassCard`. Authed screens are transparent so the sky shows through.

`[ADDED]` **Expo tabs: Home, Compare, Groups, Vela, Settings.** URLs stay `/home` `/compare` `/groups` `/vela` `/settings`. Home no longer dumps those four as Link-pills; Moment, onboarding, and My profile stay home actions. Subscribe stays outside `(app)`. Trial banner twins web copy from entitlement fields (`Continue with Galaxia →` to `/subscribe`, D1 manage-on-web).

`[TESTED]` Starfield math vs web source, shell-twin wiring (fonts, Skia pin, tabs, trial banner, no home dump), existing mobile suite path updates. Metro boot + typecheck. Device unverified (Cloud Agent cannot prove native UI).

`[OPEN]` Device unverified. Phase 3 is the natal wheel. Phase 4 is the living constellation.
