## Shared web person picker (branch `cursor/person-picker-extract-5154`) — 2026-09-15

**Trigger**: Compare and Vela pick people with different UI. Phase 1 extracts Compare's searchable slot picker into one web component so Vela can import it in Phase 2 without forking.

`[CHANGED]` `ComparePersonField` moved to `apps/web/components/person-picker.tsx` as `PersonPickerField` / `PersonPickerOption`. Props stay the same. The component stays fully controlled (`selectedId` + `onSelect`); defaulting to self stays on the page via `initialComparePairIds`.

`[CHANGED]` Every option row and selected slot appends ` (minor)` when `isMinorForSafety` is true. Minors stay visible and selectable. This is new on Compare and is the only visual change there.

`[DECISION]` Shared destination is `apps/web/components`, not `packages/ui`, because the picker uses `next/link`, `createPortal`, and `globals.css`. Group focus gets a separate `GroupPickerField` in Phase 2. Vela is untouched in this branch.
