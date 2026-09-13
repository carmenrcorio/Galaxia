## Compare uses the full generational call-out (branch `cursor/compare-generational-section-732c`) — 2026-09-13

**Trigger**: `/app/compare` and mobile Compare painted a compact "Fault line" strip plus an `ancestralHeadline` that repeated `generational.theme` (`This connection spans different eras. The generational layer is the headline. ${theme}`). Quick Compare and share snapshots already used the curated per-planet `GenerationalSection`.

`[FIXED]` **Web `/app/compare` now mounts the shared `GenerationalSection`.** Same invocation as `/chart/compare`: `<GenerationalSection generational={result.generational} />`. The inline compact call-out, `ancestralHeadline` construction, and the duplicate "spans different eras" string are gone. Every relation type this route offers (partners, siblings, friends, parent-child, ancestor) uses that one path; the section keys off shared/diverged placements, not relation type. `GenerationalSection`, `GEN_PLANET_FRAMES`, and `GEN_PLACEMENTS` are unchanged.

`[FIXED]` **Mobile Compare no longer duplicates `generational.theme`.** There is no native per-planet card that consumes `GEN_PLANET_FRAMES` (profile uses `describeGenerationalArchetype`; groups uses the compact Fault-line summary). A full RN `GenerationalSection` is a separate port. This change only removes `ancestralHeadline` so the duplicate headline string cannot render.

`[OPEN]` **Mobile per-planet generational cards.** Port `GenerationalSection` to React Native (lookup via `genHeadline` / `genPlacement` / `genFrame`, no new copy) and replace the remaining compact shared-sky / fault-line summary on `apps/mobile/app/(app)/compare.tsx`.
