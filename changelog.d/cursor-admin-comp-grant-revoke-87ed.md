## Admin comp grant/revoke, Phase 1 (branch `cursor/admin-comp-grant-revoke-87ed`) — 2026-08-23

**Trigger**: Phase 0 diagnosis (comp/lifetime grants) mapped the full read/write
surface of `profiles.comped`, the existing admin mutation pattern
(`resend-email` / `close`/`reopen` support requests), and found `comped=true`
would be data-lossy for a paid lifetime grant (a distinct, already-schema'd but
never-written `subscription_status = 'lifetime'` value exists). This phase
builds ONLY the comp grant/revoke action, cloning the existing admin action
pattern exactly. Lifetime-paid and coupons stay out of scope.

**LOCKED for this phase**: comp only, via `profiles.comped`. No
`subscription_status` write, no `lifetime` value touched, either direction.
Grant writes `comped = true` and nothing else; revoke (hard, no grace) writes
`comped = false` and nothing else.

`[ADDED]` **`grant_comp` / `revoke_comp` added to `ADMIN_AUDIT_ACTIONS`**
(`apps/web/lib/admin/audit-log.ts`). No migration: confirmed live against the
project (`eigfvribtntbxyjutsma`) that `admin_audit_log.action` has no CHECK
constraint or enum — only the `actor_id`/`target_user_id` foreign keys and the
primary key — so the closed vocabulary is TS-side only, same as the existing
four Stage 2 actions.

`[ADDED]` **`transitionComp` in `apps/web/lib/admin/comp.ts`** — clones
`transitionSupportRequest`'s read-validate-write shape exactly:
1. refuses a self-action (`SelfCompError`) before touching the database at
   all — closes the self-grant class on a money column, the same class the
   `20260724180000` migration's own postmortem flagged for billing columns
   generally.
2. reads the current row via service-role; `CompTargetNotFoundError` if
   absent.
3. no-op guard (`CompConflictError`): granting an already-comped row, or
   revoking a non-comped row, throws instead of silently re-stamping and
   firing a misleading audit entry.
4. writes ONLY `comped`, guarded on the expected prior value
   (`.eq("comped", expectedPrior)`) so a concurrent transition can't
   lost-update it — same protection `transitionSupportRequest` gets from
   `.eq("status", ...)`.
5. returns the updated row plus the resulting access state from the one
   shared `hasAccess` (via `profileAllowsAccess` from `@galaxia/core`) —
   never a second, inline access decision. For revoke this is the real
   proof point: on a stale-trialing account (the actual founder/comp
   shape), access drops to `false` the instant the write lands, with no
   grace.

`[ADDED]` **Two routes**, cloning `resend-email/route.ts` exactly:
`POST /api/admin/users/[id]/comp/grant` and `.../comp/revoke`. Each calls
`requireAdminApi()` itself (the per-route 403 proof point, independent of the
`/admin` layout guard), maps `SelfCompError`→403, `CompTargetNotFoundError`→404,
`CompConflictError`→409, missing service-role env→500, writes exactly one
`admin_audit_log` row (`actorId` from the guard's verified session, never the
request body; `metadata: { resulting_access }` from the real `hasAccess`
result) in the same function as the mutation, and 500s (not 200) if that
audit write fails.

`[ADDED]` **Admin UI**: `CompActionButton`
(`apps/web/components/admin/comp-action-button.tsx`), wired into
`/admin/users`' existing per-row Actions column alongside `ResendEmailButton`.
The button's own label and its confirm-dialog copy are both derived from the
row's real `comped`/`subscription_status`/`trial_ends_at` via the same
`profileAllowsAccess` (`@galaxia/core`) the rest of the product uses — a
revoke that would leave the user with no real access says so plainly; a
revoke on an account that also has genuine active billing or a live trial
says access continues instead. No hardcoded claim about the resulting state
(ENGINEERING.md §12).

`[UNCHANGED]` The settings/account banners (`apps/web/app/app/settings/page.tsx`,
`apps/web/app/account/page.tsx`, `apps/web/components/trial-banner.tsx`)
needed no change — they already read real `comped` state per the Phase 0
dump.

`[ADDED]` Tests: `apps/web/lib/admin/comp.test.ts` (pure/mocked unit tests —
self-refusal, no-op conflict, guarded write, `hasAccess` crossing incl.
revoke-on-live-trial and revoke-on-active-billing staying entitled);
`apps/web/lib/admin/comp-route-wiring.test.ts` (source-level proof both
routes call `requireAdminApi()` themselves, never write `profiles` directly,
map errors to the LOCKED status codes, audit in the same function, and that
`transitionComp` itself has exactly one `.update({ comped: ... })` call);
`apps/web/lib/admin/audit-log.test.ts` extended for the two new actions;
`apps/web/lib/admin/comp-verify.test.ts` (live-DB VERIFY against the real
project, same pattern as `resend-email-verify.test.ts` — self-action refused
before any write, no-op refused without a stray audit row, grant/revoke each
leave every other `profiles` column byte-identical, exactly one audit row per
real transition, and revoke on a seeded stale-trialing row drops `hasAccess`
to `false` immediately). `pnpm --filter web test` and `pnpm typecheck` both
pass; live-verify tests ran against `eigfvribtntbxyjutsma` and all created
QA users/audit rows were deleted in `afterAll` (confirmed zero residue after
the run).

`[KNOWN OPEN — deliberately out of scope, per the founder's lock]` Lifetime-paid
grants (a real `subscription_status = 'lifetime'` write) and coupons are not
built here. No revoke grace period exists by design (hard revoke). This phase
does not add a UI affordance to see `admin_audit_log` history for a user —
only the grant/revoke controls themselves.
