## No invite on memorial and ancient profiles (branch `cursor/d15-no-invite-memorial-a2bd`) — 2026-09-14

**Trigger**: A remembered or ancient person was still offered "Invite to connect" on their profile and in the edit panel. Dead people cannot receive invitations.

`[FIXED]` **`canOfferConnectInvite` now refuses memorial and ancient people.** The universal UI gate already hid the generate action for self, linked, child-band, and minors. It did not read `people.passed_at` or the `ancestor` tag. It now also returns false when `usesAncientLight` is true (`passed_at` set, or relation `ancestor`). `ConnectInviteButton` already returns null from that gate, so the button is not in the DOM.

`[FIXED]` **Person profile and edit panel no longer render invite or birth-data-ask actions on memorial or ancient people.** The compact header button, the "Don't know their details?" block, and the edit-panel "Let them fill it in" block are skipped when `usesAncientLight` is true. Living people still see invite.

`[DECISION]` **The hover inspector is already gone.** Constellation click opens `/app/person/[id]` (d14). No invite surface remains on `/app`.
