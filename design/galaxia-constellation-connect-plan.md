# Constellation Connect: partner invitation flow

**Status: PHASE 0 PROPOSAL. Not approved. No implementation exists.**

This document is the full technical plan for the partner invitation flow
("constellation connect"): a Galaxia user invites a real person to connect, the
recipient creates (or signs into) their own Galaxia account, and the two
accounts are linked so the sender sees the recipient's *computed chart* without
ever holding their raw birth data.

Nothing in this plan has been built. No migration file, route, screen, or
function described here exists in the repo yet. Per `ENGINEERING.md` §10, the
spec is finalized *before* the build starts, so the intent is that this document
is read, corrected, and approved first, and then implementation phases are
written against it.

---

## 0. What this is built on

A prior diagnosis established the state of the `invites` table. Restating it
here so the plan is self-contained and so nobody re-derives it:

| Fact | Evidence |
| :---- | :---- |
| `invites` was created with `token`, `from_user`, `relationship_type`, `status`, `expires_at`, `created_at` | `supabase/migrations/20260630233000_add_waitlist_and_invites.sql` |
| `person_id` and `kind` were added later; `kind` checks `('shared_space', 'birth_data')` | `supabase/migrations/20260710014000_progressive_capture.sql` |
| `kind: 'birth_data'` is shipped, live, and unrelated to this feature. It collects birth details from a non-user into a person row the sender already owns | `apps/web/components/ask-birth-data.tsx`, `apps/web/app/api/invite/birth-data/route.ts` |
| `kind: 'shared_space'` is a deferred stub for a different Vela feature. No code creates it. `/invite/[token]` renders "this invite isn't ready yet" for it | `apps/web/app/invite/[token]/page.tsx` |
| `expires_at` is **never set on insert and never enforced on read**, anywhere | the only insert is `ask-birth-data.tsx`; `lib/invites.ts` selects the column and never compares it |
| Status values `'expired'` and `'revoked'` are **never written and never checked**. Only `'accepted'` is ever written | `apps/web/app/api/invite/birth-data/route.ts` is the sole status writer |
| `people.linked_user_id` exists from the initial schema and is **completely dormant** in application code. Its only references are the account-purge SQL functions nulling it out | `supabase/migrations/20260629212000_initial_schema.sql`; zero matches under `apps/` or `packages/` |
| There is **no merge, dedupe, or person-matching logic** of any kind in the repo | exhaustive search |
| There is **no in-app notification inbox, feed, bell, or unread concept**. Existing "feeds" are content sections that read a domain table directly | `relational-transit-feed.tsx`, `home.tsx` "Today in your sky" / "This week" |
| Mobile has **no invite UI, no share/clipboard code, no deep-link handling, and no `components/` directory**. Every screen inlines its own styles from `@galaxia/ui` tokens | `apps/mobile/app/**` |

Confirmed product decisions are listed in `§9` and are treated as settled input,
not as things this plan re-argues.

---

## 1. The shape of the thing

One design choice drives everything else, so it goes first.

**The sender never receives the recipient's birth data. The sender receives a
copy of the recipient's chart.**

This is privacy by construction rather than privacy by permission flag. If the
sender's `people` row simply does not contain `birth_date`, `birth_time`,
`birth_lat`, `birth_lng`, `birth_place`, or `tz_offset_min`, then there is no
read path to gate, no RLS predicate to get wrong, and no future feature that can
accidentally leak them. The chart JSON in `charts.data` is the derived artifact
the sender is entitled to, and it is the only thing that crosses.

Three consequences follow, and each needs handling:

1. **A person row with a chart but no birth data is a new state.** Today the
   model is "birth fields plus precision produce a chart." Code paths assume
   that if a chart exists, the birth data that produced it is on the row. The
   lazy recompute in `apps/web/app/app/person/[id]/page.tsx` would call
   `buildBirthInput` against nulls. This needs an explicit marker, proposed
   below as `people.chart_source`.

2. **The chart must stay live.** If the recipient later corrects their birth
   time, a frozen copy in the sender's galaxy becomes a confidently wrong chart,
   which `ENGINEERING.md` §12 names as worse than no chart. The mirror has to
   follow the source.

3. **The recipient must already have their own chart before they can share
   it.** A brand-new account has no `is_self` person row. So the real funnel is
   *link, then account, then add your own birth details, then accept*, not *link,
   then accept*. This shapes the mobile screens in `§5`.

---

## 2. (a) Schema

### 2.1 Recommendation

**Extend `invites` with a new `kind`, and add one new table for the durable
share grant.** These are two genuinely different objects and conflating them is
what would go wrong.

`invites` is a **handshake**: a token, who sent it, what relation they chose,
when it dies, whether it was used. It is disposable. It gets revoked and
regenerated. It is meaningless once consumed.

The connection is a **standing state**: person A may see person B's chart, at a
stated level of detail, until B says otherwise. It outlives every invite row
that created it, it exists in two independent directions after a mutual add, and
it must be revocable by the subject from a settings screen, forever.

Putting the standing state on the invite row would mean the sender's ongoing
access is governed by a consumed handshake artifact, and that revoking access
means mutating a historical record. That is the wrong shape.

**Why extend `invites` rather than create a second invite table:** every column
the handshake needs already exists on it and is the right type and semantics.
`relationship_type` is exactly "the relation the sender picked" and is currently
written as `null` by the only insert path. `person_id` is exactly "the existing
person row this invite is about" and is exactly the merge target. `token`,
`status`, and `expires_at` are the standard link lifecycle. A parallel table
would duplicate all six columns, duplicate the RLS policy, and duplicate the
token-lookup helper, in exchange for nothing. The confirmed decision to use a
new, distinct `kind` value already assumes this table, and the table's shape
earns it.

**This is also the feature that finally uses `expires_at` and the
`expired`/`revoked` status values.** They have been schema decoration since June.
Section 2.4 makes them enforced rather than aspirational, at the database level
where they cannot be forgotten.

### 2.2 `invites` changes

```sql
-- New kind. Never reuses 'shared_space' or 'birth_data'.
alter table invites drop constraint if exists invites_kind_check;
alter table invites add constraint invites_kind_check
  check (kind in ('shared_space', 'birth_data', 'constellation_connect'));

alter table invites
  add column if not exists accepted_by uuid references auth.users(id) on delete set null,
  add column if not exists accepted_at timestamptz,
  add column if not exists sender_shares_back boolean not null default false,
  add column if not exists sender_ack_at timestamptz;
```

| Column | Why |
| :---- | :---- |
| `accepted_by` | Who consumed the link. Needed for the sender's notification ("Maya accepted"), for the mutual-add step to know who to add, and for audit. `on delete set null` so a later account deletion does not cascade away the sender's invite history. |
| `accepted_at` | When. Drives the sender's in-app notification ordering (`§7`). |
| `sender_shares_back` | The sender's up-front answer to "if they add you back, may they see your chart?" Defaults to **false** (fail closed). See `§4.3` for why this exists. |
| `sender_ack_at` | The sender dismissed the "accepted" notification card. Mirrors the inline `relational_transits.push_sent_at` idiom rather than inventing an unread system. |

Constraints that make the new kind fail closed. Each is written so that existing
`shared_space` and `birth_data` rows satisfy it trivially, which means the
`ALTER TABLE` validates against live data without a rewrite:

```sql
alter table invites add constraint invites_connect_requires_expiry
  check (kind <> 'constellation_connect' or expires_at is not null);

alter table invites add constraint invites_connect_requires_relation
  check (kind <> 'constellation_connect' or relationship_type is not null);

alter table invites add constraint invites_no_self_accept
  check (accepted_by is null or accepted_by <> from_user);

alter table invites add constraint invites_accept_fields_together
  check ((accepted_by is null) = (accepted_at is null));
```

The first one is the important one. A connect invite *cannot physically exist*
without an expiry. That is stronger than "the route remembers to set it," and it
is the correct answer to a column that has been null on every row for three
months.

Indexes:

```sql
create index if not exists invites_from_user_status_idx
  on invites (from_user, status);

-- One live link per person at a time: regenerate means revoke, then create.
create unique index if not exists invites_one_pending_connect_per_person
  on invites (from_user, person_id)
  where kind = 'constellation_connect' and status = 'pending' and person_id is not null;

-- Sender's "accepted, not yet acknowledged" notification read (§7).
create index if not exists invites_connect_unacked_idx
  on invites (from_user, accepted_at desc)
  where kind = 'constellation_connect' and status = 'accepted' and sender_ack_at is null;
```

**`invites` RLS stays exactly as it is.** The current policy
(`from_user = (select auth.uid())`) is correct and must not be broadened. The
recipient must never be able to `select` from `invites`, because a broader
policy would expose every other invite the sender has outstanding. The recipient
reaches the invite only through the `SECURITY DEFINER` functions in `§3`, which
return a fixed, whitelisted projection.

### 2.3 New table: `connection_grants`

```sql
create table if not exists connection_grants (
  id uuid primary key default gen_random_uuid(),
  -- Whose chart is being shared (the data subject; the only one who can revoke).
  subject_user uuid not null references auth.users(id) on delete cascade,
  -- Who may see it.
  viewer_user uuid not null references auth.users(id) on delete cascade,
  -- The row in the viewer's galaxy that represents the subject.
  viewer_person_id uuid not null references people(id) on delete cascade,
  share_level text not null default 'chart' check (share_level in ('chart', 'details')),
  status text not null default 'active' check (status in ('pending', 'active', 'revoked')),
  source_invite uuid references invites(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint connection_grants_not_self check (subject_user <> viewer_user)
);

create unique index connection_grants_pair_idx
  on connection_grants (subject_user, viewer_user);
create unique index connection_grants_person_idx
  on connection_grants (viewer_person_id);
create index connection_grants_subject_idx on connection_grants (subject_user);
create index connection_grants_viewer_idx on connection_grants (viewer_user);
```

One row per direction. After a mutual add there are two rows describing the same
pair of humans, and they are independent: the recipient may share their chart in
full detail while the sender shares nothing back, or either may revoke without
touching the other. That independence is the whole point, and it is why this
cannot be a boolean on a single row.

`share_level` is the chart-versus-details decision, and it lives here rather
than on `people` so that the subject can change it later from their own
settings, on a row their own RLS lets them read.

`status = 'pending'` is used only for the reverse direction of a mutual add when
the sender did not pre-authorize sharing back. See `§4.3`.

RLS, deliberately read-only for both parties:

```sql
alter table connection_grants enable row level security;

create policy "connection_grants subject read"
on connection_grants for select to authenticated
using (subject_user = (select auth.uid()));

create policy "connection_grants viewer read"
on connection_grants for select to authenticated
using (viewer_user = (select auth.uid()));

-- No insert/update/delete policy by design. Every write goes through a
-- SECURITY DEFINER function (§3), the same pattern as delete_own_person and
-- purge_own_account_data.
```

Writes are function-only because an `UPDATE` policy cannot express "you may
change `share_level` but not `viewer_person_id`," and an `INSERT` policy checking
only `subject_user` would let anyone mint a grant pointing at a stranger's
person row. Keeping writes in `SECURITY DEFINER` functions is both tighter and
consistent with how the repo already handles cross-cutting privileged work.

### 2.4 `people` change

```sql
alter table people add column if not exists chart_source text not null default 'local'
  check (chart_source in ('local', 'linked'));

alter table people add constraint people_linked_chart_requires_link
  check (chart_source = 'local' or linked_user_id is not null);

create index if not exists people_linked_user_idx
  on people (linked_user_id) where linked_user_id is not null;
```

`chart_source = 'linked'` is the marker from `§1`. It means: this row's chart was
mirrored from the account in `linked_user_id`, the birth fields may be null, and
**no code path may rebuild this chart locally**. Concretely it gates the lazy
recompute in `apps/web/app/app/person/[id]/page.tsx` and any future
`buildBirthInput` call site.

`birth_precision` on a linked row is set to the *source row's* precision even
though the birth fields are null. That is not fabrication, it is an honest
statement of the fidelity of the chart the sender holds, and it keeps
`sharp()` in `apps/web/app/app/page.tsx`, minor-safety checks, and the transit
nudge eligibility logic all behaving correctly without special cases.

One subtlety worth stating: `people` RLS is unchanged. A linked row is still
owned by, and only visible to, the viewer. Nothing about this feature gives one
user `select` on another user's `people` rows.

### 2.5 Freshness: two triggers, no cron

Rather than a refresh endpoint the client has to remember to call, or a cron job
(which `ENGINEERING.md` §14 correctly treats as a thing that silently does not
run), the mirror follows the source with database triggers:

- `after insert or update on charts`: if the affected `person_id` is an
  `is_self` row, re-copy `data`, `house_system`, and `engine_version` into every
  `viewer_person_id` with an active grant whose `subject_user` owns that self row.
- `after update on people`: if the affected row is `is_self` and the birth
  columns changed, re-copy them into every active grant with
  `share_level = 'details'`, and update mirrored `birth_precision` on all active
  grants regardless of level.

Fan-out is a handful of rows per user, so cost is negligible. Both functions get
a `comment on function` explaining what they do, because invisible machinery is
exactly the kind of thing this repo has been burned by.

### 2.6 Account purge: mandatory, not optional

`purge_own_account_data()` currently ends other users' links with a single
statement:

```sql
update people set linked_user_id = null where linked_user_id = uid;
```

After this feature that statement is **actively wrong**, twice over. It would
leave `chart_source = 'linked'` with a null `linked_user_id`, violating
`people_linked_chart_requires_link` and aborting the purge. And it would leave
the deleted user's mirrored chart sitting in other people's galaxies forever,
which is a privacy defect and a broken promise in Privacy Policy §8.

The purge function needs a new statement inserted **before** that line, in the
same additive style the `push_tokens` migration used:

```sql
-- Strip mirrors of me out of other people's galaxies before dropping the link.
delete from charts
  where person_id in (select viewer_person_id from connection_grants where subject_user = uid);

update people set
    chart_source = 'local',
    birth_precision = 'none',
    birth_date = null, birth_time = null, birth_place = null,
    birth_lat = null, birth_lng = null, tz_offset_min = null,
    linked_user_id = null
  where id in (select viewer_person_id from connection_grants where subject_user = uid);

delete from connection_grants where subject_user = uid or viewer_user = uid;
delete from invites where accepted_by = uid;  -- existing line deletes from_user = uid
```

The ordering is load-bearing: `people_linked_chart_requires_link` is a plain
`CHECK`, evaluated per statement, so `chart_source` must be cleared in the same
statement that clears `linked_user_id`.

What the other user is left with is the bare star they named: their own label,
their own chosen relation, no chart, no birth data. They keep the memory of the
person; they lose the data that was only ever on loan. That is the right answer
and it should be said out loud in the Privacy Policy (`§8`).

### 2.7 Why not a new table for the invite itself

For completeness, since the task asked for the justification either way. A
`connect_invites` table would be justified if the connect handshake needed
columns that would be meaningless nulls on `birth_data` rows, or if the two
kinds had diverging lifecycles. Neither holds: the four new columns are all
nullable or defaulted and are conceptually meaningful for any invite kind
(`accepted_by` and `accepted_at` are arguably backfillable facts the
`birth_data` flow should have been recording all along), and the lifecycle is
identical. The cost of a second table is a second RLS policy, a second token
namespace with no uniqueness guarantee across the two, and a permanent question
at every call site about which table to look in. Extending wins.

---

## 3. (b) API routes

### 3.1 Where the logic lives, and why

Mobile is the lead platform, and mobile today talks to Supabase directly plus
one edge function (`vela-chat`). It does not call `apps/web` API routes at all
and has no site-URL env var. Web talks to Supabase directly and has Next.js
route handlers. So "an API route" has to mean something that both clients can
call the same way, or the flow gets implemented twice and drifts.

**The transactional core is a set of `SECURITY DEFINER` Postgres functions,
called via `supabase.rpc()` from both clients.** Rationale:

- The accept is genuinely multi-table and must be atomic: consume the invite,
  write or merge a `people` row in the *sender's* galaxy, copy a chart, create a
  grant. A single transaction is the only honest way to get "single accepted use
  per link" under concurrency.
- It is inherently cross-user. The recipient writes into the sender's rows. No
  RLS policy should ever permit that, so it has to be definer-rights code
  regardless of whether it is wrapped in HTTP.
- No chart *computation* is needed at accept time, only a chart *copy*, so
  nothing forces this into TypeScript. (The recipient's chart was already
  computed on their own device by `@galaxia/astro` during onboarding.)
- The repo already does this: `delete_own_person`, `delete_own_group`,
  `purge_own_account_data`. Every one is `language plpgsql security definer set
  search_path = public`, and the `search_path` pin is not optional; there is
  already a migration named `profiles_timezone_capture_fix_search_path` that
  exists because it was missed once.

**One thin HTTP wrapper is added on top of the accept**, as a Supabase edge
function, purely so the sender can be notified immediately (`§7`). Plain RPCs
cannot make outbound HTTP calls, and should not.

### 3.2 Surface 1: generate link

**`create_connect_invite(p_relation text, p_person_id uuid default null, p_share_back boolean default false)`**
returning `(token text, expires_at timestamptz, person_id uuid)`.

Optional thin wrapper `POST /api/connect/invite` on web if a non-Supabase caller
ever needs it; not required at launch since both clients hold a Supabase session.

Behavior:

- Rejects when `auth.uid()` is null. Auth is required; this is a sender action.
- Validates `p_relation` against the canonical list. The allowed values are the
  22 entries of `GALAXY_RELATION_PICKER_OPTIONS` in
  `packages/core/src/galaxy-orbit.ts`. Because that list lives in TypeScript and
  the check must happen in SQL, the plan proposes a small
  `galaxy_relations(value text primary key)` lookup table seeded by the same
  migration, plus a unit test in `@galaxia/core` asserting the two lists are
  identical so they cannot drift. Validating against a free-text column would
  defeat the point of having a picker.
- If `p_person_id` is supplied, requires that the row is owned by the caller,
  has `linked_user_id is null`, and has `birth_precision = 'none'`. This is the
  merge target from `§6`. Anything else is rejected rather than silently
  overwritten.
- Refuses when the target person has `is_minor = true`, and refuses outright for
  the relation values the founder decides are minor-implying. See open question
  `§9.2`.
- Sets `expires_at = now() + interval '14 days'` and `status = 'pending'`.
- Token: `replace(gen_random_uuid()::text, '-', '')`, which is the exact format
  the existing birth-data invite uses (32 hex characters, 122 bits of entropy)
  and needs no extension. Generated server side rather than client side, unlike
  the current flow.
- **Regenerate** is the same call: any existing `pending` connect invite for the
  same `(from_user, person_id)` is first set to `status = 'revoked'`, then a new
  row is inserted. The partial unique index in `§2.2` makes it impossible to end
  up with two live links for one person. The old URL stops working immediately,
  which is the point of regenerating.

The client assembles the shareable URL as `{siteUrl}/connect/{token}`. Web reads
`publicEnv.siteUrl` (`NEXT_PUBLIC_SITE_URL`). **Mobile has no equivalent today
and needs a new `EXPO_PUBLIC_SITE_URL`** (`§8.1`).

`revoke_connect_invite(p_token text)` is the companion: sets `status =
'revoked'` for a pending invite owned by the caller. Also auth-required.

### 3.3 Surface 2: preview

**`connect_invite_preview(p_token text)`** returning a single row of
`(inviter_name text, relation text, expires_at timestamptz, state text,
sender_shares_back boolean, already_connected boolean, recipient_has_self_chart boolean)`.

Auth required. This is the "shows the recipient a preview of what the sender
will and will not see before they confirm" step, and it is deliberately separate
from the accept so that rendering the disclosure has no side effects.

- `state` is one of `ok | not_found | expired | already_accepted | revoked |
  self_invite | already_connected`. The recipient gets a readable reason, never
  a generic failure.
- **This is where lazy expiry is enforced and written back.** Before computing
  `state`, the function runs `update invites set status = 'expired' where token =
  p_token and kind = 'constellation_connect' and status = 'pending' and
  expires_at <= now()`. So the `'expired'` status value stops being decoration
  and starts being true, the sender's outstanding-invites list is accurate, and
  no cron job is required to make it so. The accept in `§3.4` does not trust this
  and re-checks the timestamp itself.
- It returns **nothing about the sender's galaxy**: no person count, no other
  invites, no chart. Just a display name, the relation the sender chose, and
  link validity.
- `recipient_has_self_chart` tells the client whether to route the recipient
  through "add your own birth details" before the confirm button is live. This
  is the funnel constraint from `§1.3`.

The disclosure copy the preview screen renders is fixed and reviewed, not
generated. Proposed text, to be tagged `FOUNDER-REVIEW` and checked against
`ENGINEERING.md` §15 (no U+2014) before it ships:

> **What {Sender} will see**
> Your name, as you enter it. Your chart: the same placements you see. How your
> two charts compare.
>
> **What {Sender} will not see**
> Your birth date, your birth time, or your birth place. Your coordinates or
> timezone. Anything you write. Anything you do in the app.
>
> [ ] Also share my exact birth details with {Sender} *(off by default)*
>
> You can change this or disconnect at any time in Settings.

### 3.4 Surface 3: accept

**`accept_connect_invite(p_token text, p_share_level text)`** returning
`(grant_id uuid, sender_user uuid, sender_name text, sender_shares_back boolean)`.

Wrapped by edge function **`POST /functions/v1/connect-accept`**, which calls the
RPC with the caller's JWT and then sends the sender's push (`§7`). Both clients
call the edge function; the RPC remains callable directly as a fallback and for
tests. This matches how mobile already calls `vela-chat`
(`${EXPO_PUBLIC_SUPABASE_URL}/functions/v1/...` with
`Authorization: Bearer ${session.access_token}`), and the deploy workflow and
parity CI for `supabase/functions/**` already exist.

Behavior, in order:

1. **Reject if not authenticated.** `auth.uid()` null raises. There is no
   anonymous accept path and no "fill in your details" fallback; that is the
   growth mechanic decision, and it is also what makes `linked_user_id`
   meaningful.
2. **Require the recipient's own chart.** Reads the caller's `is_self` person row
   and its `charts` row. If either is missing, raises a readable error telling
   them to add their own birth details first. The client should have prevented
   this using `recipient_has_self_chart`, but the function does not trust the
   client.
3. **Consume the invite atomically.** One statement is the entire concurrency
   story:

   ```sql
   update invites
      set status = 'accepted', accepted_by = v_uid, accepted_at = now()
    where token = p_token
      and kind = 'constellation_connect'
      and status = 'pending'
      and expires_at > now()
      and from_user <> v_uid
   returning id, from_user, person_id, relationship_type, sender_shares_back
     into v_invite;
   if not found then raise exception '...' using errcode = '...'; end if;
   ```

   Two simultaneous accepts: exactly one updates a row, the other gets zero rows
   and a clean error. This is single accepted use per link, enforced by the
   database rather than by a read-then-write like the existing birth-data route
   does.
4. **Merge or create the sender's person row.** If `v_invite.person_id` is set
   and still qualifies (owned by sender, `linked_user_id is null`,
   `birth_precision = 'none'`), update it. Otherwise insert a new row owned by
   the sender with `display_name` from the recipient's self row,
   `relation = v_invite.relationship_type`, `is_self = false`.
   Either way the row gets `linked_user_id = v_uid` and
   `chart_source = 'linked'`.
5. **Copy the chart.** `insert into charts select ... from charts where person_id
   = <recipient self row> on conflict (person_id) do update set ...`. The
   mirrored row carries the recipient's `house_system`, because per the confirmed
   decisions the recipient's own preference governs their own chart. The sender's
   UI labels it from `charts.house_system`, which is already how every surface in
   the app derives that label (`ENGINEERING.md` §12).
6. **Apply the share level.** `'chart'` leaves the birth columns null.
   `'details'` copies `birth_date`, `birth_time`, `birth_place`, `birth_lat`,
   `birth_lng`, `tz_offset_min` across. Either way `birth_precision` is set to
   the source precision.
7. **Create the grant.** One `connection_grants` row,
   `subject_user = v_uid`, `viewer_user = sender`,
   `viewer_person_id = <the row from step 4>`, `status = 'active'`,
   `source_invite = v_invite.id`.

The function does **not** touch mutual add. That is a separate call, by design.

### 3.5 Surfaces 4 and 5: mutual add, and grant management

**`add_sender_to_constellation(p_token text, p_relation text)`** returning
`(person_id uuid, reverse_grant_state text)`. Detailed in `§4`.

**`set_connection_share_level(p_grant_id uuid, p_share_level text)`** and
**`revoke_connection(p_grant_id uuid)`**: subject-only. Revoke strips the mirror
exactly as the purge does (delete the mirrored chart, null the birth fields,
`chart_source = 'local'`, `birth_precision = 'none'`, `linked_user_id = null`),
sets `status = 'revoked'` and `revoked_at`, and leaves the viewer a bare star
with their own label and relation intact.

**`approve_reverse_grant(p_grant_id uuid, p_share_level text)`**: for the
`pending` reverse direction in `§4.3`.

**`acknowledge_connect_accept(p_invite_id uuid)`**: sets `sender_ack_at`,
dismissing the notification card.

### 3.6 Web landing route

**`GET /connect/[token]`** is a new Next.js route, separate from
`/invite/[token]`.

Keeping them separate is deliberate. `/invite/[token]` is a public,
unauthenticated data-collection form for people who are explicitly *not* users;
this flow is the opposite mechanic and requires auth. Branching a shipped,
working page on a third kind risks regressing the birth-data flow for no
benefit, and it muddles the middleware story. A connect token pasted into
`/invite/<token>` should 308 to `/connect/<token>` so no link shape is a dead
end.

Auth handling: `/connect/*` is added to the middleware `needsAuth` list so an
anonymous visitor is redirected to `/login?next=/connect/<token>` and comes back
to the same place, which is the existing pattern. It is **not** added to the
entitlement gate; see `§9.1`.

`apps/web/app/.well-known/apple-app-site-association/route.ts` gains `/connect/*`
alongside the existing `/invite/*` and `/r/*` entries.

---

## 4. (c) Mutual add

### 4.1 Where exactly it happens

**After the accept transaction has committed, on its own screen, as its own
call.** Never as a checkbox on the confirm screen, never as a parameter to
`accept_connect_invite`.

The full recipient sequence:

| Step | Screen state | Server call |
| :---- | :---- | :---- |
| 1 | Opens `https://…/connect/<token>` | none |
| 2 | Signs up or signs in (returns to the same token) | Supabase auth |
| 3 | Adds their own birth details, if they have not already | existing person/chart insert |
| 4 | **Preview**: what the sender will and will not see, plus the details opt-in | `connect_invite_preview` |
| 5 | Confirms. Connection is now live in one direction | `connect-accept` |
| 6 | **Mutual-add prompt**, a distinct screen with its own heading | none yet |
| 7 | Optionally picks a relation and confirms | `add_sender_to_constellation` |
| 8 | Done | none |

Step 6 is reachable only after step 5 has succeeded, and declining at step 6
leaves a perfectly valid one-directional connection. The prompt has a real
"No thanks" affordance of equal visual weight, not a greyed-out escape hatch.
Skipping it is a normal outcome, not an error state.

Proposed copy for step 6, `FOUNDER-REVIEW`:

> **Add {Sender} to your constellation too?**
> You are connected. {Sender} can see your chart. This is separate: it puts
> {Sender} in your own sky, so you can read their chart and compare.
> *(If sender_shares_back is false:)* They have not shared their chart with
> you yet. You can add them now as a name you have chosen, and we will ask them.

### 4.2 What happens to `linked_user_id` on both sides

Write `S` for the sender's user id and `R` for the recipient's.

**At accept (step 5), one write:**

- In **S's galaxy**, the person row representing R (merged or newly created) gets
  `linked_user_id = R`, `chart_source = 'linked'`, and a mirrored `charts` row.
- In **R's galaxy**, nothing at all changes. R's `is_self` row is untouched. Its
  `linked_user_id` stays null forever, because `linked_user_id` means "this
  person row is that other account," and R's self row is R's own account, not
  another one.

**At mutual add (step 7), if R says yes:**

- A new person row is inserted in **R's galaxy** representing S, with
  `linked_user_id = S`, `relation = p_relation` as R chose it,
  `display_name` taken from S's self row, `is_self = false`.
- In **S's galaxy**, still nothing changes. The row S already has for R is
  untouched.

So after a full mutual add there are exactly two person rows carrying a
`linked_user_id`, one in each galaxy, each pointing at the *other* user. The
column is never set on a self row, and it is never set on both ends of the same
row. Each is independently revocable, and each is independently nulled by the
owner's account purge.

### 4.3 The reverse direction needs the sender's consent too

This is the one thing the confirmed decisions do not cover, and it has to be
settled before this is built.

Mutual add means R gets a person row for S. If that row carried S's chart
automatically, then S, who only ever asked to *see* R, would have been made
*visible* to R without being asked. That is the same silent-consent problem the
mutual-add decision exists to prevent, just pointed the other way.

**Proposed resolution: the sender answers it up front, defaulting to no.**

`invites.sender_shares_back` is set at generate time by a single question on the
share screen: *"If they add you back, share your chart with them?"* Default off.

- **`sender_shares_back = true`:** step 7 creates R's person row for S with
  `chart_source = 'linked'`, copies S's chart, and creates an `active`
  `connection_grants` row (`subject_user = S`, `viewer_user = R`). Immediate and
  symmetric.
- **`sender_shares_back = false`:** step 7 creates R's person row for S as a bare
  star (`birth_precision = 'none'`, `chart_source = 'local'`, no chart) but still
  sets `linked_user_id = S`, and creates a `connection_grants` row with
  `status = 'pending'`. S sees "Maya added you back and would like to see your
  chart" in the same in-app notification surface as the acceptance, with approve
  and decline. Approving calls `approve_reverse_grant`, which flips the grant to
  `active` and fills in the mirror.

This reuses the grant table and the notification surface already being built,
adds one boolean and one status value, and means nobody's chart moves without
that person having said yes to that specific person. The bare-star fallback is
honest: R can add S by name and relation, which R could do manually anyway, and
the app does not pretend to know S's chart.

The alternative, which the founder may prefer for a smoother loop, is to treat
sending an invitation as implied consent to be seen by that one recipient, and
default `sender_shares_back` to true. That is defensible because the sender
initiated. It is listed as open question `§9.3` rather than decided here.

---

## 5. (d) Mobile

Mobile has 11 route files, no `components/` directory, no `StyleSheet.create`,
no modals or sheets, and no stepped wizards. Every screen inlines styles built
from `@galaxia/ui` `tokens`. Matching this feature to the app means matching
those specific conventions, not importing a new UI idiom.

### 5.1 Screen 1: generate and share

**New route `app/(app)/connect.tsx`.** Inside the authed group, so the existing
gate applies.

Visually matches **`app/(app)/onboarding.tsx`**, which is the closest existing
flow (pick a relation, fill a form, save, see the result in a list):

- `ScrollView` on `tokens.colors.ink2`, `contentContainerStyle` of
  `{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 80, gap: 18 }`.
- Relation picker: the exact horizontal wrapped pill pattern from
  `onboarding.tsx`, mapping `GALAXY_RELATION_PICKER_OPTIONS`, gold border and
  gold label when selected, `tokens.colors.line` otherwise, `borderRadius: 999`,
  `paddingHorizontal: 12`, `paddingVertical: 8`.
- Merge offer: when the sender has bare-precision people whose names plausibly
  match, render them as the same selectable pill rows the person pickers in
  `compare.tsx` and `groups.tsx` use, above a "Create a new star instead"
  option. Explicit selection; nothing is preselected.
- Share-back question: the `Switch` row pattern from `onboarding.tsx`'s "This
  person is a minor" row, with the same `tokens.colors.mist2` 12pt explainer
  beneath it.
- Primary action: `primaryButtonStyle` / `primaryButtonLabel` from
  `onboarding.tsx` (gold fill, `borderRadius: 999`, `paddingVertical: 13`, ink
  label, 700 weight).
- Result state: the link plus a share button. **Use React Native's built-in
  `Share.share()`.** Mobile currently has no clipboard or sharing dependency, and
  `Share` is the native share sheet with zero new packages, which is the right
  affordance for "send this to one person."
- Outstanding invites list: the bordered `ink3` list-row pattern from
  `onboarding.tsx`'s constellation list, showing relation, expiry as a relative
  day count, and a regenerate action.
- Status line: single gold `Text`, as every data screen already does.

Entry points: a new pill in the `home.tsx` nav pill row (which already has
Onboarding, My profile, Compare, Groups, Vela, Settings), and a secondary action
on `profile/[personId].tsx` for a bare-precision person, which is the natural
place to start the merge path.

### 5.2 Screen 2: accept

**New route `app/connect/[token].tsx`, at the root, outside the `(app)` group.**

It must be outside `(app)` because `(app)/_layout.tsx` redirects a session-less
visitor to `/` and a visitor without entitlement to `/subscribe`, and a recipient
arriving from a link has neither yet. The screen owns its own gating.

Visually matches **`app/index.tsx`** and **`app/subscribe.tsx`**, the other two
pre-gate screens: `tokens.colors.ink` background, centered single column,
`ActivityIndicator` while loading.

Because mobile has no wizard pattern anywhere, and because `compare.tsx` and
`groups.tsx` both implement "configure, then result" as state on a single
screen, this screen is **one route with a phase state**, not a stack of pushes:

```
'loading' | 'needs_auth' | 'needs_self' | 'preview' | 'accepting' | 'mutual' | 'done' | 'error'
```

- `needs_auth` routes to `/` for sign-in and **persists the token in
  AsyncStorage** (`apps/mobile/src/lib/cache.ts` already wraps AsyncStorage JSON
  get and set) so the flow resumes after the auth round trip instead of dropping
  the invitation on the floor. This is the single highest-risk drop-off in the
  funnel.
- `needs_self` routes to `/onboarding` and resumes the same way.
- `preview` renders the `§3.3` disclosure in two `cardStyle` blocks, the "will
  see" one with the gold left border treatment used by "Today in your sky"
  (`borderLeftWidth: 2`, `borderLeftColor: tokens.colors.gold`, background
  `rgba(230,174,108,0.06)`), the "will not see" one plain on `line`. The details
  opt-in is a `Switch` row, off by default.
- `error` renders the specific `state` from the preview, not a generic message.

### 5.3 Screen 3: the mutual-add prompt

The `'mutual'` phase of the same route. It is visually a distinct full screen
with its own heading, so it reads as a separate question, but it is not a
separate route, which keeps the token, session, and resume logic in one place.

**It must not be an `Alert.alert`.** That is mobile's only current confirmation
pattern (used in `profile/[personId].tsx` and `groups.tsx` for deletes), and it
cannot hold a relation picker, and a two-button system alert is the wrong
register for a consent decision.

Contains: the heading and copy from `§4.1`, the same relation pill picker as
`connect.tsx`, a gold primary "Add {Sender}", and a "No thanks" that is a full
bordered button of equal size rather than a text link.

### 5.4 The notification card

On `home.tsx`, a new `cardStyle` block matching the **"This week"** relational
transit card exactly: card title, 12pt `mist2` subtitle, then rows with
`borderLeftWidth: 2`, `borderLeftColor: tokens.colors.goldSoft`, background
`rgba(230,174,108,0.06)`, `borderRadius: 10`. Tapping a row navigates to
`/profile/[personId]` for the newly connected person, the same as the transit
rows do. Dismiss calls `acknowledge_connect_accept`.

### 5.5 Mobile gaps this feature depends on

These are pre-existing and would block or degrade the flow:

1. **No progressive capture.** `onboarding.tsx` always calls `buildBirthInput`
   and its `BirthFields` has no `allowNone` tier, so **mobile cannot create a
   bare-precision person at all**. The merge-into-an-existing-node decision is
   therefore unreachable on the lead platform unless the sender created that node
   on web. Adding the "Add birth data later" tier to mobile's `BirthFields` is a
   prerequisite, not a nice-to-have.
2. **Mobile ignores the house-system preference.** `onboarding.tsx` hardcodes
   `houseSystem: "placidus"` instead of reading `profiles.house_system` the way
   `apps/web/lib/house-system.ts` does. The confirmed decision that "the
   recipient's own house-system preference applies going forward for their own
   account" is therefore **not currently true on mobile**, and since the mirrored
   chart carries the recipient's house system into the sender's galaxy, this bug
   would now propagate across accounts. Fix before, not after.
3. **No deep linking from an https URL.** `app.json` declares
   `"scheme": "galaxia"` but no `ios.associatedDomains` and no Android
   `intentFilters`, and there is no `assetlinks.json` in the repo, so a tapped
   `https://galaxiamea.com/connect/...` link cannot open the app today. The web
   AASA file lists `/invite/*` but the native side was never configured to match.
   Launch plan: the web `/connect/[token]` page is the universal landing and
   offers an "Open in Galaxia" button emitting `galaxia://connect/<token>`,
   mirroring the existing `apps/web/app/r/[slug]/page.tsx` bridge. Real universal
   links are a native config change that needs a team ID and an EAS build, and
   `app.json` still carries `"projectId": "replace-with-eas-project-id"`.
   `ENGINEERING.md` §2 governs that change.
4. **No site-URL env var.** Mobile needs `EXPO_PUBLIC_SITE_URL` to build the
   shareable link.

---

## 6. Merging into an existing bare star

Triggered at **generate** time, not accept time, because that is when the sender
is present and can make the call.

On the generate screen, before the link exists, the sender is shown their
existing people where `birth_precision = 'none'` and `linked_user_id is null`,
and asked whether this invitation is for one of them. Chosen row becomes
`invites.person_id`.

Matching is a **suggestion, never an action**. The repo has no dedupe logic of
any kind, and this plan does not add fuzzy matching that silently picks a row. A
case-insensitive trimmed name comparison may order the list; the sender always
selects explicitly, and "Create a new star instead" is always available.

At accept, the merge re-validates all three conditions (owned by sender, no
existing link, still `'none'`) and falls back to creating a new row if any has
changed since the link was made, because the sender may have edited or deleted
that person in the intervening fortnight.

Restricting merge targets to `birth_precision = 'none'` is deliberate. A person
the sender has already guessed birth data for is a different and harder case:
merging would overwrite data the sender entered, and the two may not even be the
same human. Deferred, and the generate UI should say so rather than silently
omitting those people from the list.

Note the interaction with `§5.5.1`: until mobile can create bare-precision
people, mobile senders will mostly see an empty merge list.

---

## 7. (f) Notification

The requirement is to notify the sender **in app** on accept, using existing
infrastructure. The relevant existing infrastructure is:

- `push_tokens` plus a raw `POST` to `https://exp.host/--/api/v2/push/send`,
  used by exactly one caller, the `relational-transit-push` cron route.
- Resend transactional email, with per-category consent columns, an unsubscribe
  token, and an idempotency ledger table per category.
- In-app content sections that read a domain table directly and render cards.
  There is **no notification table, no inbox, no unread count, and no bell**
  anywhere in the product.

### 7.1 In-app, at launch: read the invite row

No new table. The sender's home screen queries:

```sql
select ... from invites
 where from_user = auth.uid()
   and kind = 'constellation_connect'
   and status = 'accepted'
   and sender_ack_at is null
 order by accepted_at desc
```

backed by the partial index in `§2.2`, joined to the resulting person row for
the name and a tap target. Dismissal writes `sender_ack_at`.

This is the repo's own idiom rather than a new one. `relational_transits`
carries its own inline `push_sent_at` marker instead of a separate ledger, and
`RelationalTransitFeed` renders straight off the domain table with no unread
concept. Inventing a `notifications` table for one event type would be building
a notification system, which is precisely what the instruction says not to do.

The same card surface renders the two other events this feature produces: a
`pending` reverse grant awaiting the sender's approval (`§4.3`), and, if the
founder wants it, a revocation notice.

Surfaces: `apps/mobile/app/(app)/home.tsx` (matching "This week", per `§5.4`)
and `apps/web/app/app/page.tsx` (matching `RelationalTransitFeed`).

### 7.2 Push, at launch: through the edge function

The `connect-accept` edge function, after the RPC commits, reads the sender's
`push_tokens` rows with the service role and posts one Expo message per token,
reusing the exact message shape from
`apps/web/app/api/cron/relational-transit-push/route.ts`, with
`data: { type: "connect_accepted", inviteId }`.

Doing it in the edge function rather than a cron is the reason the edge function
exists. `ENGINEERING.md` §14 is the record of what happens when a route needs a
scheduler it does not have, and a daily sweep is the wrong latency for "your
invitation was accepted" anyway. A push failure is logged and swallowed; it never
fails the accept, because the connection is already committed and the in-app card
is the guaranteed channel.

Two things to note. Mobile has no
`Notifications.setNotificationHandler` and no tap handler, so a push today does
nothing when opened; that is pre-existing and worth fixing alongside. And the
push comment in the repo says the flow is untested on a real device.

### 7.3 Email: not at launch

Deliberately excluded. Every existing email category carries a consent column on
`profiles`, an unsubscribe token, RFC 8058 one-click headers, and an idempotency
ledger table, added by the CAN-SPAM compliance work. A new category needs all of
that plus copy review. The confirmed requirement is in-app. If the founder wants
an email later it is a clean follow-up, not a launch dependency.

---

## 8. (e) Web

**Reduced, but the accept path is at full parity and is not negotiable.**

The asymmetry is not about which platform matters more. It is that the two sides
of this flow have different audiences. The sender is an existing Galaxia user,
and the primary client is mobile. The recipient is, by definition, not a user
yet, and will open the link on whatever device the message arrived on, with no
app installed and, per `§5.5.3`, no working universal link even if they had one.
**The web accept page is the only landing every recipient can reach.** Shipping
this mobile-only would mean shipping a growth mechanic whose front door does not
open.

At launch:

| Surface | Web | Note |
| :---- | :---- | :---- |
| `/connect/[token]`: preview, confirm, mutual-add prompt | **Full parity** | The universal landing. Same three steps, same disclosure copy, same separate mutual-add step. |
| "Open in Galaxia" bridge on that page | Full | Mirrors `apps/web/app/r/[slug]/page.tsx`. |
| Accepted notification card on `/app` | Full | Matches `RelationalTransitFeed`. |
| Generate a link | **Reduced** | One entry point, an "Invite them to connect" action beside the existing `AskBirthData` on `/app/person/[id]`, prefilled with that person as the merge target. No standalone screen, no separate merge picker, no outstanding-invites list. |
| Manage and revoke grants | **Web first** | Lands in `/app/settings`, which already has the privacy block and the other consent toggles. Mobile settings follows. |

The reasoning for revoke landing on web first is that it is the recipient's
control, the recipient may well be a web-only user, and `/app/settings` already
exists as the place privacy controls live. It is a small screen: list the people
who can see your chart, the level, and a revoke button.

---

## 9. Open questions that need a human answer

These are genuinely undecided. Each one blocks part of the build.

**9.1 Does accepting require an active subscription or trial?**
Web middleware gates `/app/*` on `hasAccess`, and mobile's `(app)/_layout.tsx`
redirects to `/subscribe`. A brand-new recipient gets a 14-day trial from
`handle_new_user()`, so they pass. But an existing user with a lapsed trial would
be bounced to a paywall mid-acceptance.
*Recommendation:* auth required, entitlement **not** required, for the accept
screen only. Viewing the resulting chart falls under the normal gate. This
matches the existing rule that `/account` and `/subscribe` stay reachable after
a trial ends, and bouncing a new connection to a paywall kills the loop this
feature exists to create.

**9.2 Is connect offered for relations that usually mean a child?**
`GALAXY_RELATION_PICKER_OPTIONS` contains `child`, `grandchild`, `niece`, and
`nephew`. Minors cannot hold accounts (COPPA gate on signup, Terms §6), so a
minor cannot accept, and the generate call already refuses when the target person
is flagged `is_minor`. The question is whether those relation values should be
absent from the connect picker entirely, so the product never appears to invite a
child. This is a legal and product call, not a technical one.

**9.3 Default for `sender_shares_back`.** Off, as `§4.3` proposes, or on, treating
sending an invitation as consent to be seen by that one person? Off is the
conservative default and consistent with the repo's fail-closed convention. On is
a smoother loop.

**9.4 What does the sender see on the star before acceptance?**
When the sender merges into an existing bare node, that node sits unchanged for
up to 14 days. Should the constellation show a pending state on it? `ENGINEERING.md`
§13 says every visual difference must map to a real inspectable event, and an
outstanding invitation is one, so a pending treatment would be legitimate. It is
also extra canvas work on a perf-sensitive surface. Recommend deferring, and
surfacing outstanding invitations only in the list on the generate screen.

**9.5 Does the sender learn that a link expired unused?** Lazy expiry only fires
when someone opens the link, so an untouched invite stays `'pending'` in the
database past its expiry until read. The generate screen can compute the true
state from `expires_at` for display without any sweep. Confirm that is sufficient
and that no cron is wanted.

---

## 10. (g) Terms and Privacy Policy touchpoints

**Everything in this section must be resolved by a human before the
corresponding code ships.** Legal copy lives in `content/legal/privacy-policy.md`
and `content/legal/terms-of-service.md` and is rendered verbatim by
`apps/web/app/privacy/page.tsx` and `apps/web/app/terms/page.tsx`. The page files
say plainly not to hand-edit the wording there.

**10.1 Privacy Policy §5, "People who are not users." Currently false once this
ships.** It reads: *"The people you add generally do not have Galaxia accounts
and may not know they have been added. We rely on you as the source of their
information."* This feature creates a class of added people who **do** have
accounts, **do** know, and are themselves the source. The paragraph needs a new
case, not a tweak.

**10.2 Privacy Policy §5, "We do not contact the people you add."** This stays
true only if Galaxia never sends the invitation itself. The plan deliberately has
the sender send the link through their own channel, and there is no
Galaxia-sent invitation email in scope. **If an invitation email is ever added,
this sentence breaks and CAN-SPAM plus consent obligations attach to a
non-user's address.** Flagging it here so that decision is made knowingly rather
than as an implementation convenience.

**10.3 Privacy Policy §5, "Requests from people you have added."** It says our
ability to respond is limited because the information sits in a private account
and we cannot verify identity. For a linked account both of those limits are
gone: the subject is authenticated and can revoke without asking anyone. Needs a
sentence describing the self-service control.

**10.4 Privacy Policy §7, "With your direction."** Currently scoped to one-off
share links for "a chart or reading." A standing, revocable, automatically
refreshing grant of your chart into another user's account is a different
sharing mode and needs its own description, including that it updates when you
update your birth details and that it stops when you revoke.

**10.5 Privacy Policy §8, retention.** Needs to state what survives a revoke and
what survives account deletion. `§2.6` proposes: on either, the mirrored chart
and any shared birth fields are deleted from the other user's galaxy, and they
keep only the name and relation they themselves chose. That is a commitment and
should be written down before the code makes it true.

**10.6 Terms §6, "Adding other people, and your responsibilities."** The
representations are written entirely for the case where the user supplies someone
else's data without their involvement. A consented connection has a different
basis, and the indemnity in §13 should be scoped so it does not read as though
the sender is warranting data the recipient provided about themselves.

**10.7 Terms, new material on the invitation link itself.** That it is personal
and single use, that it expires in 14 days, that the sender can revoke it, that
accepting requires an account and acceptance of the Terms, and that a connection
can be ended by either side.

**10.8 Terms §6 and the COPPA age gate, in combination with open question
`§9.2`.** Whether the product offers to "invite" a relation that usually denotes
a child is a Terms-adjacent question even though minors cannot hold accounts.

**10.9 The disclosure copy in `§3.3` is a privacy representation, not UI text.**
"What they will not see" is a promise. It must be reviewed against the Privacy
Policy in the same pass so the two cannot contradict each other, and the code
must actually be incapable of the things the copy denies, which is the reason
`§1` chose not to send birth data at all.

**10.10 Subprocessors are unchanged.** No new vendor. Supabase already stores
this, and Expo is already listed for push. Nothing to add to the §7 table.

**10.11 All user-visible strings** in this feature are subject to
`ENGINEERING.md` §15 (no U+2014, enforced by
`packages/astro/src/__tests__/no-em-dash-user-copy.test.ts`) and should carry
`FOUNDER-REVIEW` tags until reviewed.

---

## 11. Proposed build order

Not approved, listed so the shape of the work is visible. Each phase is one
deployable, verifiable slice, per `ENGINEERING.md` §10.

| Phase | Contents | Gate before starting |
| :---- | :---- | :---- |
| Prerequisites | Mobile progressive capture tier; mobile reads `profiles.house_system`; `EXPO_PUBLIC_SITE_URL` | `§9` answered |
| 1. Schema | One migration: `invites` columns and constraints, `connection_grants`, `people.chart_source`, `galaxy_relations` seed, the two sync triggers, the `purge_own_account_data` edit | Plan approved |
| 2. Functions | The eight RPCs, with pgTAP or SQL-level tests for the atomic accept under concurrent callers | Phase 1 applied by a human, ledger parity green |
| 3. Web accept | `/connect/[token]`, middleware entry, AASA path, the `/invite` redirect | Legal copy in `§10` resolved |
| 4. Mobile generate and accept | `(app)/connect.tsx`, `connect/[token].tsx`, share sheet, AsyncStorage resume | Phase 3 live |
| 5. Mutual add | Both platforms, plus `approve_reverse_grant` | `§9.3` answered |
| 6. Notification | Edge function push, both in-app cards | Phase 5 live |
| 7. Revoke | `/app/settings` grant list, then mobile | Privacy Policy updated |

Migrations are applied by a human, never by CI, and the Migration Ledger Parity
check will be red between commit and apply. That is the designed behavior of
`ENGINEERING.md` §16, not a failure.

---

## 12. What this plan deliberately does not do

- It does not touch `kind = 'birth_data'`. That flow is shipped and working and
  every change here is additive around it.
- It does not use, revive, or repurpose `kind = 'shared_space'`. Removing that
  stub is a separate cleanup; note that an unmerged
  `chore/remove-shared-space-button` branch exists.
- It does not change `@galaxia/core hasAccess`, billing, or the paywall.
- It does not add fuzzy person matching or automatic merging.
- It does not add a notification table, an unread system, a new email category,
  or a new cron job.
- It does not change `.npmrc`, `next.config.mjs`, or add a `vercel.json`.
