## This Week push safety (branch `cursor/this-week-push-safety-c735`) — 2026-09-30

**Trigger**: The This Week push put natal planets and signs on the lock screen, could notify a pair that includes a minor, and left the novelty ledger in local storage after sign-out. Stored rows from the old multi-person scanner could also be pushed without the current synastry gate.

`[FIXED]` **Lock-screen copy is names only.** `renderSharedTransitCopy` now returns `pushHeadline` ("Something is shifting between [Name A] and [Name B] this week.") for the Expo body, and `cardDetail` (the existing lead plus relational paragraph) for the in-app card. The card still renders `lead` and `body`.

`[FIXED]` **No push when either person is a minor.** The push route calls `isMinorForSafety` on the named pair and skips the send without deleting the row. A stored partner or ex label no longer selects romantic copy when either person is a minor: the frame stays family (parent-child, siblings) or becomes the neutral person frame.

`[FIXED]` **Sign-out clears the This Week novelty ledger.** Web removes `galaxia.thisWeek.shown.v1.*` from localStorage after `auth.signOut()`. Mobile does the same in AsyncStorage from the shared sign-out handler.

`[FIXED]` **Stale stored pairs are not pushed.** Before rendering a push, the route resolves current chart longitudes and runs `storedPairPassesScannerGate`. A pair the scanner would drop is skipped. The row stays in the table.
