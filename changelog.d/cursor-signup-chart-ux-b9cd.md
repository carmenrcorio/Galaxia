## Signup and first-chart UX readability (branch `cursor/signup-chart-ux-b9cd`) — 2026-10-02

**Trigger:** VP of Marketing phone test: birthdate selects hard to read, helper text too small, chart wheel glyphs not discoverable without hover.

`[FIXED]` Dark `color-scheme` and explicit option colors on web birth `<select>` controls, 16px / 44px touch sizing, placeholder styling, and shared `BirthDateSelects` (landing mini-form + `BirthFields`).

`[FIXED]` Shared `.helper-text` (14px+, contrast-safe tokens) across signup, chart entry, welcome first-run, and compare entry; flip-chip secondary copy aligned.

`[ADDED]` Chart wheel explore hint (pulse + label, reduced-motion safe, per-device dismiss) on web and mobile profile; static “Tap to flip” on Sun/Moon/Rising cards.

`[FIXED]` Mobile onboarding and sign-in helper labels raised to 14px without changing date TextInputs.
