## Mobile as twin of the web app — research plan (branch `cursor/mobile-web-twin-plan-1b96`) — 2026-09-17

**Trigger**: The Expo app exists and already shares the engine and most `/app` routes, but it is not a visual or depth twin of the signed-in web product. Implementation was blocked until the gap was researched and sequenced.

`[ADDED]` **`design/galaxia-mobile-web-twin-plan.md`.** Inventory of web vs mobile, what to protect, remaining work, risks (App Store billing, account deletion, Cloud Agent cannot prove native UI), and a phased build. No product code in this change.

`[DECISION]` **Twin means same engine, same record, same voice, native paint — not a WebView of Next.js.** Marketing, blog, admin, and public `/chart` stay on web. Constellation geometry and chart math stay in `@galaxia/astro` / `@galaxia/core`; Canvas/SVG renderers are per platform.

`[OPEN]` **Founder decisions D1–D5 in that spec must be answered before implementation:** mobile 1.0 billing (reader-app vs native IAP), full-bleed constellation vs glance, fonts, Expo upgrade timing, in-app account deletion via existing purge APIs.
