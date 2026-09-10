## Groups page rework: relationship-intelligence dashboard (branch `cursor/groups-relationship-dashboard-c8b8`) — 2026-09-09

**Trigger**: `/app/groups` was a CRUD admin panel that buried Galaxia's strongest differentiator — generational fault lines across a family system — under an edit form, and surfaced the computed insight as one caption sentence and a raw data dump.

`[CHANGED]` **Information architecture inverted.** New top-to-bottom order: group selector → group hero → group reading → generational map → shared sky → fault lines → pair dynamics → "Manage group" accordion (closed by default, containing the former editor). Insight now leads; management is demoted to the bottom.

`[ADDED]` **`GroupSelector`** (`components/groups/group-selector.tsx`) — horizontally scrollable card row replacing the plain-text "Saved groups" list. Each card shows the group name, an overlapping avatar cluster (`InitialAvatar`, unchanged style), and a one-line signature (`groupSignatureLine`, e.g. "3 members · 2 Pluto signs · 1 fault line"). A trailing "+ New group" card replaces the old in-editor "new group" trigger.

`[ADDED]` **`GenerationalMap`** (`components/groups/generational-map.tsx`) — new band chart, one row per outer planet (Uranus/Neptune/Pluto), members placed as avatar dots at their sign position, clustering when signs are shared. Signs are reconstructed losslessly from the already-computed `cohortOverlay` result (`memberSignsFromOverlay`), never a second astrology derivation. A one-line summary underneath is derived from the same fault-line data (`generationalMapSummary`).

`[ADDED]` **`PairDynamicsSection`** (`components/groups/pair-dynamics-section.tsx`) — pair cards now lead with a plain-English sentence and a `FAULT LINE` / `SAME GENERATION` badge (`describePairHighlight`, parsed from the existing persisted `CohortPairHighlight.summary` string via `parsePairSummary` — the persisted shape is unchanged). Cards are clickable when both people resolve to an id, navigating to `/app/compare?a=<idA>&b=<idB>`.

`[ADDED]` **`ManageGroupAccordion`** (`components/groups/manage-group-accordion.tsx`) — the former editor, now a closed-by-default `<details>` disclosure. Group-kind pills get a filled active state (`.group-tag--selected`); member chips get a filled + checkmark selected state (`.group-member-chip--selected`); a "N members selected" count and a search/filter input (shown above 8 people) sit above the chip grid. "Generate cohort overlay" renamed to **"Generate group reading."**

`[ADDED]` **`lib/groups-copy.ts`** — pure, framework-free helper functions for every new sentence on the page (signature lines, fault-line interpretation, shared-sky partial-overlap copy, generational-map summary, pair-highlight presentation). Every function only phrases facts already present on the `CohortOverlaySnapshot` / `CohortPairHighlight` shapes computed by `@galaxia/astro` — nothing here invents a placement (ENGINEERING.md §12). 27 unit tests in `lib/groups-copy.test.ts`.

`[FIXED]` **Shared sky empty state.** "No full-group shared outer-planet signatures" (a dead end) is replaced by two states: partial overlaps when 2-of-N members share a planet sign (`sharedSkyPartialOverlaps` / `describePartialOverlap`), or an explanatory paragraph when there is truly no overlap at all (`SHARED_SKY_NO_OVERLAP_NOTE`).

`[FIXED]` **Fault lines** now open with an interpretive paragraph (`faultLinesInterpretation`) before the planet-by-planet list, and each planet row shows a static one-line domain gloss (`GEN_PLANET_MEANING`: Uranus = disruption/change, Neptune = idealism vs. disillusionment, Pluto = power/control/transformation) with the planet glyph (`BODY_GLYPH`) prominent in the header instead of a small square badge.

`[ADDED]` **`?b=<personId>` deep link on `/app/compare`** (`app/app/compare/page.tsx`) so a Groups pair card can pre-load an exact pairing, not just Person A. Falls back to the existing first-non-A pick when `b` is missing, invalid, or equal to `a`.

`[CHANGED]` **Terminology**: all user-facing "cohort" replaced with "group"/"reading" — `OWNED_DELETE_COPY.belowMinimumNotice` (`packages/core/src/owned-delete.ts`), the Groups-current-reading note body (`lib/groups-cohort.ts`, `app/api/groups/cohort/route.ts`), and the Record timeline label for `cohort_reading` notes (`app/app/person/[id]/page.tsx`, now "Saved group reading"). Internal variable/table/`kind` names (e.g. `cohort_reading`, `cohortOverlay`) are unchanged — not user-facing.

Untouched per spec: the `groups`/`group_members` data model, all Supabase queries, `InitialAvatar`'s style, the dark palette, Vela integration, and mobile responsiveness conventions.

Verified: `pnpm typecheck` and `pnpm test` pass across all packages (`lib/groups-copy.test.ts` adds 27 tests). Manually smoke-tested end-to-end against a live Supabase test account: created three people spanning three generations, created a group, and walked every new section (selector, hero, reading, generational map, shared sky, fault lines, pair dynamics with working `/app/compare` deep link, and the manage-group accordion) plus a page-wide "cohort" terminology sweep.
