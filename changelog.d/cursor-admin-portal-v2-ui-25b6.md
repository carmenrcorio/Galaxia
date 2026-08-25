## Admin portal v2 UI: narrowed user list, per-user detail page, audit history (branch `cursor/admin-portal-v2-ui-25b6`) — 2026-08-25

**Trigger**: Phase 0 diagnosis of the v1 admin user list (9 columns, per-row
action buttons, an `overflowX: auto` crutch) confirmed the list had grown
into a control panel instead of a directory, and that `admin_audit_log` — the
audit trail two admin actions have been writing since Stage 2/comp Phase
1 — had no reader anywhere in the codebase. This build is scoped to table
narrowing + a new detail page + the first audit-history viewer only. The
search-returns-wrong-users bug is out of scope and untouched; search logic
in `list-users.ts` was not modified.

**HARD BOUNDARY (carried forward)**: the detail page is an
account-management surface. It reads `auth.users`, `profiles`, and
`admin_audit_log` ONLY — never `people`, `notes`, `threads`, or any Vela
table. `AdminUserRow`'s exclusion doc-comment intent (list-users.ts) is
repeated verbatim on the new reader/page. There is no "view this user's
people" view anywhere in the portal and this build does not create one
(proven by `get-user-detail-wiring.test.ts` / `user-detail-page-wiring.
test.ts` grepping both readers plus the page for the forbidden table names).

`[CHANGED]` **`/admin/users` narrowed to exactly 5 columns**
(`apps/web/app/admin/users/page.tsx`): Email, Status, Comped, Created, and a
trailing "View" affordance. Name, Trial ends, Timezone, Nudge emails, and the
per-row Resend-email/Comp action buttons moved to the new detail page.
`table-layout: fixed` with an explicit `<colgroup>` (new `.admin-table--fixed`
modifier) replaces the `overflowX: auto` crutch — the table can no longer
grow past its `.glass-card`. The blanket `white-space: nowrap` on
`.admin-table td` (globals.css) is removed (it was what widened every cell
to fit its longest value); a new `.admin-table-email-cell` class applies
`overflow: hidden; text-overflow: ellipsis; white-space: nowrap` to the
Email cell only, so a long address truncates instead of stretching the row.
Status renders as a colored pill (`pill-status--success/warning/danger`,
reusing the `--teal`/`--gold`/`--rose` tokens — active/lifetime = success,
trialing = warning, canceled/past_due = danger); Comped renders yes/no
(`pill-status--accent`/`pill-status--muted`). The whole row is a link to
`/admin/users/[id]`: the trailing cell holds one real `<Link>` stretched via
`position: absolute; inset: 0` (new `.admin-table--rows-clickable`
modifier, opt-in so the unrelated `/admin/support` table is untouched) so a
click anywhere on the row navigates, with no client component needed.

`[ADDED]` **`lib/admin/status-pill.ts`** — pure `statusPillInfo`/
`compPillInfo` mapping shared by the list and the detail page's metric
cards, so the two surfaces can't drift on what counts as "good standing"
vs "trouble." `components/admin/status-pill.tsx` renders the mapping as a
pill; no hooks, so it renders fine inside either server component.

`[ADDED]` **`/admin/users/[id]` detail page** (new:
`apps/web/app/admin/users/[id]/page.tsx`). Server component, nests under
`app/admin/layout.tsx` — no guard call of its own, same convention
`admin/users/page.tsx` and `admin/support/page.tsx` document for themselves
(proven by `user-detail-page-wiring.test.ts`). No new `/api` route: the read
happens directly in the server component, same as `listAdminUsers` does.
Layout matches the approved mock: back link to `/admin/users`; header with
an initials avatar + full email + "name · created date"; a 4-up metric card
row (Status, Comped, Trial ends, Last sign-in); a secondary key/value table
(Plan, Tier, Cancel at period end, Current period end, House system,
Timezone, Nudge emails, Email confirmed, Stripe customer); an actions row;
then admin action history. A not-found id renders a clean "User not found"
state instead of throwing.

`[ADDED]` **`lib/admin/get-user-detail.ts`** (`getAdminUserDetail`) —
mirrors `list-users.ts`'s two-source join (Auth Admin API for
`email`/`created_at`/`last_sign_in_at`/`email_confirmed_at`, `profiles` for
everything else) for a single user by id. Extends `AdminUserRow`'s field
set with the seven currently-unused `profiles` columns the approved layout
calls for: `subscription_tier`, `plan`, `cancel_at_period_end`,
`current_period_end`, `house_system`, `stripe_customer_id`,
`stripe_subscription_id` (all confirmed to exist via their own migrations;
no schema change here). Returns `null` on an unresolved id rather than
throwing. Imports `server-only`, same as `list-users.ts`; proven via a
source-read wiring test (`get-user-detail-wiring.test.ts`) rather than a
direct import, same constraint `require-admin-wiring.test.ts` documents.

`[ADDED]` **`lib/admin/read-audit-history.ts`** (`readAdminAuditHistory`) —
the FIRST reader of `admin_audit_log` (every existing caller before this
only wrote it). Queries rows by `target_user_id`, newest first, and
resolves each distinct `actor_id` to an email via the Admin API's
`getUserById` (same Admin-API source `listAdminUsers` uses for its own
emails); renders the bare UUID (`actorEmail: null`) instead of dropping the
row when an actor can no longer be resolved. Takes an already-constructed
service-role client (mirrors `writeAdminAuditLog`'s shape) so it needs no
`server-only` import and is directly unit-testable with a mocked client
(`read-audit-history.test.ts`, 7 cases: query shape, per-distinct-actor
resolution, unresolved-actor fallback, empty history, and query-failure
propagation).

`[ADDED]` **`humanizeAuditAction`** (`lib/admin/audit-log.ts`) — one label
per entry in the closed `ADMIN_AUDIT_ACTIONS` vocabulary (e.g. `grant_comp`
→ "Granted comp access"), falling back to the raw action string for
anything outside that vocabulary rather than a misleading label. Tested
alongside the existing `audit-log.test.ts` suite.

`[DECISION — NEVER-FABRICATE, ENGINEERING.md §12]` `admin_audit_log.before`/
`after` are `null` on every existing row (no writer populates them yet).
The audit table renders explicit Before/After columns, and a `null` value
renders as "Unknown" — never inferred as "no change" and never a
synthesized diff. `read-audit-history.ts`'s own doc comment states this
NEVER-FABRICATE contract; `read-audit-history.test.ts` has a dedicated case
proving `null` passes through as `null`, not a guessed value.

`[ADDED]` Empty state for a user with no audit rows: "No admin actions
recorded for this user." (FOUNDER-REVIEW tagged, per ENGINEERING.md §7/§12
authored-copy convention). No em dashes in any new copy string.

`[UNCHANGED]` `list-users.ts`'s search implementation (the
`searchAuthUsersByEmail` filter path) was not touched — the
search-returns-wrong-users bug is explicitly out of scope for this build.

`[ADDED]` Tests, all pure/mocked (no live DB, nothing under
`*.live.test.ts`): `lib/admin/status-pill.test.ts`,
`lib/admin/read-audit-history.test.ts`, extensions to
`lib/admin/audit-log.test.ts` for `humanizeAuditAction`, and three
source-read wiring tests (`get-user-detail-wiring.test.ts`,
`user-detail-page-wiring.test.ts`, extending the existing wiring-test
pattern) proving the HARD BOUNDARY and the no-guard-in-page convention.
`pnpm --filter web test` and `pnpm typecheck` both pass; the default suite
still discovers zero `*.live.test.ts` files and needs no live Supabase
credentials (verified with `NEXT_PUBLIC_SUPABASE_URL` /
`SUPABASE_SERVICE_ROLE_KEY` etc. all unset).
