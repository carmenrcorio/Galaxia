## Collapsed "Why this reading" derivations on web compare and profile (branch `cursor/why-reading-derivation-0df1`) — 2026-10-02

**Trigger**: Readers asked how curated insights connect to computed chart facts. v1 adds a collapsed derivation line on approved surfaces only, built from data already on screen, with no guesswork when provenance is missing.

`[ADDED]` **Shared `WhyThisReading` component** (`apps/web/components/why-this-reading.tsx`) with FOUNDER-REVIEW strings, 14px minimum text, 44px touch targets, `aria-expanded`, reduced-motion-safe styling, and a link to `/methodology`. Vercel Analytics event `why_reading_opened` sends `insight_type` only.

`[ADDED]` **Derivation formatters** (`apps/web/lib/why-reading.ts`) for cross-chart aspects, natal placements and aspects, generational planet-sign facts, element-balance counts, chart patterns, house overlays, and first-run need lines.

`[CHANGED]` **Web surfaces in v1**: Compare flows/catches (rows, detail, framing via `.aspect`), Quick Check aspect rows, platonic watch line when the Mercury-aspect branch fired, generational cards, flip cards, person profile placements/key aspects/chart patterns, element balance, `/app/compare` house overlays, first-run and single share need blocks, and compare share snapshots mirroring live compare derivations.

`[CHANGED]` **Quick Compare GuidancePerson parity** (separate commit): `/chart/compare` now passes `mercury` and `saturn` signs into `whatTheyNeed()` like `/app/compare`. Relation types whose copy can change: siblings, friends, parent-child, colleagues, manager-report, mentor-mentee (when those signs are present on the chart).

`[OPEN]` **Not in v1**: "Your dynamic" score rows and "What X needs from you" cards (no provenance metadata yet), sign metadata cards, Vela, Groups, and mobile. A follow-up will add structured provenance from `@galaxia/astro` for scores and `whatTheyNeed()`.
