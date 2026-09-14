## Constellation hover card removed (branch `cursor/d14-remove-hover-card-ade9`) — 2026-09-14

**Trigger**: The floating inspector over the constellation hid the sky and made a
tap feel like a two-step open.

`[CHANGED]` **Removed the glass hover inspector from `/app`.** Click or tap a
star now routes to `/app/person/[id]` immediately. Canvas name labels,
hold-to-drag, and the RINGS toggle are unchanged. Desktop hover still sets
`cursor: pointer` and lights the hovered star. The existing legend strip under
the stage shows the hovered person's name and relation; no new overlay was
added.

`[CHANGED]` **Connect invite no longer lives on the constellation overlay.**
`ConnectInviteButton` on `/app` was only reachable from that inspector; the
person profile and edit panel still offer generate.
