## Public-surface FOUNDER-REVIEW tags cleared (branch `cursor/founder-review-public-surfaces-5105`) — 2026-09-16

**Trigger**: Fifteen live `FOUNDER-REVIEW` tags on the homepage, Why section, footer, for-work copy, OG alts, blog metadata, homepage SEO, and the email closer. Tags added after PR #306 were surviving merge.

`[CHANGED]` **Approved and rewritten public copy (Carmen 2026-09-16).** Hero Gemini line is now two sentences. Why H2 is "Astrology is a language for understanding the people in your life." Homepage meta and JSON-LD descriptions use parentheses around the people list. Footer and email closer share `SITE_CLOSER`: "Better understand the people in your life." No em dashes. Tags removed; this table is the approval, so the strings are not re-tagged.

`[ADDED]` **`apps/web/lib/brand-copy.ts`** exports `SITE_OG_ALT` and `SITE_CLOSER`. Open Graph and Twitter image alts (site OG image, root layout, blog metadata, `/chart/compare` layout) point at `SITE_OG_ALT`. Footer and email `shell()` closer point at `SITE_CLOSER`.

`[ADDED]` **`pnpm founder-review:list`** (`scripts/founder-review-list.mjs`) prints every `FOUNDER-REVIEW` tag outside test files and a total. Always exits 0.

`[CHANGED]` **ENGINEERING.md §11.** New rule: FOUNDER-REVIEW tags do not reach main. Agents tag new user-visible strings while a PR is in review; once Carmen approves them, the agent removes those tags in a final commit before merge; `pnpm founder-review:list` must show no tags added by that PR.
