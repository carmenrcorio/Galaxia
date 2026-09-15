## Loading, empty, and failure standard (branch `cursor/async-surface-standard-c3ca`) — 2026-09-15

**Trigger**: Screens waited on fetches with a blank container, an indefinite spinner, or "Something went wrong." Only Settings subscription had a timeout. The constellation skeleton (#229) and Settings subscription panel (#230) were already the gold standards.

`[DECISION]` **Every async surface has loading, empty, and failure (`ENGINEERING.md` §18).** Loading preserves layout height. Timeout is a failure, never a longer spinner. Data screens use `withTimeout` at 8s; Vela send uses 15s; Settings subscription stays at 2s. Error copy names what failed and what to do next. Empty copy names the condition and offers one action. Never render a raw database `error.message`. Never "Something went wrong." New user-visible strings are tagged `FOUNDER-REVIEW`.

`[FIXED]` **Constellation home, This Week, The Moment, Compare, person, groups, Vela, and Settings now time out and name the failure.** Empty pickers and history no longer render a blank row. Retry is the next step on data screens.

`[FIXED]` **Remaining panels name the surface instead of a generic spinner or catch-all.** Connection invites, share links, cancellation, the root error boundary, relationship lines, remembrance, honor-declaration, first-run / add-person / save-to-galaxy, Quick Check, the blog index, and mobile Settings / onboarding.
