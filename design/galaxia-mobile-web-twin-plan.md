# Galaxia — Mobile as twin of the web app

**Status: FOUNDER DECISIONS LOCKED (2026-09-17). Spec is the build order. No product code in this file.**

This is the spec for finishing `apps/mobile` so it is the same product as the signed-in web app (`apps/web/app/app/**`), not a thinner companion. Per `ENGINEERING.md` §10: the spec is finalized before the build starts. Carmen locked D1–D5 on 2026-09-17 (see §7). Implementation starts at **Phase 0: Expo upgrade to current SDK**, not at Skia on SDK 51.

Cite this file and the named components. Do not describe the work in prose when a reference exists.

---

## 0. Read this first

**The web app is the perfected product.** `README.md` still calls `apps/web` “marketing + account landing.” That is outdated. The signed-in product lives at `/app`, `/welcome`, `/subscribe`, `/account`, plus connect/invite/share. Marketing, blog, admin, and the public `/chart` funnel stay on web.

**The mobile app is not a scaffold.** It is a real Expo Router client on the same Supabase project, sharing `@galaxia/astro` and `@galaxia/core`. Auth, entitlement (`hasAccess`), Compare, Groups, Vela, Moment, This Week, onboarding, and most of Home already talk to production tables. The gap is **depth and craft**, not missing routes.

**Do not wrap the Next.js app in a WebView.** That would mash marketing + product, fight cookie vs native session, and fail App Store review. Twin means same engine, same record, same voice, same screens — native renderers.

**Do not modify without explicit approval** (`ENGINEERING.md` §2): Vercel project settings, root `.npmrc`, `apps/web/next.config.mjs` core config, applied `supabase/migrations/*`. This work lives in `apps/mobile`, shared packages, and (sparingly) web copy that still says “coming soon.”

**Cloud Agent cannot prove native UI.** No iOS/Android simulator. Expo web does not render in this monorepo (`AGENTS.md`: broken bundle URL + Metro `@opentelemetry/api`). Mobile verification here is install + `pnpm --filter @galaxia/mobile typecheck` + Vitest + Metro boots. Device proof is Carmen (or EAS preview) after each slice.

---

## 1. What “twin” means

Three layers. Product twin and visual twin are both load-bearing for 1.0. Native chrome (tabs, share, push) may differ. Brand tone, type, colour, and constellation fidelity may not.

### 1.1 Product twin (must)

Same account, same `profiles.id`, same people/charts/notes/threads. Same `@galaxia/astro` facts. Same `@galaxia/core` `hasAccess` and `isMinorForSafety`. Same voice layers (`design/galaxia-voice-layers.md`). Same honesty rules (`ENGINEERING.md` §8, §12, §13). Same care gates (`packages/core/src/person-care.ts`).

A chart computed on web and opened on mobile must be the same chart. A person added on mobile must appear on the web constellation, including `custom_position` if set.

### 1.2 Visual twin (load-bearing)

The web signed-in shell is the material source of truth: `CosmicBackground` in `apps/web/app/app/layout.tsx`, glass cards, Fraunces + Inter, gold hairlines, natal `ChartWheel` (`apps/web/components/chart-wheel.tsx`, port of `design/reference/galaxia.jsx` `Wheel()`), living constellation canvas on `/app`. Tokens live in `apps/web/app/globals.css` `:root`, copied from `design/reference/galaxia-landing-v2.html`.

**Locked:** mobile ships the same faces (Fraunces, Inter), the same tokens, the same glass recipe, and the same brand tone/vibe as web. Forever. A “system font, close enough” mobile skin is a defect. `@galaxia/ui` must match web `:root`, not the other way around.

Mobile today: `@galaxia/ui` tokens only, system fonts, no starfield, constellation as a glance `View` card, chart wheel is a labeled placeholder. Tokens themselves have drifted from the landing:

| Token | Web `globals.css` | `@galaxia/ui` |
| --- | --- | --- |
| ink | `#0a0717` | `#191331` |

That mismatch is why mobile reads as a different night sky even before the missing canvas.

### 1.3 Native-appropriate (chrome only)

Bottom tabs, safe areas, system share sheet, push, permission prompts, App Store account-deletion rule. Do not port the web top `AppNav` strip that also dumps Blog / Free chart into the product. Mobile nav is **Home, Compare, Groups, Vela, Settings**. Moment and add-person are actions on Home / person, not tabs.

These differences are input and platform. They are not a license to flatten the sky, drop parallax, or substitute Inter-only type.

Public marketing, blog, glossary, admin, SEO `/chart` stay web. Mobile may deep-link out to the site for those.

---

## 2. Current state (verified in repo, 2026-09-17)

### 2.1 Runtime

- Expo SDK 51, React Native 0.74, expo-router 3, scheme `galaxia`, bundle `com.galaxia.app`
- EAS project id present in `apps/mobile/app.json`
- Env: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_SITE_URL` (no fabricated defaults; Metro inlines `process.env.EXPO_PUBLIC_*` as literals — see `apps/mobile/src/lib/env.ts`)
- Tests: Vitest wiring/parity suite (91 tests as of this research). No RN renderer tests. No device e2e.

### 2.2 Route map

| Product surface | Web | Mobile | Twin status |
| --- | --- | --- | --- |
| Auth / COPPA signup | `/login` `/signup` → `/api/auth/signup` | `/` → same signup route | Product twin |
| Entitlement gate | middleware `hasAccess` | `(app)/_layout.tsx` + `authed-route-gate.ts` | Product twin |
| Paywall | `/subscribe` RevenueCat Web Billing | `/subscribe` opens web URL | Handoff only |
| First run | `/welcome` `FirstRunFlow` | `/onboarding` (not forced) | Partial |
| Home / constellation | `/app` ~2144 lines, dual canvas | `/home` glance Views + `galaxyGeometry` | Data twin, visual not |
| Add person | `/app/add-person` + welcome | `/onboarding` | Product twin, IA different |
| Person | `/app/person/[id]` ~1819 | `/profile/[personId]` | Partial; wheel stub; no Today group |
| Compare | `/app/compare` | `/compare` | Near product twin |
| Groups | `/app/groups` | `/groups` | Near product twin |
| Vela | `/app/vela` + `vela-chat` | `/vela` → same edge fn | Product twin; no `@galaxia/vela` client helpers |
| The Moment | `/app/moment` | `/moment` | Product twin |
| This Week | `/app/this-week` | `/this-week` | Product twin |
| Settings | house system, emails, letter, alerts, connect, share, support, billing | alerts + sub readout + lists | Thin |
| Account / export / delete | `/account` `/account/data` | missing | Gap (Apple will require in-app delete) |
| Remembrance / honor / memorial | person + galaxy | `passed_at` gates only | Gap |
| Relationship edges | `relationship-edges.tsx` | missing UI | Gap |
| Connect invite | button + `/connect/[token]` + pending list | ask-birth-data only | Gap |
| Share snapshot | `/s/[token]` + image export | can build web URLs | Gap |
| Chart wheel / bi-wheel | `chart-wheel.tsx` | **“Wheel placeholder / SVG wheel component next slice”** | Stub |
| Cosmic atmosphere | `cosmic-background.tsx` | none | Missing |
| Custom seats | `people.custom_position` on web canvas | geometry helpers exist; home does not persist drag | Gap |
| Push | cron `relational-transit-push` | register token; **untested on device**; no tap → route | Partial |
| Deep links | `/r/[slug]` → `galaxia://` “coming soon” | scheme exists; no universal links config | Incomplete |

### 2.3 What mobile already got right (protect)

Do not reimplement these. They are the reason the app can become a twin instead of a rewrite.

- `@galaxia/astro` natal / synastry / nudges / moment / cohort / precision honesty
- `@galaxia/core` `hasAccess`, minor safety, `peopleForTodaySky`, person-care labels, galaxy seats, timeouts
- Signup through `/api/auth/signup` with age confirmation (`apps/mobile/src/lib/signup.ts`)
- Route lockout: unauthed → `/`, authed without access → `/subscribe` (`authed-route-gate.ts`)
- House system **read** from `profiles.house_system` on persist (`src/lib/house-system.ts`) — Settings still cannot **write** it
- Deferred birth (`precision: none`), ask-them invite, Open-Meteo places
- Durable `person_daily_nudges` upsert with `ignoreDuplicates: true` (byte-identical to web)
- Relational transit preference + This Week feed consuming cron-written rows
- Vela streaming to `vela-chat` with rate-limit body rendering
- Offline home cache (`src/lib/cache.ts`)
- `prefers-reduced-motion` via `AccessibilityProvider`
- Wiring tests that fail if someone reimplements safety or house system locally

### 2.4 What is actively wrong (ship blockers, not polish)

1. **Free / Galaxia+ copy is still on screen.** Entitlement is the trial/`hasAccess` model. Shims in `entitlement-provider.tsx` keep compiling old UI. Home, onboarding, compare, groups, vela still sell a plan that does not exist. This is the same class of lie the 9 July audit called the conversion killer — now on mobile.
2. **Chart wheel is a stub.** Person profile admits it in user-visible copy.
3. **Constellation is a glance, not the moat.** Web `/app` is a living map (rings, honor lines, relation lines, drag, memorial glyphs). Mobile draws seated dots in a card; nodes are not the product.
4. **Settings cannot change house system.** Mobile *reads* the preference and computes with it, but the only writer is web Settings. A mobile-only user cannot pick Whole Sign / Equal / Placidus.
5. **Person “Today” group is intentionally omitted** (`profile/[personId].tsx`: “Mobile has no daily-nudge / Vela Now group”). Web puts Right now + Ask about them above the tab strip (`isTodaySection` in `person-care.ts`). Twin means those cards exist on mobile too.
6. **Stale marketing:** `/download` and `/r/[slug]` still say native apps are coming soon.

---

## 3. Shared vs native (architecture)

### 3.1 Keep server-side (mobile consumes)

Do not rebuild in the app:

- RevenueCat webhook (`POST /api/webhooks/revenuecat`) — **only writer of paid status**
- Cron: nudge-compute/send, relational-transit-scan/push, constellation letter, trial emails
- `supabase/functions/vela-chat`
- Share token pages, connect accept, invite birth-data
- Account export/delete APIs (mobile should call them, not reimplement purge SQL)

### 3.2 Keep in packages (logic, not React)

Already: `@galaxia/astro`, `@galaxia/core`.

Extract next, so web and mobile cannot drift:

- **Wheel geometry + glyph maps.** Today they live in `apps/web/lib/design.ts` + `apps/web/components/chart-wheel.tsx` (DOM SVG, CSS variables). Move pure geometry, `SIGN_GLYPH`, `BODY_GLYPH`, element colours into `@galaxia/core` or a tiny `@galaxia/chart-view` that imports no `react-dom`. Web keeps an SVG renderer; mobile gets `react-native-svg`. Same numbers, two paint paths.
- **Glass / type tokens.** Align `@galaxia/ui` to `apps/web/app/globals.css` `:root` (ink `#0a0717`, gold hairline, radii 22, Fraunces scale). Web already has the recipe in `design/galaxia-design-parity-spec.md`.
- **Vela client helpers.** Mobile talks to the edge function by hand; web uses `@galaxia/vela` parse/crisis. Import the package on mobile so crisis + reply parse cannot diverge.

### 3.3 Native paint (do not share the web components)

These are HTML Canvas / DOM / CSS. Port the *behavior*, not the file:

| Web | Native approach |
| --- | --- |
| `CosmicBackground` (`apps/web/components/cosmic-background.tsx`) | Current `@shopify/react-native-skia` after the SDK 57 upgrade. Same three parallax layers, same density math, `prefers-reduced-motion` = one static frame. Prove FPS on device, not in this VM. |
| `/app` constellation `paintFrame` | Skia using `galaxyGeometry` / `effectiveSeat` / `custom_position` from `@galaxia/core`. Tap → `/profile/[id]`. Honor + relation lines. Full visual fidelity — not a glance card, not a cheaper layer set as the product. Drag follows once playback is right (web already writes `people.custom_position`). |
| `ChartWheel` | `react-native-svg`. Reference: `design/reference/galaxia.jsx` `Wheel()`, then the web component. Bi-wheel on Compare. |
| Glass cards, pills, chips | RN primitives from aligned tokens. Use Skia / `expo-blur` to get the landing blur, not a flat tinted rectangle. |
| Fraunces / Inter | `expo-font` + the same files web uses. System fonts are a defect. |
| Chart PNG/PDF export | Out of 1.0 unless cheap via Skia snapshot. Web keeps `html-to-image`. |

**Do not introduce a shared React Native Web component library in the first slice.** `@galaxia/ui` is tokens. Building a cross-platform component kit while also porting the galaxy is how this product got three versions of one screen.

### 3.4 Nav chrome

Replace the home Link-pill dump (Onboarding · My profile · Compare · …) with Expo Router tabs:

- Home → constellation + This Week + Today + add person + moment
- Compare
- Groups
- Vela
- Settings (includes account, billing handoff, house system)

Profile, moment, onboarding/add-person, subscribe stay stack screens above tabs.

---

## 4. Risks

### 4.1 App Store billing (highest business risk)

Web purchases use RevenueCat **Web Billing** (`@revenuecat/purchases-js`) only. Mobile subscribe opens the website. Apple 3.1.1 generally requires IAP for digital subscriptions sold in-app. Reader-app exception (3.1.3) can allow *account login* and access to content purchased on the web, if the app does not run a purchase flow.

**If `/subscribe` is a store-style paywall that sends users to a web checkout, review can reject the binary.** Founder decision in §7. Native IAP is a separate RevenueCat *iOS/Android app* + `appl_`/`goog_` keys (`docs/revenuecat-billing-mode-checklist.md`). Do not put a mobile SDK key in `NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY`. Do not change `hasAccess`.

### 4.2 Account deletion (App Store)

Guideline 5.1.1(v): in-app account deletion. Web has `/account/data`. Mobile has nothing. A 1.0 that only says “delete on the web” is a rejection risk.

### 4.3 Cannot verify in Cloud Agent

Any agent that reports “the constellation looks right” from this VM is fabricating. Require EAS preview + Carmen’s device for visual slices. Agent Definition of Done for mobile: typecheck + tests + Metro boot + **explicit “device unverified.”**

### 4.4 Expo SDK 51 is a dead end for this constellation

Current `@shopify/react-native-skia` requires `react-native >= 0.79` and `react >= 19`. SDK 51 is RN 0.74 / React 18. The 51 path is old Skia `1.12.4`, which is the degraded galaxy we just ruled out. Expo’s current SDK (docs, 2026-09) is **57** (RN 0.86, React 19.2). SDK 51 is deprecated; Expo Go only tracks current.

**Locked: upgrade to SDK 57 before any Skia work.** Do not spike Skia on 51. Building the galaxy on 51 and upgrading later means rewriting the paint path.

This is a dedicated phase, not mixed with fonts or the wheel. See §8 Phase 0.

### 4.4a Hoisted React 19 will touch web

`.npmrc` `node-linker=hoisted` must not change (`ENGINEERING.md` §2). Mobile on SDK 53+ needs React 19. That hoist can pull `apps/web` off React 18.3. Next.js 16 already in the repo supports React 19 (Solito has run Next 16 + React 19 + Expo 54). The SDK 53 step therefore includes `apps/web` React 19 and a full `pnpm --filter @galaxia/web test` + typecheck gate. Do not touch `next.config.mjs` core config. If web breaks, fix the React bump — do not pin mobile to 18.

### 4.5 Metro / `@opentelemetry/api`

`@supabase/supabase-js` lazy-imports OpenTelemetry. Next ignores it; Metro tries to resolve it. Expo web is already broken. Native builds may be fine; if a release bundle fails, pin or stub that import — do not “fix” by un-hoisting `.npmrc`.

### 4.6 Constellation performance (fidelity is the product)

Web already measures 375px FPS (`AGENTS.md` galaxy bar: this pass held ~50–60fps) and has an EMA frame-budget that can drop the far starfield layer. That emergency valve is crash-prevention, not a design.

**Locked: the phone constellation is the same living map.** No glance-card product, no “Android gets fewer layers.” Hold smoothness by using current Skia + New Architecture (required from SDK 55+), not by shipping a cheaper sky. If a device cannot hold the full field, that is a bug to fix in the paint loop (batching, DPR cap, same density formula as web), not a product fork. `prefers-reduced-motion` still freezes to one static frame.

### 4.7 Twin-by-copy-paste

The person page on web is ~1800 lines of client React. Copying it into RN will fork interpretation copy, safety, and precision flags. Port **section by section** behind `PERSON_TAB_LABEL` / `buildPersonPageGroups`. If a section exists on web and not mobile, that is a listed gap, not a surprise.

### 4.8 Push without deep links

Tokens upsert to `push_tokens`; cron can send. Tapping a notification currently does nothing useful. Shipping “alerts” that open the wrong screen is worse than no alerts.

### 4.9 Design token drift

Two ink colours. If we paint a Skia sky with `#191331` while web is `#0a0717`, the apps will never read as twins. Align tokens before atmosphere.

### 4.10 Connect / share without universal links

`galaxia://` exists. Associated Domains / App Links do not. Recipients of `/connect/[token]` and `/s/[token]` stay on web until that is configured. That is acceptable for 1.0 if Connect UI exists in-app and web accept still works.

---

## 5. What remains (priority)

Ordered by “stops us being a twin or being allowed in the store,” not by visual fun.

**P0 — stop lying / store-minimum**

1. Delete Free/Galaxia+ remnant copy and entitlement shims; trial/`hasAccess` language only
2. House system picker on Settings (writer to `profiles.house_system`)
3. In-app account deletion + export calling existing web/Supabase purge APIs
4. Founder billing decision implemented (reader-app login vs native IAP)
5. Loading / empty / error on every mobile async surface (`ENGINEERING.md` §18) — several screens are already close

**P1 — the two images that make it Galaxia**

6. Align tokens + Fraunces/Inter + glass recipe
7. `CosmicBackground` native port in the authed shell
8. Real `ChartWheel` (natal + Compare bi-wheel)
9. Bottom tabs

**P2 — the moat**

10. Living constellation: full-bleed, tappable, honor/relation lines, `custom_position` playback (drag can follow). Same visual weight as web.
11. Person Today group (Right now + Ask about them)
12. Edit person (birth, relation, memorial fields) — today notes + delete only
13. Remembrance space + memorial timeline + honor (reuse core care gates; port UI)

**P3 — growth and habit**

14. Connect invite send/pending (web RPCs already exist)
15. Relationship edges UI
16. Push tap → `/this-week` or person
17. First-run forced like `/welcome` (`profiles.onboarding_*`)
18. Universal links; rewrite `/download` and `/r/[slug]` when TestFlight/Play URLs exist

**P4 — after 1.0**

19. Native IAP (D1 is web-manage for 1.0)
20. Chart image export
21. Device-verified push permissions UX
22. Groups family-pattern share card visuals

---

## 6. How to keep them twins as we build

1. **One engine.** Never compute a placement in a screen file. If web grew a helper, mobile imports it.
2. **One copy source.** New user-visible strings from `@galaxia/core` or a shared copy module. Tag `FOUNDER-REVIEW`. No em dashes (`ENGINEERING.md` §15).
3. **Parity tests stay wiring tests** until we have a device farm: read the screen source and assert it calls the shared helper, same as `mobile-safety-parity.test.ts` and `mobile-precision-house-system-parity.test.ts`.
4. **One vertical slice per PR.** First merged slice must be installable on a phone and obviously better, not a half-migrated nav.
5. **Web is not frozen, but do not “improve” web under a mobile PR** unless a shared package requires it (glyph extraction).
6. **Brand is not a phase-optional.** Fraunces, Inter, web tokens, glass, voice layers. Every slice that renders UI uses them. No “we’ll match type later.”
7. **Nothing internal ships** (`ENGINEERING.md` §7). The wheel placeholder text cannot survive a TestFlight build.
8. **One account graph.** People, charts, notes, billing, purge. Mobile never grows a second delete/export path.

---

## 7. Founder decisions (locked 2026-09-17)

Implementation PRs that contradict these are out of order.

**D1. Billing for mobile 1.0 — manage on the web.** Reader-app. Sign in, use the product, “Manage billing on the web.” No in-app purchase button, no store-style web-checkout CTA. `/subscribe` is a short explanation plus a Safari handoff that does not look like an App Store paywall. Stay inside Apple 3.1.3. Native IAP is after 1.0. `hasAccess` and the RevenueCat webhook stay the only paid-status writer.

**D2. Constellation — full-bleed living map, no product degradation.** Same seats, honor/relation lines, parallax, visual weight as web `/app`. Not a glance card. Not a cheaper Android sky. Smoothness comes from current Skia + New Architecture, not from dropping layers as a feature. `prefers-reduced-motion` still freezes one frame.

**D3. Type and vibe — Fraunces, Inter, web tokens, brand tone. Always.** `@galaxia/ui` matches `apps/web/app/globals.css` `:root`. System fonts are a defect.

**D4. Upgrade Expo first. Do not spike Skia on SDK 51.** Target current SDK **57** (RN 0.86, React 19.2 as of Expo’s docs). Current Skia requires `react-native >= 0.79` and `react >= 19`; SDK 51 cannot run it. Incremental, because 51→57 crosses expo-router 3→current, React 18→19, and New Architecture (required from SDK 55). Suggested cuts:

1. **51 → 52** — expo-router 4 / React Navigation 7, still React 18. Isolates the router break.
2. **52 → 53** — React 19, New Architecture default, RN 0.79. This is the Skia unlock. Because `.npmrc` is hoisted and must not change, this PR also bumps `apps/web` to React 19 and gates on `pnpm --filter @galaxia/web test` + typecheck. Do not touch `next.config.mjs` core config.
3. **53 → 57** — once 53 is green. SDK 56 had a Hermes/reanimated memory regression; 57 is the documented fix. No Skia in these upgrade PRs.

**D5. Account delete/export — the existing APIs. One graph.** Mobile does not invent a second purge. It calls the same routes web already uses:

- Export: `GET /api/account/export` (`AccountDataPanel`)
- Delete: `POST /api/account/delete` with `{ confirmation: "delete" }` (`apps/web/app/api/account/delete/route.ts`)

That route is the canonical writer: typed confirmation, then `purge_own_account_data()` (SECURITY DEFINER, one transaction), then best-effort GoTrue `deleteUser`. Mobile authenticates with the user’s session against `EXPO_PUBLIC_SITE_URL`, uses the same `ACCOUNT_DELETE_COPY`, signs out locally after `{ ok: true }`. Direct client RPC to `purge_own_account_data` is not a parallel path.

---

## 8. Build sequence (after §7)

Each phase is one or more PRs. Definition of done still includes branch, PR, merge, and **device verification by a human** for UI phases (`ENGINEERING.md` §3 cannot mean Vercel for Expo).

### Phase 0 — Expo SDK 51 → 57 (blocking for Skia / atmosphere / constellation)

See D4. Milestone: `pnpm --filter @galaxia/mobile typecheck` and test floor hold; `@galaxia/web` typecheck + tests hold after the React 19 step; Metro boots; `expo-doctor` clean for the new SDK. Still no Skia. Still no visual twin. Native runtime is current.

### Phase 1 — Hygiene (no new native deps; can start once 52 is green, must not land Skia)

- Remove `tier` / Galaxia+ / Free-limit UI; use `hasAccess` + trial copy matching web Settings
- Settings: house system writer (`HOUSE_SYSTEM_OPTIONS` from `@galaxia/astro`)
- Daily nudge email + weekly letter prefs (same `profiles` columns)
- Support ticket insert (`support_requests`)
- Account export/delete via D5 routes
- Align `@galaxia/ui` ink/gold/radii to web `:root`
- Kill user-visible “Wheel placeholder”

Milestone: a trial user on a phone can change house system and delete their account through the same purge as web. Still ugly. No longer lying. One graph.

### Phase 2 — Shell twin

- `expo-font` Fraunces + Inter
- Authed `CosmicBackground` (current Skia, after Phase 0)
- Glass card / pill / chip primitives in `apps/mobile/src/components/` (token-driven; Skia/`expo-blur` for the landing blur)
- Expo tabs: Home, Compare, Groups, Vela, Settings
- Trial banner equivalent

Milestone: open the app next to `/app` on a laptop; the night sky and type match.

### Phase 3 — Wheel

- Extract glyphs + geometry to a shared package
- `react-native-svg` natal wheel on person
- Bi-wheel on Compare
- Precision honesty already on the profile stays

Milestone: Carmen’s chart on device matches `/app/person/[id]` wheel to the eye (signs in the right place; labels from `chart.houseSystem`).

### Phase 4 — Constellation (the moat)

- Full-bleed Home map from `galaxyGeometry` / `effectiveSeat`
- Tap node → profile
- Honor + relation line treatments from web (`ENGINEERING.md` §13)
- Playback of `custom_position`
- Reduced-motion freeze; device FPS in the PR (target: hold ~50–60fps at 375-class without dropping the product’s layers)

Milestone: the same galaxy on phone and laptop, seats stable across devices.

### Phase 5 — Person depth

- Today cards on profile
- `EditPerson` port (not a new data model)
- Remembrance / timeline / honor
- Relationship edges
- Connect invite send + pending list (accept can remain web)

### Phase 6 — Store

- D1 subscribe copy (manage on the web)
- Push response listener
- Associated Domains when URLs exist
- Rewrite `/download` and `/r/[slug]`
- Store screenshots from `content/store/*`
- EAS production + submit (`docs/ship-checklist.md`)

---

## 9. Verification (this environment)

| Check | Where |
| --- | --- |
| `pnpm --filter @galaxia/mobile typecheck` | Cloud Agent, every PR |
| `pnpm --filter @galaxia/mobile test` | Cloud Agent; floor is the current suite, never fewer |
| Metro boots | Cloud Agent; do not claim Expo web renders |
| Shared package tests if glyphs/geometry moved | `@galaxia/astro` / `@galaxia/core` |
| Web test + typecheck on the React 19 hoist | Required at the 52→53 cut |
| Device: wheel vs web, constellation seats, reduced-motion, house-system change, delete via `/api/account/delete` | Carmen / TestFlight — **required** for Phases 2–4 |
| Galaxy FPS at 375-class phone | Device; the Playwright 375px recipe in `AGENTS.md` is web-only |

Do not add a Playwright suite against Expo web until Metro’s bundle URL and `@opentelemetry/api` are actually fixed. That is a separate infra task, not a twin task.

---

## 10. What this plan does not do

- Rewrite web
- Change `hasAccess`
- Apply or edit production migrations unless a new column is truly required (none identified)
- Ship debug entitlements
- Treat `design/galaxia-constellation-connect-plan.md` header “unimplemented” as current — Connect **ships on web**; mobile is the laggard
- Invent a second astrology engine for RN
- Invent a second account purge
- Flatten the sky or type to “feel native”

Glass on Android is Skia / `expo-blur` in the landing’s recipe, not a flat tinted rectangle.

---

## 11. Immediate next three actions

1. Phase 0 PR: Expo SDK 51 → 52 (router only, still React 18). No Skia.
2. Hygiene (Phase 1) can follow once 52 is green: copy, house system, D5 delete/export.
3. On a phone, screenshot current `/home` and `/profile` next to web `/app` and `/app/person/[id]` so the shell twin has a before. The Cloud Agent cannot take that screenshot.
