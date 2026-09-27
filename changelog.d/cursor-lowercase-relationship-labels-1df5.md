## Lowercase relationship labels in the display layer (branch `cursor/lowercase-relationship-labels-1df5`) — 2026-09-27

**Trigger**: Settings "Your people" showed stored relationship labels with mixed casing (`partner`, `friend`, `Daughter`, `Cousin`).

`[FIXED]` Relationship type labels render through `formatRelationshipLabel`, which lowercases the string at display time. Stored `people.relation` and invite `relationship_type` values are unchanged, and edit fields still show the saved text so a save does not rewrite casing.
