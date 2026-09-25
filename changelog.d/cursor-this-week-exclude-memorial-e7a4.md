## This Week excludes memorial people (branch `cursor/this-week-exclude-memorial-e7a4`) — 2026-09-25

**Trigger**: Deceased family members were showing up in This Week as if the sky were still acting on them this week. The home card names people in the present tense ("something is moving more easily between you right now"). That is live weather, not remembrance.

`[FIXED]` **This Week is living people only.** Same care hole as Today in your sky (`shouldShowLiveTransits` / `peopleForTodaySky`). A person with `passed_at` set never appears in the home card, the full feed, the Sunday constellation letter, or a This Week push. Their star stays on the constellation; their enduring chart stays on the memorial profile. What they are not is "what's pulling on two people in your circle at once."

`[ADDED]` **`peopleForThisWeek`, `passedPersonIds`, `livingAffectedForThisWeek`, and `thisWeekRowsFromStored` in `@galaxia/core`.** Scan and letter filter the constellation before they compute. The feed and mobile rewrite stored `affected_profiles` at read time so a newly marked remembrance hides immediately, even before the next cron. An event that drops below two living people is dropped (it is no longer relational).

`[CHANGED]` **Relational-transit scan no longer includes memorial people.** The earlier comment that "Saturn is crossing where your grandfather's Sun was" belongs on the memorial timeline, not in This Week. Minors stay in: family information, not romantic content.

`[DECISION]` **Read-time filter, not a table wipe.** Existing `relational_transits` rows that name a memorial person stay in the table. The next scan writes living-only keys; the UI already hides the mixed rows. Reversing `passed_at` is still possible; a later living-only scan can surface that person again.

`[TESTED]` **A three-person card that includes a remembered sibling drops that name and keeps the two living people.** This is the Daddy / Stevie / Gabriel shape: Stevie is already marked remembered (`passed_at` set). They must never remain in This Week after the filter.
