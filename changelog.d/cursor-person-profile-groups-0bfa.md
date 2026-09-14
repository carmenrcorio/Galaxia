## Person profile grouped into Now / Them / Yours (branch `cursor/person-profile-groups-0bfa`) — 2026-09-14

**Trigger**: The person profile still laid out ten hash chips in one long page (web) and a single stacked ScrollView (mobile). Finding a section took too many taps on a phone, and `?transit=1` from the home sky never opened the live note.

`[CHANGED]` **Web person page is three groups, not ten chips.** Living profiles use Now / Them / Yours. Memorial profiles replace Yours with Remembrance (label-rename left that chip as Remembrance). Founder mapping: Now = Right now + Ask about them; Them = What they need, How they are wired, Where they pull, Where it shows up, Their generation, Chart wheel last; Yours = Your record + Earlier answers. Remembrance prepends Remembrance, Timeline, and Their light, then still keeps Record and Earlier answers so those hashes keep working. Group tabs are equal-width; jump chips wrap. No nested horizontal scroller.

`[ADDED]` **`?transit=1` opens Now and scrolls to `#active-today`.** Hash still wins when both are present. Default with no hash: Now if there is a live sky note today, otherwise Them. All thirteen existing hashes still resolve: open the parent group, then scroll. No unused `?tab=` shim.

`[CHANGED]` **Mobile person profile is Them | Yours** (Remembrance when the person is passed). There is no daily nudge / Vela on this screen, so Now is omitted. Default Them. Existing cards stay stacked inside the selected group. No nested horizontal scroller. Mobile push-notification routing is untouched.

`[DECISION]` **Anchor ids stay on the old vocabulary.** `#placements`, `#active-today`, and the rest do not move. New group strings (Now, Them, Yours, Remembrance) are FOUNDER-REVIEW. No em dashes. No data-model change.
