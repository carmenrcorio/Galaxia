## Homepage tagline is the locked three-beat line (branch `cursor/homepage-tagline-galaxy-beea`) — 2026-09-16

**Trigger**: F2 planted "Understand the people you love" as the homepage `<title>` and a close variant on metadata, store, and mobile. That line is retired. The founder locked `Your Life. Your People. Your Galaxy.`

`[CHANGED]` **Homepage `<title>`, Open Graph title, and Twitter title** (`apps/web/lib/homepage-seo.ts`, wired by `app/page.tsx`). Now `Your Life. Your People. Your Galaxy. | Galaxia`. FOUNDER-REVIEW.

`[CHANGED]` **Homepage meta description, og:description, and twitter:description.** The three locked clauses stay intact at the front of the existing computes-a-real-chart sentence, so layer-two astrology vocabulary (`birth chart`, `Real astrology`) remains. FOUNDER-REVIEW.

`[DECISION]` **SoftwareApplication JSON-LD `name` stays `Galaxia`.** It did not duplicate the old title. JSON-LD `description` stays the accurate computes-a-real-chart sentence (`HOMEPAGE_JSON_LD_DESCRIPTION`) and does not take the tagline prefix, because a slogan at the start of schema.org copy reads awkwardly. Metadata and JSON-LD description are now allowed to differ on that prefix only.

`[CHANGED]` **Hero eyebrow capitalization** in `apps/web/components/marketing/hero.tsx` to the locked Title Case. CSS `.eyebrow` still uppercases it, so the rendered line is unchanged. The H1 pairing ("Every app like this is about you" / "This one is about them") is already gone; the current H1 ("Better understand the people in your life") is untouched pending founder review. FOUNDER-REVIEW.

`[CHANGED]` **Play Store short description** (`content/store/play-store.md`) and **mobile public sign-in lede** (`apps/mobile/app/index.tsx`) to lead with the locked line. FOUNDER-REVIEW.

`[CHANGED]` **`apps/web/public/og-image.png`.** The static 1200x630 share card still painted the retired line. Regenerated with the locked tagline as the main sentence, same violet field, gold wordmark, and the inner astrology subline.

`[OPEN]` **Hero H1** ("Better understand the people in your life") is a close paraphrase of the retired title. The founder's instruction named the title specifically. Left in place.

`[OPEN]` **iOS App Store subtitle** remains "Understand who you love" (`content/store/app-store.md`). The locked line is 37 characters and the subtitle cap is 30.

`[OPEN]` **Paid social primary text**, OG/Twitter image alt ("Galaxia: astrology for the people you love"), footer/email closer ("The people you love, written in the stars."), Why Galaxia H2 ("Astrology forgot the people you love."), and `design/galaxia-pricing-copy.md` one-sentence pitch still use related phrasing, not the locked line.

No em dashes. Every new user-facing string tagged FOUNDER-REVIEW.
