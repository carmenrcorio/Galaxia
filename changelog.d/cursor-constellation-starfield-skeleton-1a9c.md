## Constellation star-field skeleton (branch `cursor/constellation-starfield-skeleton-1a9c`) — 2026-09-14

**Trigger**: `/app` (and mobile home) waited on people and chart data with a generic shimmer block or an empty 340px card, so the wait read as missing rather than intentional.

`[ADDED]` **Star-field skeleton on the live ring geometry** while the client `loadHome` fetch runs. Web (`apps/web/app/app/page.tsx`) and mobile (`apps/mobile/app/(app)/home.tsx`) keep the loaded-state frame height. Points come from `@galaxia/core` `constellationSkeletonSeats` (same `ringBandRadius` / `galaxySeatsResolved` as real seats). Pulse is CSS on web; mobile uses the existing `Animated` opacity loop. `prefers-reduced-motion` / `reduceMotion` holds the points static.

`[ADDED]` **250ms opacity cross-fade** from the skeleton to the live constellation. No pop.

`[CHANGED]` **Empty constellation** (zero people) leaves the skeleton and shows one action to add the first person (`/welcome` on web, `/onboarding` on mobile).

`[CHANGED]` **Load failure** stops the skeleton, shows a short could-not-load line and a retry control. People-query errors no longer look like an empty galaxy.

**Not touched**: canvas draw loop, access/`hasAccess`, billing, astrology engine. New user-facing strings are tagged `FOUNDER-REVIEW`. No em dashes. No animation library.
