## Restore the person-page relationship picker (branch `cursor/relationship-picker-f22d`) — 2026-09-15

**Trigger**: Phase 2 draws every declared `relationships` row on the galaxy. Nothing on the person page could create partner, family, friend, colleague, chosen, or other edges, so those lines could not actually appear. Remembrance stays on "who carries their light."

`[ADDED]` **Person-page picker (`RelationshipEdgesBox`).** Collapsed details on both the charted and no-chart person layouts. Choose another person and a bond type, list existing lines, remove one type at a time. Inserts use `buildRelationshipInsert` (canonical UUID order). Duplicate pairs are the unique constraint in either direction. Remembrance is not offered, listed, or deleted here.

`[ADDED]` **`partnerBondAllowed` / `buildRelationshipInsert` in `@galaxia/core`.** Partner is refused when either endpoint is a minor via `isMinorForSafety`. The type is not rewritten to family or other. Family, friend, colleague, chosen, and other remain allowed with a minor. Copy is tagged FOUNDER-REVIEW.

`[DECISION]` **Honor declaration remains the only remembrance writer.** The picker list skips `remembrance` rows so unchecking a carrier cannot happen from this control.
