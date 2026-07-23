## Landing conversion: Quick Chart hero entry + Edge earlier (branch `cursor/landing-conversion-quick-chart-545c`) — 2026-07-23

**Trigger**: Quick Chart is the strongest growth loop but lived only as a nav link; The Edge (generational layer) sat as section 4 of 7. Conversion pass surfaces both without inventing social proof.

`[ADDED]` **Hero Quick Chart mini-form** (`components/marketing/quick-chart-entry.tsx`). Name + month/day/year only (no full `BirthFields`, no place search). Framed as try-it-free / no signup. Hands off to `/chart?pr=date&m=&d=&y=` (+ optional `name`) and reuses the existing auto-run. Existing hero CTAs (signup + see how it works) stay.

`[ADDED]` **Optional `name` query param on `/chart`** into local React state only. Address-bar rewrite after compute uses birth params only (`birthQueryToSearchParams`), so `name` never stays in the URL.

`[CHANGED]` **Single-chart share HARD BOUNDARY.** `/chart` `createShareUrl` no longer sends `name`. `validateQuickSharePersistBody` for `kind: "single"` strips any smuggled `name` before persist. Copied link remains `/s/<token>` with no name and no birth params. Compare `nameA`/`nameB` unchanged. Vitest updated.

`[CHANGED]` **Section order on the marketing homepage.** `EdgeSection` (`#generations`) moves directly after `Hero`, before `WhySection`. Nav Generations link still works.

`[ADDED]` **`WhyNotSection`** — short "why not a horoscope app" contrast (real people vs daily horoscopes; real computed charts vs generated text; people you keep vs one-off readings). Names no competitors. All new copy marked `FOUNDER-REVIEW`.

`[ADDED]` **`SocialProofPlaceholder`** — clearly marked empty section for future real testimonials only. No quotes, ratings, review counts, or press invented.

`[DECISION]` All four "Illustrative example" captions and the Vela "An example of how Vela responds" caption left exactly as they were.
