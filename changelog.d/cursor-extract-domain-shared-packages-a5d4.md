## Extract domain modules into shared packages (branch `cursor/extract-domain-shared-packages-a5d4`) — 2026-07-12

**Trigger**: Readiness assessment found ~3.5k LOC of safety-critical / domain logic living only in `apps/web/lib`, so mobile and web could drift. Foundation for later mobile safety fixes.

`[CHANGED]` **Move safety/domain modules from `apps/web/lib` into `@galaxia/core` and `@galaxia/astro` (hard cut, one source).** Pure refactor — file moves + import rewires; no behavior changes. Shared birth is the correct web timezone-aware implementation. Mobile safety bug fixes are a separate follow-up. Modules: `galaxy-orbit`, `person-care`, `honor-constellation`, remembrance logic, `birth`, `geocode`, house-system constants, `transits`, interpretation libraries, `compare-guidance`, `orderPair`, `vela-parse`.
