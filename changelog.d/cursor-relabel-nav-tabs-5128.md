## Relabel marketing nav and person-profile tabs (branch `cursor/relabel-nav-tabs-5128`) — 2026-09-14

**Trigger**: Nav and in-app tab labels still used product and astrology vocabulary that blocked new users. The founder approved a relabel so the chrome speaks in outcomes, while routes, titles, and astrology terms stay where they already were.

`[CHANGED]` **Marketing nav, footer, app-nav free-chart item, and teaser CTAs.** Visible labels only. Hrefs, H1s, metadata titles, JSON-LD names, and the sitemap are unchanged by this relabel. `/why-galaxia` reads How it works, `/generations` Your people, `/meet-vela` Ask Vela, `/chart` Free chart. Pricing, Blog, Log in, and the signup CTA are untouched. Footer also keeps `/for-work` (For work) and `/press` from main.

`[CHANGED]` **Person-profile tab strip (web) and matching mobile card titles.** Active today → Right now, Big three → What they need, Placements → How they are wired, Aspects → Where they pull, Houses → Where it shows up, Generational → Their generation, Record → Your record, Vela → Ask about them, Past chats → Earlier answers, Wheel → Chart wheel. Anchor ids stay on the old vocabulary (`#placements`, `#aspects`, and the rest).

`[ADDED]` **Astrology term as a quiet in-section subhead** (`ChartVocabSubhead` / `PERSON_TAB_VOCAB`) wherever a tab was renamed away from that term, so a reader who knows the chart vocabulary is never lost and a reader who does not is never blocked. FOUNDER-REVIEW on every new string. No em dashes. No route changes.

`[DECISION]` **Tab order is unchanged.** `/for-work` stays footer-only (main already shipped the page). Homepage teaser H3s stay Why Galaxia / Generations / Meet Vela so those page names remain on `/`. Chip chrome uses the approved outer labels; Wheel / Placements / Aspects / Houses stay as `PERSON_TAB_VOCAB` subheads (voice-layers layer two).
