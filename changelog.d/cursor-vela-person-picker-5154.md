## Vela person picker slots (branch `cursor/vela-person-picker-5154`) - 2026-09-15

**Trigger**: Phase 2 of D-new. Compare already uses `PersonPickerField`. Vela still listed every person as chips and used a native select for groups, so a large constellation overflowed the page.

`[CHANGED]` Vela person focus is one `PersonPickerField` labeled Understand. Pair focus is two slots (Person A / Person B) that share one `velaPeople` array; slot A seeds from `initialComparePairIds` (self when present) and slot B stays empty. Group focus is `GroupPickerField` with the same slot card and searchable list, member counts as `(N members)`, and Add a group pointing at `/app/groups`. Add-person from Vela is `/app/add-person`.

`[DECISION]` `GroupPickerField` is a sibling of `PersonPickerField`, not a mode on it, because groups have no minor-safety label. The people query now selects `relation`; sun still comes from charts (`sunSign`) and is mapped to `sun` on `PersonPickerOption`. No Compare, chat, mode, composer, or starfield changes.

`[TESTED]` `pnpm typecheck` 6/6. `pnpm test` green: web 1471 (including VelaFocusPickers, GroupPickerField, vela-roster, and vela-selector-wiring), astro 396, core 317, vela 28, mobile 83. Twelve screenshots (six focus states at 375px and 1280px) are attached to the PR. No horizontal overflow at 375px. No 100-person test profile exists in this environment, so that scale check was skipped. Temporary `__demo` seed and middleware bypass were removed before this note.
