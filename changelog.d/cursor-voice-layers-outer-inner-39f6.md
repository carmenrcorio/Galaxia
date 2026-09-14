## Two voice layers (branch `cursor/voice-layers-outer-inner-39f6`) — 2026-09-14

**Trigger**: Founder voice law. Outer copy was mixing method language into first-impression surfaces, and inner surfaces needed the real vocabulary kept (including Vela naming the aspect it reads).

`[DECISION]` **Two layers, never flattened.** Layer one (homepage above the fold, store listings, first ninety seconds of onboarding, email subjects, press, `/for-work`, paid social) leads with outcome. Astrology is not the first word. Galaxia is not described as an astrology app. Layer two (`/chart`, `/chart/compare`, the blog and both categories, Wheel / Placements / Aspects / Houses, page metadata and JSON-LD everywhere, homepage `#how`, Vela's answers) keeps natal, synastry, placements, aspects, houses, unapologetic. Never strip an astrology keyword from metadata. Never apologise. Never promise prediction. Source of truth: `design/galaxia-voice-layers.md`. Engineering rule: `ENGINEERING.md` §17. Gate: `apps/web/lib/voice-layers.test.ts`.

`[CHANGED]` **Homepage ATF** leads with "Understand the people you love. Then show up for them." How it works (`FeaturesSection`, `#how`) is back on `/` as layer two, with natal / synastry / houses vocabulary, and the Vela mock names Mars square Saturn. Title, meta description, OG, and SoftwareApplication JSON-LD still contain astrology.

`[ADDED]` **`/for-work` and `/press`**, plus committed App Store / Play Store listings and paid-social lines. Visible copy is layer one. Page metadata on the new routes keeps astrology keywords.

`[CHANGED]` **Onboarding (web + mobile) first ninety seconds** lead with outcome. Step 3 hands into natal / synastry / aspects. Vela's system prompt (package + `vela-chat` edge function) now requires naming the aspect it is reading.
