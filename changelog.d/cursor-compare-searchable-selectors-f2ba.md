## Compare page searchable person selectors (branch `cursor/compare-searchable-selectors-f2ba`) — 2026-09-15

**Trigger**: Compare rendered every person twice as pill grids plus the full add-person form, so a 50-person constellation buried the actual job of the page.

`[CHANGED]` `/app/compare` person selection is two searchable fields (sheet on small viewports, popover from 720px). The options list scrolls inside a fixed-height container, so page height no longer grows with the constellation. Relationship type is derived from stored `people.relation` tags via `suggestCompareRelationType` and shown as a line with Change; Change reveals the existing pill row. Unmapped pairs show that pill row with no selection. Inline add-person is gone; a text link goes to `/app/add-person` and returns with the new person selected in the empty slot.

`[CHANGED]` `SELF_OTHER_TO_COMPARE` now maps first-run `mother` / `father` and picker `grandchild` onto `parent-child`. `grandparent`, extended family, `ex`, `acquaintance`, and `other` stay unmapped so Compare does not fabricate a pair frame. Synastry math, interpretation selection, and `isMinorForSafety` gating are unchanged.

`[OPEN]` Expo Compare (`apps/mobile/app/(app)/compare.tsx`) still uses dual pill grids and the always-visible 8-type row. Out of scope for this branch; follow-up pass needed so web and mobile do not stay diverged.
