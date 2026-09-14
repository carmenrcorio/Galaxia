## AGENTS.md test counts match today's `pnpm test` (branch `cursor/agents-md-test-counts-32bf`) — 2026-09-14

**Trigger**: `AGENTS.md` still listed `@galaxia/astro` at 33 tests and `@galaxia/vela` at 4, and implied those were the only real suites. A root `pnpm test` on this branch measured much larger coverage.

`[FIXED]` **Documented test counts now match the suite.** Measured Vitest totals (all passing): `@galaxia/web` 917, `@galaxia/astro` 308, `@galaxia/core` 177, `@galaxia/mobile` 76, `@galaxia/vela` 28. `@galaxia/ui` remains a placeholder (`ui tests pending`). The counts are recorded as a floor: a later run that reports materially fewer tests is a signal that something was removed, not a pass.
