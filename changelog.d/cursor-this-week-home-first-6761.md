## This Week is first on the constellation home (branch `cursor/this-week-home-first-6761`) — 2026-09-14

**Trigger**: The constellation home led with the canvas. This Week (relational transits between people in the circle) sat below Today on web and disappeared entirely on mobile when the feed was empty.

`[CHANGED]` **This Week is now the first block on the app home screen**, compact, above the constellation canvas, then Today per person, then everything that was already below. Mobile caps the home card at three entries and links to a full feed (`/this-week` / `/app/this-week`) so the card stays on-screen on a standard phone without scrolling.

`[CHANGED]` **Empty state never disappears and never fabricates an event.** If nothing is currently pulling on two people at once, the card says so. If a next date is computable from a stored upcoming window or from scanning real charts forward, it names that date. If it is not computable, it says the sky is quiet this week and links to the per-person Today list.

`[CHANGED]` **Each entry leads with the people's names, then what it means for the dynamic between them.** The planet and natal targets are a secondary line, not the headline. Push copy uses the same names-first headline.

`[DECISION]` **Phase 0: the empty feed is not a cron-never-ran problem.** `.github/workflows/relational-transits.yml` has been succeeding (latest `34749607742` on 2026-09-13: 9 owners scanned, 3 events upserted). Production `relational_transits` has 5 currently-active rows across 3 owners. Layout and the mobile hide-when-empty empty state were the product bugs.
