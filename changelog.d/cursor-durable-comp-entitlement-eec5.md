## Durable comp entitlement + profiles billing column lockdown (branch `cursor/durable-comp-entitlement-eec5`) — 2026-07-24

**Trigger**: Founder locked out after trial end; no durable complementary access
that billing sync cannot revoke. Diagnosis also found that `profiles` owner UPDATE
could self-set `subscription_status` (and would have been able to self-set
`comped`).

`[ADDED]` **`profiles.comped` boolean NOT NULL DEFAULT false** (migration
`20260724180000_comped_entitlement_and_profile_column_grants.sql`, Galaxia
`eigfvribtntbxyjutsma`). Independent of every billing field. Service-role only.

`[CHANGED]` **`@galaxia/core` `hasAccess`** = `comped || active || lifetime ||
(trialing && trial_ends_at > now)`. Single function; web middleware, `useViewer`,
and mobile `EntitlementProvider` all pass `comped` — no per-surface conditionals.

`[UNCHANGED]` **RevenueCat webhook / `mapRevenueCatEvent`** still write only
`subscription_status`, `current_period_end`, `plan`, `cancel_at_period_end`.
Never reads or writes `comped`. EXPIRATION can cancel billing; comped access
survives.

`[SECURITY]` **Owner UPDATE/INSERT on `profiles` restricted to
`id`, `display_name`, `house_system`.** Prior policy (row-level only):
`profiles owner read|upsert|update` with `id = auth.uid()` and table-level
UPDATE on all columns for `authenticated` + `anon`. Billing columns + `comped`
are no longer grantable to the owner role. Authenticated updates to
`subscription_status` / `comped` are rejected at the database.

**Owner write paths audited (still valid after lockdown):**
- `apps/web/app/account/page.tsx` — upsert `{ id, display_name }`
- `apps/web/app/app/settings/page.tsx` — upsert `{ id, house_system }`
- `apps/mobile/app/index.tsx` — upsert `{ id, display_name }`

**Service-role write paths (billing / comp):**
- `POST /api/webhooks/revenuecat` — four billing columns
- `POST /api/cancel` — `cancel_at_period_end` (switched from user client →
  service-role after auth, so the optimistic flag still works)
- `handle_new_user` trigger — trial defaults on signup

`[CHANGED]` **Settings (web + mobile)** show honest permanent-access copy for
comped accounts (FOUNDER-REVIEW), not a fake subscription or stale trial date.
Trial banner / Subscribe CTAs hidden when `comped`.

`[DATA]` Founder profile `8112465c-f74b-4842-9ef4-9d30e98d4ccb`: `comped = true`;
hand-set `trial_ends_at = 2099-01-01` replaced with `created_at + 14 days`.

`[KNOWN OPEN — deliberately out of scope]` Mobile has no global route lockout
when access is false; `vela-chat` edge function does not check entitlement; PDF
export is client-gated only. Track for a dedicated enforcement branch.
