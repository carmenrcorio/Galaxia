/**
 * VERIFY proof (admin role foundation, Phase 0 — the security-critical
 * property the whole admin tier is built on):
 *
 *   1. A normal authenticated session (anon key + user JWT) CANNOT insert
 *      into `admin_users` — the self-grant-admin exploit this whole
 *      foundation exists to prevent. Proven live, not just read from the
 *      migration.
 *   2. The same session CANNOT update an existing `admin_users` row either.
 *   3. The same session CANNOT read `admin_users` at all — not "sees it but
 *      denied," genuinely empty/denied — the "no policy = no client
 *      access" property, distinct from (and stronger than) not-writable.
 *   4. Only a service-role client can read/write `admin_users` — proven by
 *      reading the real founder bootstrap row inserted by
 *      `20260821191500_admin_role_foundation.sql`.
 *   5. `readAdminRow` (the DB half of `requireAdmin`) + `isAdmin` (the pure
 *      decision) together produce the right answer for both a real admin
 *      row and no row — proving the actual code path `requireAdmin` uses,
 *      not just the raw SQL.
 *
 * This hits a LIVE, disposable Supabase project, the same way
 * `profile-timezone-capture-verify.live.test.ts` and
 * `person-daily-nudges-concurrency.live.test.ts` already do. It creates
 * throwaway auth users and a throwaway admin_users row, and cleans up
 * everything it created (success or failure) in `afterAll`.
 *
 * Quarantined out of the default suite (`*.live.test.ts`, its own vitest
 * project) and gated by `assertDisposableDbTarget` — see
 * `apps/web/lib/test-utils/assert-not-prod.ts` and `test:live` in
 * `package.json`. Run via `pnpm --filter web test:live` with
 * `ALLOW_LIVE_DB_TESTS_AGAINST=<disposable-ref>` set; aborts loudly against
 * prod or with no opt-in.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isAdmin } from "@galaxia/core";
import { assertDisposableDbTarget } from "./test-utils/assert-not-prod";
import { readAdminRow } from "./read-admin-row";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";

const FOUNDER_ID = "8112465c-f74b-4842-9ef4-9d30e98d4ccb";

// Structural backstop: throws and aborts this whole file before any client
// is constructed unless SUPABASE_URL is an explicitly allow-listed
// disposable project — never prod. See assert-not-prod.ts.
assertDisposableDbTarget(SUPABASE_URL);
if (!SERVICE_ROLE_KEY || !ANON_KEY) {
  throw new Error("[live-db test] ABORT: SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY are not both set.");
}

describe("VERIFY (live DB): admin_users is not client-writable or client-readable", () => {
  let admin: SupabaseClient;
  let owner: SupabaseClient;
  let userId = "";
  const email = `qa-admin-guard-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@galaxia-audit.test`;
  const password = `Qa-${Math.random().toString(36).slice(2, 10)}!Aa1`;

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (createErr || !created?.user) throw new Error(`test user create failed: ${createErr?.message}`);
    userId = created.user.id;

    owner = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { error: signInErr } = await owner.auth.signInWithPassword({ email, password });
    if (signInErr) throw new Error(`test sign-in failed: ${signInErr.message}`);
  }, 30_000);

  afterAll(async () => {
    if (userId) await admin.from("admin_users").delete().eq("owner_id", userId);
    // profiles.id has no ON DELETE CASCADE from auth.users — remove first so deleteUser doesn't hit the FK.
    if (userId) await admin.from("profiles").delete().eq("id", userId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  }, 30_000);

  it("EXPLOIT ATTEMPT — a normal authenticated session cannot INSERT its own row into admin_users (self-grant-admin)", async () => {
    const { data, error } = await owner
      .from("admin_users")
      .insert({ owner_id: userId, role: "admin" })
      .select("owner_id");

    // RLS with zero policies denies the insert outright (an error) rather
    // than silently accepting it — either way, no row must land.
    expect(error).not.toBeNull();
    expect(data ?? []).toHaveLength(0);

    const { data: check } = await admin.from("admin_users").select("owner_id").eq("owner_id", userId).maybeSingle();
    expect(check).toBeNull();
  }, 30_000);

  it("EXPLOIT ATTEMPT — a normal authenticated session cannot UPDATE an existing admin_users row", async () => {
    // Service-role seeds a row directly so there's something to attempt to touch.
    const { error: seedErr } = await admin.from("admin_users").insert({ owner_id: userId, role: "admin" });
    expect(seedErr).toBeNull();

    const { data, error } = await owner.from("admin_users").update({ role: "superadmin" }).eq("owner_id", userId).select("role");

    expect(error).not.toBeNull();
    expect(data ?? []).toHaveLength(0);

    const { data: check } = await admin.from("admin_users").select("role").eq("owner_id", userId).single();
    expect(check?.role).toBe("admin"); // untouched by the attempted client update

    await admin.from("admin_users").delete().eq("owner_id", userId);
  }, 30_000);

  it("EXPLOIT ATTEMPT — a normal authenticated session cannot SELECT admin_users at all (not merely 'not theirs' — empty, full stop)", async () => {
    const { error: seedErr } = await admin.from("admin_users").insert({ owner_id: userId, role: "admin" });
    expect(seedErr).toBeNull();

    const { data, error } = await owner.from("admin_users").select("*");

    // "No policy = no client access": the explicit table-level REVOKE SELECT
    // means this isn't even a silently-filtered empty RLS result — it's a
    // hard permission-denied error. The client's own admin_users row (the
    // one just seeded above) is invisible to it, not just other users' rows.
    expect(error).not.toBeNull();
    expect(error?.code).toBe("42501");
    expect(data ?? []).toHaveLength(0);

    await admin.from("admin_users").delete().eq("owner_id", userId);
  }, 30_000);

  it("only a service-role client can read admin_users — the founder bootstrap row from the migration is present", async () => {
    const { data, error } = await admin.from("admin_users").select("role").eq("owner_id", FOUNDER_ID).single();
    expect(error).toBeNull();
    expect(data?.role).toBe("admin");
  }, 30_000);
});

describe("VERIFY (live DB): readAdminRow + isAdmin (the actual requireAdmin code path)", () => {
  let admin: SupabaseClient;

  beforeAll(() => {
    admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  });

  it("the founder's real id resolves to isAdmin() === true via the service-role read", async () => {
    const row = await readAdminRow(admin, FOUNDER_ID);
    expect(isAdmin(row)).toBe(true);
  }, 30_000);

  it("a random, never-granted user id resolves to isAdmin() === false (fail-closed, no row)", async () => {
    const row = await readAdminRow(admin, "00000000-0000-0000-0000-000000000000");
    expect(row).toBeNull();
    expect(isAdmin(row)).toBe(false);
  }, 30_000);

  it("a client-session (anon-key) read of admin_users would not even see the founder's row — proving requireAdmin cannot rely on that path", async () => {
    const anonClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const row = await readAdminRow(anonClient, FOUNDER_ID);
    // Not because the founder isn't an admin — because an anon-key client
    // has no policy under which it can read this table at all, for anyone.
    expect(row).toBeNull();
  }, 30_000);
});
