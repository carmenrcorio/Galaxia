## Honest empty states, a11y, contrast, and /chart layout (branch `cursor/honest-empty-states-2862`) — 2026-09-11

**Trigger**: Silent `return null` on loading/empty sections, unlabeled canvases, unlabeled birth-date selects, mist2/ink2 contrast below AA, RelatedLinks above the /chart form, and a /app/family-compare stub that looked like a feature.

`[FIXED]` **Empty and loading sections now say something.** `RelationalTransitFeed`, `ChartGridSection`, `GenerationalMap`, `PairDynamicsSection`, and `SaveToGalaxyButton` no longer return `null` for loading/off/empty. Each state is a one-line FOUNDER-REVIEW string with a reason and (where empty) a next action.

`[FIXED]` **Decorative canvases are `aria-hidden="true"`.** CosmicBackground's starfield and HeroGraph's constellation are atmosphere, not data; they get no role/label.

`[FIXED]` **Birth date selects have `id` and `name`.** Month/day/year (and hour/minute) take a unique `idPrefix` so `/chart/compare` Person A/B do not collide. Chrome's form Issues flag is the reason.

`[FIXED]` **Body text on ink2 clears 4.5:1 without touching the footer pair.** Global `--mist2` stays `#8076a6` (4.79 on `--ink`). New `--mist2-on-ink2: #8278a7` measures 4.53:1 on `#16102e` and is used for `.pl-desc`. `.sign-chip__label` is 0.8125rem (13px).

`[CHANGED]` **/chart and /chart/compare put the compute form first.** RelatedLinks move below the form, and after the result when one exists, so the tool is the first thing on a phone.

`[CHANGED]` **`/app/family-compare` is a 308 in middleware to `/app/groups`.** The stub page is deleted so the path is not a fake feature.
