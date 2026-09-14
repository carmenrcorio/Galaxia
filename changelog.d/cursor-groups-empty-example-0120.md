## Groups empty state shows a real example reading (branch `cursor/groups-empty-example-0120`) — 2026-09-14

**Trigger**: The Groups landing page with no saved groups was a short "Build your first group" card plus an auto-opened editor. It never showed what a group reading actually looks like, and it did not distinguish "no people yet" from "you already have a circle."

`[ADDED]` **Computed example reading on the empty Groups page.** When the user has no groups and fewer than three people, the page renders a complete group reading (hero, quote, generational map, shared sky, fault lines, pair dynamics, chart grid) from four fictional friends whose charts are computed by `@galaxia/astro` `computeNatalChart` / `cohortOverlay` (Lila 1991, Owen 1993, Priya 1994, Nate 1997: shared Neptune in Capricorn, Uranus and Pluto fault lines). Example member ids use the `example:` prefix and cannot be saved, compared, or shared. The reading is labelled Example, with copy that says it is not the user's group.

`[ADDED]` **Honest create control under the example.** A single requirement line ("A group needs three or more people"), a count of how many people they have and how many more a group needs, and an Add someone link to `/welcome`. The manage accordion stays closed and hidden on this landing so the example is the first thing they see.

`[ADDED]` **One-tap group from existing people.** If they already have three or more people and no group, the generic example is skipped. The page names those people, shows their avatars, and one tap prefills a draft named "My circle" and builds the live overlay. No user rows are touched until they save.

`[CONFIRMED UNTOUCHED]` **Live group compute, persistence, and `hasAccess`.** `cohortOverlay` / `compareGenerational` / `readyMembersForCohortOverlay` and the groups_current note path are unchanged. Example data never reads or writes `people`, `groups`, or `charts`.
