## Admin role foundation, Phase 0 (branch `cursor/admin-role-foundation-9092`) — 2026-08-21

**Trigger**: The founder chose "me + future team members, real roles now" for the
admin tier (admin portal, content authoring, billing exceptions). This is the
SECURITY-CRITICAL gate everything else in that tier imports, so it had to be
diagnosed before any admin surface was built. Diagnosis (Phase 0 DIAGNOSE) found
no existing role/admin concept anywhere in the repo — no `role`/`is_admin`/`staff`
column or check, and no `carmen.r.corio@gmail.com` (or any founder-identity)
special case. The founder's only existing elevated access is `profiles.comped`
(entitlement — "can use the product"), which is a different question from
authorization ("can act on other users' data/billing") and was explicitly not
reused here.

`[ADDED]` **`admin_users` table** (migration
`20260821191500_admin_role_foundation.sql`, Galaxia `eigfvribtntbxyjutsma`):
`owner_id uuid primary key references auth.users(id)`, `role text not null
default 'admin'`, `created_at`. RLS enabled with **zero** policies for
anon/authenticated — the "no policy = no client access" pattern already proven
for `trial_emails`/`person_daily_nudges`, so this table is not client-readable
*or* client-writable under any path, not merely not-writable. Belt-and-suspenders:
`select/insert/update/delete` explicitly revoked from `anon, authenticated` too.
Only `service_role`/`postgres` can touch it. A dedicated table, not
`profiles.role` — `profiles` already carries billing columns that must never be
client-grantable, and authorization deserves its own home rather than one more
column on that list to defend forever.

`[ADDED]` **`admin_audit_log` table** (same migration): schema-only, reserved
shape for a future phase (`actor_id`, fixed-vocabulary `action`,
`target_user_id`, `before`/`after`/`metadata` jsonb, `created_at`). Same
service-only RLS posture. Nothing writes to it yet — no admin action exists in
this phase to log.

`[ADDED]` **First-admin bootstrap**, in the same migration: one `insert ...
on conflict (owner_id) do nothing` seeding the founder's `admin_users` row,
keyed to her stable `auth.users.id` (`8112465c-f74b-4842-9ef4-9d30e98d4ccb`) —
never her email, mirroring the same choice the `profiles.comped` founder grant
already made.

`[ADDED]` **`isAdmin(row)` in `@galaxia/core`** (`packages/core/src/is-admin.ts`,
re-exported from `packages/core/src/index.ts`): pure, fail-closed decision
function mirroring `hasAccess`/`profileAllowsAccess` — no row -> false, an
unrecognized role value -> false, only a recognized admin role -> true. No DB or
Supabase-client code in this function; unit-tested with no DB
(`packages/core/test/is-admin.test.ts`).

`[ADDED]` **`requireAdmin()` in `apps/web/lib/require-admin.ts`** — THE single
admin gate every admin surface must import. Reuses `requireUser()` (the existing
cookie-backed Supabase session auth) rather than reinventing auth, then reads
`admin_users` for the verified `auth.uid()` using a service-role client (same
construction as `api/cancel/route.ts`), and decides via the pure `isAdmin()`.
Redirects (fails closed) when not signed in or not an admin. Never trusts a
client-supplied role, header, cookie claim, or a prop from a parent. The
service-role read path is required, not optional: `admin_users` has no client
RLS policy, so a user-session read would return nothing for anyone, admin or
not — that would fail closed for the wrong reason.
`apps/web/lib/read-admin-row.ts` holds the small DB-read half (takes the client
as a parameter) so it can be exercised directly in tests without the
`server-only` import that blocks directly importing `require-admin.ts` itself
(same constraint documented in `nudge-compute-route-wiring.test.ts`).

`[ADDED]` Tests: `packages/core/test/is-admin.test.ts` (pure fail-closed unit
tests), `apps/web/lib/require-admin-wiring.test.ts` (source-level proof that
`requireAdmin` reuses real auth, reads via service-role, decides via `isAdmin`,
and fails closed), `apps/web/lib/read-admin-row.test.ts` (live-DB VERIFY:
proves a normal authenticated session cannot INSERT/UPDATE/SELECT `admin_users`
— the self-grant-admin exploit is impossible — and that the founder's real id
resolves `isAdmin() === true` via the service-role path only).

`[KNOWN OPEN — deliberately out of scope, Phase 0 boundary]` No admin portal UI,
user management, billing-write action, content authoring, or `/admin` route
exists yet. No route protection (middleware/layout guard) is wired up — there is
nothing under `/admin` to guard. `admin_audit_log` has no writer yet. This phase
is storage + the guard + the bootstrap only; the next phase builds on top of
`requireAdmin`/`isAdmin`, never re-derives the check.
