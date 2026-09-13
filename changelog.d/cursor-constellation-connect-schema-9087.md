## Constellation Connect: Phase 1 schema migration (branch `cursor/constellation-connect-schema-9087`), 2026-09-13

**Trigger**: the constellation-connect plan (`design/galaxia-constellation-connect-plan.md`,
PR #213) was approved, and its five open product questions were answered. This
builds only the migration layer from that plan's §2, and stops there so the
schema can be reviewed and applied before any RPC or UI is written on top of it.

`[DECISION]` **Sender-shares-back defaults to OFF.** Supersedes `[OPEN]` §9.3. A
reverse grant produced by a mutual add lands as `connection_grants.status =
'pending'` and is never auto-granted; the sender approves it explicitly.
Nobody's chart moves without that person having said yes to that specific
person. This is the fail-closed default and is consistent with the rest of the
repo's conventions. Recorded on `invites.sender_shares_back` (default `false`)
and in that column's comment.

`[DECISION]` **Constellation connect is not offered for `child` or
`grandchild`.** Supersedes `[OPEN]` §9.2, and narrows the four relations that
section floated. A minor cannot hold a Galaxia account (COPPA gate on signup,
Terms §6), so the product must never appear to invite one; those two relations
continue through the existing `birth_data` flow, which this work leaves
untouched. The line is drawn using the codebase's own generational model rather
than a guess about who is likely to be a minor: `resolveGalaxyRelation()` in
`packages/core/src/galaxy-orbit.ts` puts exactly these two picker values in band
`children`, while `niece` and `nephew` sit in band `circle` alongside `friend`,
`cousin`, `aunt`, and `uncle`, so they are lateral rather than descendant and
are not equivalent to `child`. **Enforcement lives in `create_connect_invite`
(Phase 2), not in this migration**, because the canonical list is TypeScript and
a SQL literal would drift from it silently; the intent is documented at the
schema level in the `invites.relationship_type` comment.

`[DECISION]` **No entitlement gate on accept.** Supersedes `[OPEN]` §9.1. Auth
is required, entitlement is not, for the accept path only. Viewing the resulting
chart falls under the normal gate. No schema implication.

`[DECISION]` **Pending state on the sender's side is a lightweight placeholder,
not nothing.** Supersedes `[OPEN]` §9.4. A UI concern for a later phase, with no
schema implication: the outstanding invitation is already an inspectable event
on the `invites` row (`ENGINEERING.md` §13).

`[DECISION]` **No expiry-sweep job for v1.** Supersedes `[OPEN]` §9.5. The
CHECK-enforced expiry plus the lazy write-back in the preview function already
make a stale row functionally inert, and `ENGINEERING.md` §14 is the record of
what a cron nobody scheduled is worth.

`[ADDED]` **`supabase/migrations/20260913160000_constellation_connect_schema.sql`.**
Schema only, no RPCs, no routes, no UI:

- `invites` gains `kind = 'constellation_connect'` plus `accepted_by`,
  `accepted_at`, `sender_shares_back`, and `sender_ack_at`, all commented.
  `invites` RLS is deliberately unchanged and must not be broadened: the
  recipient reaches the invite only through the Phase 2 `SECURITY DEFINER`
  functions.
- Four CHECKs that make the new kind fail closed, chief among them
  `invites_connect_requires_expiry`. A connect invite cannot physically exist
  without an expiry, which is a stronger statement than "the route remembers to
  set it" and the right answer to a column that had been null on every row since
  June. Each predicate is trivially true for existing `shared_space` and
  `birth_data` rows, so all four validate against live data without a table
  rewrite.
- New `connection_grants` table: one row per direction, unique on the
  `(subject_user, viewer_user)` pair and on `viewer_person_id`. RLS is
  select-only for both parties with **no insert, update, or delete policy at
  all**; write grants are also revoked from `anon` and `authenticated`, so
  "every write goes through a `SECURITY DEFINER` function" is true at the
  privilege level and not only at the policy level.
- New `people.chart_source` (`local` | `linked`) marking a mirrored chart, so no
  code path tries to rebuild a chart from birth data that is not there.
- Two triggers for mirrored-chart freshness, one on `charts` and one on
  `people`, rather than a refresh endpoint a client must remember to call or a
  cron that can silently stop running. A frozen copy of a chart the subject
  later corrects is a confidently wrong chart, which `ENGINEERING.md` §12 names
  as worse than no chart.

`[CHANGED]` **`purge_own_account_data()` ends every connect relationship in both
directions.** The former `update people set linked_user_id = null` is replaced by
a strict superset of itself: the mirrored chart is deleted, the shared birth
columns and `chart_source` are cleared in the same statement as
`linked_user_id` (a CHECK is evaluated per statement, so splitting them would
fail once `people_linked_chart_requires_link` lands), and `connection_grants`
rows go as subject and as viewer. What the other user is left with is the bare
star they named: their own label, their own chosen relation, no chart, no birth
data. Invites the purged account accepted are anonymized rather than deleted,
which is what `accepted_by`'s `ON DELETE SET NULL` was chosen for. Every other
statement in the function is copied forward unchanged.

`[FIXED]` **The plan's proposed `invites_accept_fields_together` CHECK was
unsatisfiable and is shipped one-directional instead.** §2.2 specified
`(accepted_by is null) = (accepted_at is null)` while also specifying
`accepted_by ... on delete set null`. Those contradict: deleting the accepting
user's `auth.users` row nulls `accepted_by` and leaves `accepted_at` set, so the
symmetric form would have aborted the very account deletion it was meant to
survive. Shipped as `check (accepted_by is null or accepted_at is not null)`,
which keeps the guarantee worth having (you cannot record who accepted without
recording when) and permits the anonymized post-deletion state. There is a
regression test for exactly this path.

`[BROKEN]` **Production was missing four committed migrations when this was
written, and `20260913030150` must be applied before this file.** The ledger for
`eigfvribtntbxyjutsma` stopped at `synastry_post_strip_reintroduced_em_dash`;
`add_owner_and_thread_indexes`, `wrap_auth_uid_in_rls_policies`,
`admin_audit_log_actor_id_nullable`, and `fix_purge_account_thread_participants`
(all PR #205) were committed but unapplied, which is why Migration Ledger Parity
has been red since. The live `purge_own_account_data()` body was therefore three
statements behind the repo. This migration's `CREATE OR REPLACE` is built on the
committed `20260913030200` body, not the live one, so it cannot silently drop
those three statements whichever order the two files land in. The consequence:
`20260913030150_admin_audit_log_actor_id_nullable.sql` has to be applied first,
or the `admin_audit_log` statements at the end of the function will fail at call
time against a `NOT NULL actor_id`.

`[OPEN]` **Three items from the plan's §2 are deliberately not in this
migration**, and each is a prerequisite for something later: the `invites`
indexes (including the partial unique index enforcing one live link per person),
`people_linked_user_idx`, and the `people_linked_chart_requires_link` CHECK. The
purge function above is already written to satisfy that CHECK, so adding it
later needs no further change to the purge. The `galaxy_relations` lookup table
and seed are also deferred; they are only consumed by `create_connect_invite`,
which is Phase 2.

`[OPEN]` The plan's §3.2 states that `GALAXY_RELATION_PICKER_OPTIONS` has 22
entries. It has **21**. Anything that asserts a count against that list should
use 21.
