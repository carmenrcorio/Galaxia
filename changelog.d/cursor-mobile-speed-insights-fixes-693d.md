## Mobile Speed Insights (INP / CLS / signup) — branch `cursor/mobile-speed-insights-fixes-693d`

**Trigger**: Vercel Speed Insights mobile RES ~69 with INP 472ms, CLS 0.19, and `/signup` at RES 51.

`[FIXED]` **Blog sticky CTA** keeps a fixed bottom slot (`article-sticky-cta--off`) instead of unmounting, so the bar toggles with opacity/transform only (mobile CLS).

`[FIXED]` **Signup** matches login shell: `MarketingNavShell` on `/signup`, reserved `auth-form-feedback` on signup/login forms, deferred `signup_started` analytics and dynamic import of timezone backfill after account creation (lighter main-thread work on first paint).

`[CHANGED]` **`CosmicBackground`** paints one static frame immediately, then starts the RAF loop after `requestIdleCallback` (or first scroll/pointer) so marketing pages defer starfield animation past first interaction window.

`[CHANGED]` **`RevealObserver`** attaches after idle so scroll-reveal setup does not compete with hydration.

`[CHANGED]` **Lighthouse production workflow** audits `/signup` and `/login`; `docs/performance.md` lists the same URLs.
