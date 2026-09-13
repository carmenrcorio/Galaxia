## Constellation Connect: Phase 0 technical plan (branch `cursor/constellation-connect-plan-2916`) — 2026-09-13

**Trigger**: the partner invitation flow needed a finalized spec before any code,
per ENGINEERING.md §10. This follows the completed diagnosis of the existing
`invites` table (`birth_data` shipped and unrelated; `shared_space` a never-built
stub for a different Vela feature).

`[DECISION]` **Added `design/galaxia-constellation-connect-plan.md`, the Phase 0
plan for constellation connect. No implementation.** The load-bearing decisions
recorded there, so they are not re-litigated:

- **The sender never receives the recipient's birth data, only a copy of their
  chart.** Privacy by construction rather than by permission flag: if the birth
  columns are simply null on the sender's row, there is no read path to gate and
  no future feature that can leak them.
- **Schema splits in two.** `invites` gains `kind = 'constellation_connect'` and
  four columns and stays the disposable handshake (its `relationship_type`,
  `person_id`, `status`, and `expires_at` columns already have exactly the right
  semantics and finally get used). A new `connection_grants` table holds the
  durable, revocable, per-direction share grant, because that state outlives the
  invite row and exists twice after a mutual add.
- **`expires_at` and the `expired`/`revoked` status values become real.** A
  `CHECK` makes a connect invite impossible to insert without an expiry, and the
  preview function writes `'expired'` back lazily, so no cron is needed.
- **Single accepted use is enforced by one `UPDATE ... RETURNING`**, not by the
  read-then-write the existing birth-data route uses.
- **Mutual add is a separate screen and a separate call after the accept commits**,
  never a parameter of it. `linked_user_id` is written once per direction, on the
  row in each galaxy that represents the *other* account, never on a self row.
- **New `people.chart_source`** marks a mirrored chart so no code path tries to
  rebuild it from birth data that is not there.
- **Notification reuses the existing idiom**: the sender's home screen reads
  accepted invites directly with an inline `sender_ack_at` marker, mirroring
  `relational_transits.push_sent_at`. No notification table, no unread system, no
  new email category.
- **Web gets the accept path at full parity even though mobile leads**, because
  the recipient is by definition not a user yet and universal links are not
  configured, so the web landing is the only front door that opens.

`[OPEN]` Five questions block parts of the build and need a human answer: whether
accepting requires entitlement; whether connect is offered for child-implying
relations; the default for the sender sharing back; pending-state treatment on
the constellation; and whether unused expiry needs a sweep. See §9.

`[OPEN]` Eleven Terms and Privacy Policy touchpoints are flagged in §10 and must
be resolved before the corresponding code ships. Two existing Privacy Policy
sentences become factually wrong on launch: "the people you add generally do not
have Galaxia accounts and may not know they have been added," and the limits
described under "Requests from people you have added."

`[OPEN]` Three pre-existing mobile gaps block the lead platform: mobile cannot
create a bare-precision person at all (so the merge-into-an-existing-node
decision is unreachable there), mobile hardcodes `placidus` instead of reading
`profiles.house_system` (so the recipient-keeps-their-own-house-system decision
is not currently true on mobile, and this feature would propagate that across
accounts), and no `EXPO_PUBLIC_SITE_URL` exists to build the shareable link.
