## Chiron synastry Batch 01 review workflow (branch `cursor/chiron-synastry-batch01-review-bd4e`) — 2026-10-02

**Trigger:** Founder approved Phase 0 diagnosis with a new batch plan: Chiron synastry first (55 cells), then Chiron placements, then natal cells in frequency order. Review happens in `docs/readings-review/`; approved copy applies via `pnpm readings:apply`, not FOUNDER-REVIEW tags in code.

`[ADDED]` **`docs/readings-review/batch-01.md`** — 55 Chiron synastry drafts (11 bodies × 5 majors), between-you voice, 12 rows flagged `[CONTESTED]` where traditions disagree. No **Approve:** yes yet; nothing shipped to `SYNASTRY_PAIR`.

`[ADDED]` **`pnpm readings:apply`** (`scripts/readings-apply.mjs`, `--dry-run`) — writes only approved rows into `synastry-interpretations.ts`, then runs `@galaxia/astro` tests.

`[ADDED]` **`packages/astro/src/reading-coverage.ts`** — `chironSynastryCoverage()`, `interpretationLibraryCoverageSummary()` as the single source for counts.

`[CHANGED]` **`/methodology`** — new “Curated interpretation library” section; counts from `methodologyInterpretationCoverageLines()` (same source as CI).

`[CHANGED]` **Coverage tests** — natal and Chiron synastry counts derived from live tables, not hardcoded tallies.
