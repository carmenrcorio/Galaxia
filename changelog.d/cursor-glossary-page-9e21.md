## Public astrology glossary at `/glossary` (branch `cursor/glossary-page-9e21`) — 2026-09-15

**Trigger**: published posts already use natal, synastry, aspect, house, and placement vocabulary with no public page that defines those words in Galaxia's register. Search and in-post linking need a static `/glossary` with hash targets.

`[ADDED]` **`/glossary` is a static public page** (`apps/web/app/glossary/page.tsx` + `lib/glossary-terms.ts`). Title: "Astrology terms, plainly defined". Meta description under 155 characters. Alphabetical `h2` letter sections, each term an `h3` with `id="{term-slug}"`, 2-3 sentence definitions in the same register as the app aspect copy. Where a post covers the term in depth, "Read more: [title]" links to that slug. All definition copy is tagged `FOUNDER-REVIEW`. No em dashes. No "astrology is believed to" framing. No predictive language. WebPage JSON-LD via the shared `WebPageJsonLd` injector. `/glossary` is in `app/sitemap.ts` and the site footer.

`[DECISION]` **Term list from production posts, not from a canned textbook.** Query: `SELECT slug, body FROM public.posts WHERE status = 'published'` (10 published rows). Terms below appear in at least two distinct posts, except the closed-set completions noted. Saturn return and retrograde did not appear in the corpus and are omitted. Post counts and suggested read-more slugs:

| Term | Posts | Read more slug |
|---|---|---|
| Aspect | 8 | synastry-aspects-explained |
| Birth chart | 3 | sun-sign-not-personality |
| Birth time | 5 | reading-chart-of-someone-who-died |
| Compatibility score | 3 | compatibility-scores-wrong-question |
| Conjunction | 3 | synastry-aspects-explained |
| Flows and catches | 6 | synastry-chart-meaning |
| Generational astrology | 2 | nobody-has-your-grandmother |
| Horoscope | 3 | sun-sign-not-personality |
| House | 5 | sun-sign-not-personality |
| Jupiter | 2 | (none) |
| Mars | 6 | what-a-chart-cannot-tell-you |
| Mercury | 5 | synastry-aspects-explained |
| Moon | 10 | mothers-moon-sign-apology |
| Moon conjunct Moon | 2 | synastry-aspects-explained |
| Moon sign | 5 | mothers-moon-sign-apology |
| Moon square Saturn | 4 | moon-square-saturn-parent-child |
| Natal chart | 7 | what-a-chart-cannot-tell-you |
| Neptune | 1 (outer-planet set) | colleague-you-cannot-read |
| North Node | 1 (named in aspects post) | synastry-aspects-explained |
| Opposition | 3 | synastry-aspects-explained |
| Outer planets | 3 | colleague-you-cannot-read |
| Personal planets | 3 | colleague-you-cannot-read |
| Placement | 8 | sun-sign-not-personality |
| Pluto | 2 | colleague-you-cannot-read |
| Rising sign | 5 | reading-chart-of-someone-who-died |
| Saturn | 7 | moon-square-saturn-parent-child |
| Sextile | 1 (remaining major aspect) | synastry-aspects-explained |
| Square | 5 | synastry-aspects-explained |
| Sun | 6 | sun-sign-not-personality |
| Sun sign | 3 | sun-sign-not-personality |
| Synastry | 9 | synastry-chart-meaning |
| Transit | 2 | nobody-has-your-grandmother |
| Trine | 2 | synastry-aspects-explained |
| Uranus | 1 (outer-planet set) | colleague-you-cannot-read |
| Venus | 7 | what-a-chart-cannot-tell-you |

`[OPEN]` **Do not apply a posts-body migration yet.** No published post currently links to `/glossary#{term-slug}`. A first-occurrence wrap (`[term](/glossary#id)`) is proposed for founder review, not written as SQL. Prefer distinctive multi-word terms and technique words over planet-name lists (those become link soup). Skip heading-only hits. Skip the non-aspect "opposition for its own sake" in `colleague-you-cannot-read`. Suggested first prose hits, one per term per post, after skipping existing markdown links:

- `moon-square-saturn`: `moon-square-saturn-parent-child`, `synastry-aspects-explained`
- `moon-conjunct-moon`: `synastry-aspects-explained`
- `flows-and-catches`: `compatibility-scores-wrong-question`, `moon-square-saturn-parent-child`, `reading-chart-of-someone-who-died`, `synastry-aspects-explained`, `synastry-chart-meaning`
- `generational-astrology`: `nobody-has-your-grandmother`
- `compatibility-score`: `compatibility-scores-wrong-question`
- `personal-planets`: `colleague-you-cannot-read`, `compatibility-scores-wrong-question`, `synastry-aspects-explained`
- `outer-planets`: `colleague-you-cannot-read`, `reading-chart-of-someone-who-died`
- `natal-chart`: seven posts (all except the three that never say "natal chart")
- `birth-chart`: `nobody-has-your-grandmother`, `sun-sign-not-personality`, `synastry-chart-meaning`
- `moon-sign`: `compatibility-scores-wrong-question`, `moon-square-saturn-parent-child`, `mothers-moon-sign-apology`, `sun-sign-not-personality`
- `sun-sign`: `compatibility-scores-wrong-question`, `sun-sign-not-personality`, `what-a-chart-cannot-tell-you`
- `rising-sign`: `colleague-you-cannot-read`, `compatibility-scores-wrong-question`, `reading-chart-of-someone-who-died`, `synastry-chart-meaning`, `what-a-chart-cannot-tell-you`
- `birth-time`: `colleague-you-cannot-read`, `reading-chart-of-someone-who-died`, `what-a-chart-cannot-tell-you`
- `north-node`, `sextile`: `synastry-aspects-explained` only
- `synastry`, `aspect`, `placement`: high frequency; link the first running-prose mention that is not already an internal post link
- Planet names, `square`, `house`, `conjunction`/`conjunct`: high collision; founder should pick which first hits are worth wrapping

No `supabase/migrations/` file ships in this PR. ENGINEERING.md §2 and §16: a posts rewrite is a new migration after human approval, never an edit to an applied file, never a dashboard edit.
