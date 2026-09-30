# Galaxia Supabase Security Audit — Phase 1

**Date:** 2026-09-30  
**Scope:** Production project `eigfvribtntbxyjutsma` (live SQL via Supabase MCP), `supabase/migrations/`, `apps/web`, `apps/mobile`  
**Method:** Read-only audit — no schema or application changes  
**Reference:** Sep 12 audit items (S8 `auth.uid()` wrapping, `purge_own_account_data` / `thread_participants`)

---

## Executive summary

All **35** tables in `public` have **RLS enabled**; none have **FORCE ROW LEVEL SECURITY**. User-owned data is overwhelmingly gated by owner-scoped policies with `(select auth.uid())`. Service-role-only tables intentionally have RLS enabled and **zero policies** (default deny for `anon` / `authenticated`). No **Critical** client exposure of `service_role` was found. The Sep 12 **`auth.uid()` wrapping** and **`thread_participants` purge ordering** issues appear **resolved** in production.

Remaining attention areas: **caller-supplied rate-limit parameters** on SECURITY DEFINER RPCs, **broad table-level GRANTs** (mitigated by RLS), **SECURITY DEFINER RPC surface** exposed to `authenticated`, and **migration version string drift** between the git tree and the production migration ledger (content may still match).

---

## Section A — RLS coverage

### A.0 Inventory (production)

| Table | RLS enabled | RLS forced | Policies (count) | Notes |
|-------|-------------|------------|------------------|-------|
| `account_export_rate_limits` | yes | no | 1 | SELECT owner only; writes via RPC |
| `admin_audit_log` | yes | no | 0 | Service-role only (intentional) |
| `admin_users` | yes | no | 0 | Service-role only (intentional) |
| `blog_email_captures` | yes | no | 0 | Service-role only (intentional) |
| `chart_leads` | yes | no | 0 | Service-role only (intentional) |
| `charts` | yes | no | 3 | SELECT/INSERT/UPDATE via owned `people` |
| `comparison_history` | yes | no | 1 | ALL owner |
| `connection_grants` | yes | no | 2 | SELECT subject/viewer only |
| `constellation_letters` | yes | no | 0 | Service-role / cron (intentional) |
| `daily_nudge_emails` | yes | no | 0 | Cron ledger (intentional) |
| `early_access` | yes | no | 1 | Anon INSERT waitlist only |
| `email_campaigns` | yes | no | 0 | Admin service-role (intentional) |
| `email_sends` | yes | no | 0 | Service-role (intentional) |
| `email_templates` | yes | no | 0 | Admin service-role (intentional) |
| `galaxy_relations` | yes | no | 0 | Lookup; DEFINER RPCs only (intentional) |
| `group_members` | yes | no | 3 | Via owned `groups` + `people` |
| `groups` | yes | no | 1 | ALL owner |
| `invites` | yes | no | 1 | ALL sender (`from_user`) |
| `memorial_milestones` | yes | no | 1 | ALL owner + owned person |
| `messages` | yes | no | 2 | Participant (consented) or thread owner |
| `notes` | yes | no | 1 | ALL owner |
| `people` | yes | no | 1 | ALL owner |
| `person_daily_nudges` | yes | no | 1 | ALL owner + owned person |
| `posts` | yes | no | 1 | Public SELECT published |
| `profiles` | yes | no | 3 | Owner read/insert/update |
| `push_tokens` | yes | no | 1 | ALL owner |
| `quick_share_snapshots` | yes | no | 0 | Service-role routes only (intentional) |
| `relational_transits` | yes | no | 1 | ALL owner |
| `relationships` | yes | no | 1 | ALL owner + endpoint people |
| `support_requests` | yes | no | 1 | INSERT owner (`authenticated` role) |
| `synastry` | yes | no | 1 | ALL owner + endpoint people |
| `thread_participants` | yes | no | 4 | Own row or thread owner |
| `threads` | yes | no | 1 | ALL owner |
| `transits` | yes | no | 3 | Via owned `people` |
| `trial_emails` | yes | no | 0 | Cron ledger (intentional) |
| `vela_rate_limits` | yes | no | 1 | SELECT owner; writes via RPC |

**View:** `admin_adoption_metrics` — not a table; RLS N/A; revoked from `anon`/`authenticated`, `SELECT` for `service_role` only (see migration `20260915021648_admin_adoption_metrics.sql`).

### A.1 RLS disabled

**None.** No finding.

### A.2 RLS enabled, zero policies

| Table | Severity | Assessment |
|-------|----------|------------|
| `admin_audit_log`, `admin_users` | Info | Documented service-role-only; column/table REVOKE on client roles (`20260821191500_admin_role_foundation.sql`, `20260914140000_pin_search_path_and_revoke_trigger_execute.sql`). |
| `blog_email_captures`, `chart_leads` | Info | Marketing capture; server routes only. |
| `constellation_letters`, `daily_nudge_emails`, `trial_emails`, `email_*` | Info | Cron / admin writers; no client path. |
| `galaxy_relations` | Info | Static lookup; UI uses TypeScript constants; RPC validates against table as DEFINER. |
| `quick_share_snapshots` | Info | Token lookup via service-role API only. |

Supabase security advisor `rls_enabled_no_policy` reports the same 12 tables (INFO level).

### A.3 Full policy listing (production)

Policies below are **PERMISSIVE**; role `{public}` means all roles unless a narrower role is set.

#### `account_export_rate_limits`

- **account_export_rate_limits owner read** — `SELECT` — USING: `user_id = (select auth.uid())`

#### `charts`

- **charts via owned person read** — `SELECT` — USING: EXISTS owned `people` for `person_id`
- **charts via owned person write** — `INSERT` — WITH CHECK: same EXISTS
- **charts via owned person update** — `UPDATE` — USING / WITH CHECK: same EXISTS  
- *(No DELETE policy — client DELETE denied by default.)*

#### `comparison_history`

- **comparison_history owner all** — `ALL` — USING / WITH CHECK: `owner_id = (select auth.uid())`

#### `connection_grants` (role `{authenticated}` only)

- **connection_grants subject read** — `SELECT` — USING: `subject_user = (select auth.uid())`
- **connection_grants viewer read** — `SELECT` — USING: `viewer_user = (select auth.uid())`  
- *(No INSERT/UPDATE/DELETE — mutations via SECURITY DEFINER RPCs.)*

#### `early_access`

- **anon can insert waitlist** — `INSERT` — role `{anon}` — WITH CHECK: `true`  
- *(No SELECT/UPDATE/DELETE policies.)*

#### `group_members`

- **group members via owner group read** — `SELECT`
- **group members via owner group write** — `INSERT` — WITH CHECK: owned group AND owned person
- **group members via owner group delete** — `DELETE`

#### `groups`, `notes`, `people`, `push_tokens`, `relational_transits`, `threads`

- **\* owner all** — `ALL` — USING / WITH CHECK: `owner_id = (select auth.uid())`  
  (`relationships` / `synastry` add WITH CHECK that both endpoint people are owned.)

#### `invites` (role `{authenticated}`)

- **invites owner manage** — `ALL` — USING: `from_user = (select auth.uid())` — WITH CHECK: `from_user = (select auth.uid())` AND (`person_id` IS NULL OR owned person)

#### `memorial_milestones`, `person_daily_nudges`

- **\* owner all** — `ALL` — USING / WITH CHECK: `user_id`/`owner_id = (select auth.uid())` AND owned `people` row for `profile_id` / `person_id`

#### `messages`

- **messages via participant read** — `SELECT` — participant (consented, not left) OR thread owner
- **messages via participant write** — `INSERT` — WITH CHECK: same  
- *(No UPDATE/DELETE policies.)*

#### `posts` (roles `{anon,authenticated}`)

- **posts public read published** — `SELECT` — USING: `status = 'published'`

#### `profiles`

- **profiles owner read** — `SELECT` — `id = (select auth.uid())`
- **profiles owner upsert** — `INSERT` — WITH CHECK: `id = (select auth.uid())`
- **profiles owner update** — `UPDATE` — USING / WITH CHECK: `id = (select auth.uid())`

#### `support_requests` (role `{authenticated}`)

- **support_requests owner insert** — `INSERT` — WITH CHECK: `owner_id = (select auth.uid())`

#### `thread_participants`

- **thread participants own row read** — `SELECT` — own row OR thread owner
- **thread participants owner insert** — `INSERT` — WITH CHECK: thread owner
- **thread participants own row update** — `UPDATE` — own row OR thread owner
- **thread participants own or owner delete** — `DELETE` — own row OR thread owner

#### `transits`

- Same pattern as `charts` (SELECT, INSERT, UPDATE via owned person; no DELETE).

#### `vela_rate_limits`

- **vela_rate_limits owner read** — `SELECT` — `user_id = (select auth.uid())`

### A.4 Permissive / over-broad policies

| ID | Severity | Table | Description | Proof | Recommended fix |
|----|----------|-------|-------------|-------|-----------------|
| A-01 | Info | `posts` | Intentional public read of published content. | `USING (status = 'published')` for `{anon,authenticated}` | None if only published fields are present; keep drafts out of this table or add stricter policy. |
| A-02 | Medium | `early_access` | Anon can INSERT any row with no column constraints in RLS. | Policy **anon can insert waitlist**: `WITH CHECK (true)` | Add WITH CHECK on allowed columns (e.g. email format), rate limit at API layer, or move waitlist to Edge/API-only insert. |

No SELECT policy with an empty USING clause was found on user-data tables.

---

## Section B — RLS policy correctness

### B.1 `(select auth.uid())` wrapping (Sep 12 S8)

**Status: RESOLVED in production.**

Migration `20260913030100_wrap_auth_uid_in_rls_policies.sql` rewrote owner-scoped policies. Production policies use the form `( SELECT auth.uid() AS uid)` throughout (verified via `pg_policies`).

| ID | Severity | Table / function | Description | Proof | Recommended fix |
|----|----------|------------------|-------------|-------|-----------------|
| B-01 | Info | All RLS policies | No unwrapped `auth.uid()` in policy qual/with_check. | Production query for bare `auth.uid()` in policies returned only subselect form. | Maintain pattern for new policies. |

*(Functions still use `uid uuid := auth.uid();` internally — correct for PL/pgSQL.)*

### B.2 Ownership / join correctness

| ID | Severity | Table | Description | Proof | Recommended fix |
|----|----------|-------|-------------|-------|-----------------|
| B-02 | Info | `profiles` | Uses `id = auth.uid()` (profile PK is user id) — correct. | **profiles owner read**: `id = (select auth.uid())` | — |
| B-03 | Info | `memorial_milestones` | Uses both `user_id` and `profile_id` joined to owned `people` — correct. | Policy requires `user_id = auth.uid()` AND `people.owner_id = auth.uid()` for `profile_id` | — |
| B-04 | Info | `connection_grants` | Read scoped to `subject_user` / `viewer_user`, not `person_id`. | SELECT policies on `subject_user` / `viewer_user` | — |
| B-05 | Info | `invites` | Scoped to sender `from_user`, not recipient; recipient flow uses DEFINER RPCs. | **invites owner manage**: `from_user = (select auth.uid())` | — |

No policy comparing `auth.uid()` to a wrong column (e.g. person id vs owner id) was identified.

### B.3 INSERT without WITH CHECK

| ID | Severity | Table | Description | Proof | Recommended fix |
|----|----------|-------|-------------|-------|-----------------|
| B-06 | Info | — | All INSERT policies except none missing WITH CHECK on user tables. | `charts`, `profiles`, `messages`, etc. define WITH CHECK | — |

### B.4 UPDATE/DELETE vs SELECT permissiveness

| ID | Severity | Table | Description | Proof | Recommended fix |
|----|----------|-------|-------------|-------|-----------------|
| B-07 | Info | `charts`, `transits` | UPDATE matches SELECT; DELETE not granted (default deny). | Same EXISTS clause on SELECT and UPDATE | Optional: add explicit DELETE if product needs it via client. |
| B-08 | Info | `messages` | INSERT/SELECT aligned; no UPDATE/DELETE (cannot modify rows via PostgREST). | Only participant read/write policies | — |
| B-09 | Info | `thread_participants` | UPDATE/DELETE OR-clauses match SELECT. | Same OR for owner/participant | — |

### B.5 Policies using `true`

| ID | Severity | Table | Description | Proof | Recommended fix |
|----|----------|-------|-------------|-------|-----------------|
| B-10 | Medium | `early_access` | INSERT WITH CHECK `true` for anon (not SELECT). | See A-02 | Tighten WITH CHECK or route through server-only insert. |

---

## Section C — Functions & SECURITY DEFINER

### C.1 SECURITY DEFINER inventory (public, production)

| Function | Auth check | Scope | Callable by `authenticated` | Notes |
|----------|------------|-------|------------------------------|-------|
| `accept_connect_invite` | `auth.uid()` | Token + not self; atomic invite update | yes | Writes grants/people/charts as DEFINER |
| `acknowledge_connect_accept` | yes | `from_user = uid` | yes | |
| `add_sender_to_constellation` | yes | Accepted invite for uid | yes | |
| `approve_reverse_grant` | yes | `subject_user = uid`, pending grant | yes | |
| `check_and_increment_account_export_rate` | yes | `user_id = uid` only | yes | See C-03 |
| `check_and_increment_vela_rate` | yes | `user_id = uid` only | yes | See C-03 |
| `connect_invite_preview` | yes | Token metadata only | yes | No full invite row leak to other senders |
| `create_connect_invite` | yes | `from_user = uid`, owned person | yes | Rate limit 10/24h in function |
| `delete_own_group` | yes | `owner_id = uid` | yes | |
| `delete_own_person` | yes | `owner_id = uid`, not `is_self` | yes | |
| `purge_own_account_data` | yes | Full account purge + `auth.users` | yes | See C-02 |
| `revoke_connect_invite` | yes | `from_user = uid` | yes | |
| `revoke_connection` | yes | `subject_user = uid` | yes | |
| `set_connection_share_level` | yes | `subject_user = uid`, active | yes | |
| `enforce_support_request_rate_limit` | trigger | N/A | no | Trigger on insert |
| `handle_new_user` | trigger | N/A | no | Auth signup |
| `mark_chart_lead_conversions` | none | Batch job | no (`service_role` only) | Reads `auth.users` email |
| `mark_new_user_chart_lead_converted` | trigger | N/A | no | |
| `sync_linked_chart_mirrors` | trigger | Active grants | no | Updates other users' mirror charts |
| `sync_linked_person_mirrors` | trigger | Active grants | no | Updates mirror birth fields by share level |
| `rls_auto_enable` | event trigger | DDL | no | Enables RLS on new public tables |

All reviewed DEFINER RPCs derive identity from `auth.uid()`; none accept a caller-supplied `user_id` / `profile_id` as the authorization root.

SQL injection: functions use PL/pgSQL parameters and static SQL; relation strings validated against `galaxy_relations`. No dynamic SQL concatenation from raw user input was observed.

### C.2 `purge_own_account_data` (Sep 12 thread_participants FK)

**Status: RESOLVED in production.**

| ID | Severity | Function | Description | Proof | Recommended fix |
|----|----------|----------|-------------|-------|-----------------|
| C-01 | Info | `purge_own_account_data` | Deletes `thread_participants` where `user_id = uid` **before** `delete from auth.users`. | Production function body includes: `delete from thread_participants where user_id = uid;` then later `delete from auth.users where id = uid;` | Keep ordering when extending purge. |
| C-02 | Medium | `purge_own_account_data` | Any authenticated user can invoke RPC directly (PostgREST), deleting login + all data without app-layer confirmation. | `has_function_privilege('authenticated', …, 'EXECUTE')` = true | Require re-auth/password confirmation in RPC, or restrict EXECUTE to service_role and route deletes only via `/api/account/delete`. |

Deletion order also explicitly clears NO ACTION FKs (`linked_user_id`, mirrors, messages before threads, etc.) per production definition.

### C.3 Caller-supplied parameters on DEFINER RPCs

| ID | Severity | Function | Description | Proof | Recommended fix |
|----|----------|----------|-------------|-------|-----------------|
| C-03 | High | `check_and_increment_vela_rate`, `check_and_increment_account_export_rate` | `p_limit` and `p_window_seconds` are caller-controlled; authenticated may call RPC directly and pass inflated limits or tiny windows. | Function signatures: `(p_limit integer, p_window_seconds integer)`; both use `count < p_limit` in UPDATE | Hardcode caps/windows inside the function or reject parameters not matching server constants. |
| C-04 | Low | `create_connect_invite`, connect RPCs | User-supplied `p_token` / `p_relation` — token is high entropy; relation validated against `galaxy_relations`. | `accept_connect_invite`: `where token = p_token …`; invalid relation raises exception | Monitor brute force on tokens; optional rate limit per IP at API. |

### C.4 Trigger DEFINER functions

| ID | Severity | Function | Description | Proof | Recommended fix |
|----|----------|----------|-------------|-------|-----------------|
| C-05 | Info | `sync_linked_*` | DEFINER triggers propagate chart/person changes to connected viewers by design; bypass RLS on mirror rows. | Trigger bodies update `charts` / `people` for `connection_grants.status = 'active'` | Ensure share_level gating stays in sync (already gates birth columns on `details`). |

Supabase advisor **Signed-In Users Can Execute SECURITY DEFINER Function** flags 14 RPCs (WARN) — expected for this architecture; security relies on internal `auth.uid()` checks.

---

## Section D — Grants & roles

### D.1 `anon` role

Table-level grants follow Supabase defaults: **INSERT/SELECT/UPDATE/DELETE** on most app tables, but **RLS denies** almost all access.

Effective anon access via policies:

| Operation | Table | Via policy |
|-----------|-------|------------|
| INSERT | `early_access` | **anon can insert waitlist** |
| SELECT | `posts` | Published posts only |

`anon` has **no** SELECT on `admin_audit_log` / `admin_users` (table privileges revoked).  
`anon` has table SELECT grant on `connection_grants` but **no policy** → denied.

| ID | Severity | Role | Description | Proof | Recommended fix |
|----|----------|------|-------------|-------|-----------------|
| D-01 | Low | `anon` | Broad table GRANTs are standard; security depends entirely on RLS. | `information_schema.role_table_grants` shows ALL on `people`, etc. | Optional hardening: REVOKE default privileges and grant minimal table ops per table. |
| D-02 | Medium | `anon` | Waitlist spam / arbitrary row insert on `early_access`. | INSERT policy WITH CHECK `true` | See A-02 / B-10. |

### D.2 `authenticated` role

RLS is the primary control. Notable **column-level** restrictions on `profiles` (production):

- **UPDATE/INSERT** allowed on owner preference columns (`display_name`, `house_system`, `timezone`, onboarding fields, email toggles, `app_tour_seen_at`, etc.).
- **No UPDATE** on billing/comp columns: `subscription_status`, `comped`, `plan`, `trial_ends_at`, `stripe_*`, `cancel_at_period_end`, `current_period_end` (SELECT only).
- Aligns with intent of `20260724180000_comped_entitlement_and_profile_column_grants.sql` and later profile column migrations.

| ID | Severity | Role | Description | Proof | Recommended fix |
|----|----------|------|-------------|-------|-----------------|
| D-03 | Info | `authenticated` | No table without RLS; no bypass via missing RLS. | All public tables `relrowsecurity = true` | — |
| D-04 | Info | `authenticated` | `connection_grants`: SELECT only by policy; mutations via RPC. | No INSERT/UPDATE policies | — |

### D.3 `service_role` in client code

Searched `apps/web` and `apps/mobile` for `service_role`, `SUPABASE_SERVICE_ROLE`, and server env usage.

| ID | Severity | Location | Description | Proof | Recommended fix |
|----|----------|----------|-------------|-------|-----------------|
| D-05 | Info | `apps/web` | `SUPABASE_SERVICE_ROLE_KEY` used only in server modules (`lib/env.server.ts`, API routes, admin pages as Server Components, live tests). | e.g. `apps/web/lib/env.server.ts`: `process.env.SUPABASE_SERVICE_ROLE_KEY` | Keep `env.server` out of `"use client"` bundles. |
| D-06 | Info | `apps/mobile` | No `service_role` / service key references. | Grep empty for `service_role` under `apps/mobile` | — |

No evidence of service role key in `NEXT_PUBLIC_*` or mobile client code.

---

## Section E — Data model red flags

### E.1 PII surface

| ID | Severity | Table / area | Description | Proof | Recommended fix |
|----|----------|--------------|-------------|-------|-----------------|
| E-01 | Info | `people`, `charts` | Birth place, dates, chart JSON — core product data; owner RLS. | **people owner all** | Minimize duplication in new features. |
| E-02 | Info | `early_access`, `chart_leads`, `blog_email_captures` | Email stored outside auth; client cannot read (no policies). | RLS enabled, zero policies | Retention policy / deletion on purge where applicable (`purge` deletes `early_access` by email). |
| E-03 | Info | `profiles.unsubscribe_token` | Secret-like token; readable by owner via RLS only. | Column exists; owner SELECT policy | Treat as secret in logs/analytics. |
| E-04 | Info | `auth.users` | Email read in `purge_own_account_data` as DEFINER. | `select email from auth.users where id = uid` | Expected for waitlist cleanup. |

### E.2 Soft-delete / remembrance

| ID | Severity | Table | Description | Proof | Recommended fix |
|----|----------|-------|-------------|-------|-----------------|
| E-05 | Info | `people.passed_at` | Remembrance toggle; rows remain visible to owner (not hidden by RLS). | No `passed_at is null` in **people owner all** | Intentional product behavior. |
| E-06 | Info | `thread_participants.left_at` | Left participants excluded from message policies via `left_at IS NULL`. | Message policy requires `left_at IS NULL` | — |
| E-07 | Info | `connection_grants.revoked_at`, `quick_share_snapshots.revoked_at` | Status/time metadata; grants readable only by subject/viewer; snapshots service-role only. | Policies / no client access | — |

### E.3 Plaintext secrets

| ID | Severity | Table | Description | Proof | Recommended fix |
|----|----------|-------|-------------|-------|-----------------|
| E-08 | Info | `push_tokens.expo_push_token` | Device push token stored as text; owner RLS. | **push_tokens owner all** | Expected for push providers; protect service-role reads. |
| E-09 | Info | `invites.token` | 32-char hex connect token; not exposed via RLS to non-senders. | Sender-only **invites owner manage** | Rely on entropy + expiry; no enumeration via RLS. |

No password or API key columns in `public` were found.

### E.4 Invitations (`invites` — constellation connect / legacy kinds)

There is no separate `invitations` table; partner flow uses **`invites`**.

| ID | Severity | Table | Description | Proof | Recommended fix |
|----|----------|-------|-------------|-------|-----------------|
| E-10 | Info | `invites` | User A cannot SELECT user B's invites via PostgREST. | Only **invites owner manage** on `from_user` | — |
| E-11 | Info | `invites` | User B cannot accept unless token valid, pending, not expired, `from_user <> uid`. | `accept_connect_invite` UPDATE … `from_user <> uid` | — |
| E-12 | Info | `invites` | Preview exposes inviter display name + relation, not sender galaxy data. | `connect_invite_preview` DEFINER | — |

---

## Section F — Migrations integrity

### F.1 Last 10 migration files in repo (`supabase/migrations/`, by timestamp)

| Migration file | RLS / policy | SECURITY DEFINER | Grants | Security regression? |
|----------------|--------------|------------------|--------|------------------------|
| `20260930145501_blog_polish_round_3.sql` | — | — | — | No |
| `20260930035909_older_post_heroes.sql` | — | — | — | No |
| `20260930031243_blog_index_phase_3.sql` | — | — | — | No |
| `20260930021501_blog_publication_phase_2.sql` | — | — | — | No |
| `20260929210958_blog_post_image_urls.sql` | — | — | — | No |
| `20260929230323_blog_post_timely_and_drop_pricing_lines.sql` | — | — | — | No |
| `20260929210745_blog_post_hero_and_figure_images.sql` | — | — | — | No |
| `20260929210633_publish_whole_sign_and_date_seo_posts.sql` | — | — | — | No |
| `20260929174016_seo_blog_nine_posts.sql` | — | — | — | No |
| `20260927032000_account_export_rate_limit.sql` | **Yes** — RLS + read policy; replaces `purge_own_account_data` | **Yes** — `check_and_increment_account_export_rate`, updated purge | — | **Hardening** (rate limit + purge extension) |

Recent security-relevant migrations (just outside last 10): `20260913030100_wrap_auth_uid_in_rls_policies.sql`, `20260913030200_fix_purge_account_thread_participants.sql`, `20260914140000_pin_search_path_and_revoke_trigger_execute.sql`, `20260724180000_comped_entitlement_and_profile_column_grants.sql`.

### F.2 Repo vs production migration ledger

Production `list_migrations` (MCP) shows **94** applied versions. Local repo contains **96** SQL files. Several **version strings differ** for what appear to be the same logical migrations, e.g.:

| Repo filename | Production version |
|---------------|-------------------|
| `20260927032000_account_export_rate_limit.sql` | `20260927034139_account_export_rate_limit` |
| `20260929230323_blog_post_timely_…` | `20260930020205_blog_post_timely_…` |
| `20260930021501_blog_publication_phase_2.sql` | `20260930030211_blog_publication_phase_2` |
| `20260930031243_blog_index_phase_3.sql` | `20260930034357_blog_index_phase_3` |
| `20260930035909_older_post_heroes.sql` | `20260930041030_older_post_heroes` |
| `20260930145501_blog_polish_round_3.sql` | `20260930164350_blog_polish_round_3` |

| ID | Severity | Area | Description | Proof | Recommended fix |
|----|----------|------|-------------|-------|-----------------|
| F-01 | Medium | Migrations | Filename/version drift between git and production ledger complicates diff audits and replay. | MCP `list_migrations` vs `ls supabase/migrations` | Align naming on next migration; avoid re-timestamping applied files. |
| F-02 | Info | Tooling | `supabase migration list` / `db diff` not run locally (project not linked in this environment). | CLI: `ProjectRefNotLinkedError` | Use linked CLI or MCP for future diffs. |

Production schema queried matches committed policy/function intent (RLS, wrapped `auth.uid()`, purge body including `thread_participants` delete).

---

## Previously flagged issues (Sep 12 audit)

| Issue | Status | Evidence |
|-------|--------|----------|
| S8 — unwrapped `auth.uid()` in RLS | **Resolved** | `20260913030100_wrap_auth_uid_in_rls_policies.sql`; production `pg_policies` |
| `purge_own_account_data` blocked by `thread_participants` FK | **Resolved** | `20260913030200_fix_purge_account_thread_participants.sql`; production purge deletes `thread_participants` before `auth.users` |

**Previously flagged issues resolved: 2**

---

## Findings summary (by severity)

| Severity | Count |
|----------|------:|
| Critical | 0 |
| High | 1 |
| Medium | 5 |
| Low | 3 |
| Info | 24 |

### Index of finding IDs

- **High:** C-03  
- **Medium:** A-02, B-10, C-02, D-02, F-01  
- **Low:** C-04, D-01, (optional grouping)  
- **Info:** A-01, B-01–B-09, C-01, C-05, D-03–D-06, E-01–E-12, F-02, plus zero-policy tables in A.2  

---

## Appendix — Audit metadata

- **Production tables counted:** 35 base tables + 1 view (`admin_adoption_metrics`)
- **Policies counted:** 43 (production `pg_policies`)
- **SECURITY DEFINER functions (public):** 18 (including triggers/event trigger)
- **Supabase security advisors run:** `get_advisors` type `security` (2026-09-30)

*End of report.*
