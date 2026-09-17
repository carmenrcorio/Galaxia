## Mobile as twin of the web app — research plan (branch `cursor/mobile-web-twin-plan-1b96`) — 2026-09-17

**Trigger**: The Expo app exists and already shares the engine and most `/app` routes, but it is not a visual or depth twin of the signed-in web product. Implementation was blocked until the gap was researched and sequenced.

`[ADDED]` **`design/galaxia-mobile-web-twin-plan.md`.** Inventory of web vs mobile, what to protect, remaining work, risks, and a phased build. No product code in this change.

`[DECISION]` **Twin means same engine, same record, same voice, native paint — not a WebView of Next.js.** Marketing, blog, admin, and public `/chart` stay on web. Constellation geometry and chart math stay in `@galaxia/astro` / `@galaxia/core`; Canvas/SVG renderers are per platform.

`[DECISION]` **D1 — billing.** Mobile 1.0 is reader-app: manage billing on the web. No in-app purchase CTA. Native IAP is after 1.0. `hasAccess` unchanged.

`[DECISION]` **D2 — constellation.** Full-bleed living map, same visual weight as web. No glance-card product, no cheaper-layer Android fork. Smoothness from current Skia + New Architecture.

`[DECISION]` **D3 — type and vibe.** Fraunces, Inter, web tokens, brand tone. Always. `@galaxia/ui` matches `apps/web/app/globals.css`.

`[DECISION]` **D4 — Expo first.** Upgrade SDK 51 → 57 before any Skia. Current Skia needs RN >= 0.79 and React >= 19; 51 cannot run it. Incremental cuts: 51→52 (router), 52→53 (React 19 + New Arch + web React 19 hoist), 53→57. No Skia in upgrade PRs.

`[DECISION]` **D5 — one account graph.** Mobile delete/export call the existing web routes (`POST /api/account/delete`, `GET /api/account/export`), which run `purge_own_account_data`. No second purge path.
