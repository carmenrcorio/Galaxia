## Constellation Connect UI (branch `cursor/g1-constellation-connect-ui-89ba`) — 2026-09-14

**Trigger**: Backend for constellation connect is already on main (schema PR #217, nine RPCs PR #225, legal addendum PR #224). Nothing in the UI called `create_connect_invite`, `accept_connect_invite`, or `revoke_connect_invite`. This branch finishes the five UI slices so a sender can text a `/connect/[token]` link and both people can land on a comparison.

`[ADDED]` **`/connect/[token]` is the public accept landing.** Separate from `/invite/[token]` (birth-data) and `/s/[token]` (share snapshot). A `constellation_connect` token pasted into `/invite/[token]` 308s to `/connect/[token]`. Logged-out visitors see the sender display name, the relation label, layer-one framing, and the locked disclosure, then `Create your account to connect` → `/signup?next=/connect/[token]`. Login accepts `redirect` as an alias of `next`. Signup's Log in link keeps that `next` so a recipient who already has an account still returns to the invite. `/connect` is not on the middleware auth or entitlement gate. AASA lists `/connect/*`. A trailing slash on `/connect/:token/` is stripped in `next.config.mjs` (same explicit exception class as the retired-URL redirects).

`[ADDED]` **Generate, copy, and native share.** Person profile, edit panel, and the constellation hover card call `create_connect_invite`. Child-band relations and `isMinorForSafety` hide the action. Merge target (`p_person_id`) is only sent for an unlinked `birth_precision = none` star.

`[ADDED]` **Pending connections on `/app/settings`.** Lists the sender's open `constellation_connect` invites with recipient name, relation, time remaining, and Revoke (`revoke_connect_invite`). Empty state: "No pending invites."

`[ADDED]` **Reciprocal compare after accept.** Success shows an interstitial (`See your comparison` / `Go to my constellation`) instead of bouncing to `/app`. Comparison preloads `/app/compare?a=&b=` (the authed compare that can load stored charts). `/chart/compare` is the public birth-form flow and cannot preload a linked chart that has no birth fields. Sender-side unread is a gold dot on the person star, dismissed by `acknowledge_connect_accept` when the profile opens. No notification table.

`[ADDED]` **Rate limit on `create_connect_invite`.** New migration `20260914240000_create_connect_invite_rate_limit.sql` (does not edit the applied RPC file). Caps pending non-expired invites created by `auth.uid()` in the last 24 hours at 10. The generate UI surfaces "Too many open invitations. Revoke some before sending more." with a link to the pending list.

`[UNCHANGED]` **`hasAccess` is not involved.** Auth is required to accept; a paid plan is not. `kind = birth_data` is untouched. No second invitations table. No per-person caps.
