## Galaxy interaction rework — Phase 0 plan (branch `cursor/galaxy-interaction-rework-plan-f2da`) — 2026-09-14

**Trigger**: Spec a ring toggle and drag-to-reposition on the constellation
before any canvas or schema code, so we do not ship a second layout model
that fights the learnable-map seats.

`[OPEN]` **Phase 0 diagnosis only — not implemented.** Findings and the
proposed migration live in `design/galaxia-galaxy-interaction-rework-plan.md`.
Stop-gate: Carmen confirms the §6 founder decisions before Phase 1/2 code.

`[DECISION]` **Proposed storage (pending founder confirm):** polar JSONB
`people.custom_position` `{ angle: radians, radius_pct: 0.05–1.0 }`, same
space as `GalaxySeatNorm`. Rings toggle is localStorage only
(`galaxia.setting.showRings`). Owner column is `owner_id`; existing
`people owner all` RLS already covers the new column — no second policy.
Self stays pinned at the core. Mobile reads the seat in Phase 2; native
drag is out of scope.

`[DECISION]` **Correct table is `people`, not `relationships`.** Layout is
per-owner map of a star the owner already has. Constellation-connect
mirrors start at NULL (derived seat). Prompt's `.eq("user_id", …)` would
match zero rows.
