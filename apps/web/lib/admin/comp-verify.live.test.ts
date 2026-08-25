/**
 * VERIFY proof (comp Phase 1) against a LIVE, disposable Supabase project
 * (no local stack in this repo — see AGENTS.md), same pattern as
 * `resend-email-verify.live.test.ts` / `support-requests-verify.live.test.ts`.
 *
 * Quarantined out of the default suite (`*.live.test.ts`, its own vitest
 * project) and gated by `assertDisposableDbTarget` — see
 * `apps/web/lib/test-utils/assert-not-prod.ts` and `test:live` in
 * `package.json`. Run via `pnpm --filter web test:live` with
 * `ALLOW_LIVE_DB_TESTS_AGAINST=<disposable-ref>` set; aborts loudly against
 * prod or with no opt-in.
 *
 * Proves, against the real database:
 *   1. `transitionComp` grants (comped: false -> true) and revokes
 *      (comped: true -> false), writing ONLY the comped column — every
 *      other profiles column on the row is verified byte-identical
 *      before and after.
 *   2. Self-action (actorId === targetUserId) is refused before any write
 *      reaches the database.
 *   3. A no-op transition (grant an already-comped row, revoke an
 *      already-not-comped row) is refused as a conflict, and does NOT
 *      write a misleading audit row.
 *   4. `writeAdminAuditLog`, called the same way the route handlers call
 *      it, lands exactly one real `admin_audit_log` row per real
 *      transition, action = grant_comp / revoke_comp.
 *   5. The resulting `hasAccess` crosses correctly with the row's real
 *      subscription_status/trial_ends_at: revoking comp on a
 *      stale-trialing row (the real founder/comp account shape per the
 *      Phase 0 dump) drops access to false immediately.
 *
 * Creates throwaway auth users (a target + an admin actor) and cleans up
 * everything it created in `afterAll`. Skips (with a clear reason) when
 * live credentials aren't present.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { profileAllowsAccess } from "@galaxia/core";
import { assertDisposableDbTarget } from "../test-utils/assert-not-prod";
import { CompConflictError, SelfCompError, transitionComp } from "./comp";
import { writeAdminAuditLog } from "./audit-log";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Structural backstop: throws and aborts this whole file before any client
// is constructed unless SUPABASE_URL is an explicitly allow-listed
// disposable project — never prod. See assert-not-prod.ts.
assertDisposableDbTarget(SUPABASE_URL);
if (!SERVICE_ROLE_KEY) {
  throw new Error("[live-db test] ABORT: SUPABASE_SERVICE_ROLE_KEY is not set.");
}

describe("VERIFY (live): transitionComp writes ONLY comped, refuses self/no-op, audits exactly once per real transition", () => {
  let admin: SupabaseClient;
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = `Qa-${Math.random().toString(36).slice(2, 10)}!Aa1`;
  let targetUserId = "";
  let actorId = "";

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const { data: target, error: targetErr } = await admin.auth.admin.createUser({
      email: `qa-comp-target-${stamp}@galaxia-audit.test`,
      password,
      email_confirm: true
    });
    if (targetErr || !target?.user) throw new Error(`create target user failed: ${targetErr?.message}`);
    targetUserId = target.user.id;

    const { data: actor, error: actorErr } = await admin.auth.admin.createUser({
      email: `qa-comp-actor-${stamp}@galaxia-audit.test`,
      password,
      email_confirm: true
    });
    if (actorErr || !actor?.user) throw new Error(`create actor user failed: ${actorErr?.message}`);
    actorId = actor.user.id;

    // The `handle_new_user` trigger seeds the profile row on auth.users
    // insert (trialing, trial_ends_at = now + 14 days). Force it to the
    // real stale-trialing shape a founder/comp account actually has
    // (Phase 0 dump §2) so the revoke -> hasAccess=false assertion below
    // is a genuine proof, not an artifact of a fresh trial window.
    const { error: seedErr } = await admin
      .from("profiles")
      .update({ subscription_status: "trialing", trial_ends_at: "2020-01-01T00:00:00.000Z" })
      .eq("id", targetUserId);
    if (seedErr) throw new Error(`seed profile shape failed: ${seedErr.message}`);
  }, 30_000);

  afterAll(async () => {
    await admin.from("admin_audit_log").delete().eq("actor_id", actorId);
    for (const id of [targetUserId, actorId]) {
      if (!id) continue;
      await admin.from("profiles").delete().eq("id", id);
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) console.error(`cleanup: failed to delete test user ${id}: ${error.message}`);
    }
  }, 30_000);

  it("EXPLOIT ATTEMPT — self-action is refused before any database write", async () => {
    await expect(transitionComp(admin, actorId, actorId, "grant")).rejects.toThrow(SelfCompError);
    const { data: check } = await admin.from("profiles").select("comped").eq("id", actorId).maybeSingle();
    expect(check?.comped).not.toBe(true);
  }, 30_000);

  it("revoking a non-comped account is refused as a conflict, without writing an audit row", async () => {
    const before = await admin.from("admin_audit_log").select("id", { count: "exact", head: true }).eq("target_user_id", targetUserId);
    await expect(transitionComp(admin, targetUserId, actorId, "revoke")).rejects.toThrow(CompConflictError);
    const after = await admin.from("admin_audit_log").select("id", { count: "exact", head: true }).eq("target_user_id", targetUserId);
    expect(after.count ?? 0).toBe(before.count ?? 0);
  }, 30_000);

  it("grant: writes ONLY comped (every other profiles column is byte-identical before/after), and audits exactly one grant_comp row", async () => {
    const beforeRow = await admin.from("profiles").select("*").eq("id", targetUserId).single();
    expect(beforeRow.data?.comped).toBe(false);

    const result = await transitionComp(admin, targetUserId, actorId, "grant");
    expect(result.profile.comped).toBe(true);
    // comped short-circuits hasAccess regardless of the stale-trialing shape underneath.
    expect(result.hasAccess).toBe(true);

    const afterRow = await admin.from("profiles").select("*").eq("id", targetUserId).single();
    for (const key of Object.keys(beforeRow.data ?? {})) {
      if (key === "comped") continue;
      expect(afterRow.data?.[key]).toEqual(beforeRow.data?.[key]);
    }
    expect(afterRow.data?.comped).toBe(true);

    await writeAdminAuditLog(admin, {
      actorId,
      action: "grant_comp",
      targetUserId,
      metadata: { resulting_access: result.hasAccess }
    });

    const auditRows = await admin
      .from("admin_audit_log")
      .select("actor_id, action, target_user_id, metadata")
      .eq("target_user_id", targetUserId)
      .eq("action", "grant_comp");
    expect(auditRows.data ?? []).toHaveLength(1);
    expect(auditRows.data?.[0]?.actor_id).toBe(actorId);
    expect(auditRows.data?.[0]?.metadata).toEqual({ resulting_access: true });
  }, 30_000);

  it("granting the now-already-comped account again is refused as a conflict, without a second audit row", async () => {
    await expect(transitionComp(admin, targetUserId, actorId, "grant")).rejects.toThrow(CompConflictError);
    const auditRows = await admin
      .from("admin_audit_log")
      .select("id")
      .eq("target_user_id", targetUserId)
      .eq("action", "grant_comp");
    expect(auditRows.data ?? []).toHaveLength(1);
  }, 30_000);

  it("revoke: writes ONLY comped back to false, and hasAccess falls through to the row's real (stale-trialing) state -> false immediately", async () => {
    const result = await transitionComp(admin, targetUserId, actorId, "revoke");
    expect(result.profile.comped).toBe(false);
    expect(result.profile.subscription_status).toBe("trialing");
    // Postgres/PostgREST returns timestamptz as "...+00:00", not the
    // "...Z" shape the seed write used — compare by instant, not string.
    expect(new Date(result.profile.trial_ends_at ?? "").getTime()).toBe(
      new Date("2020-01-01T00:00:00.000Z").getTime()
    );
    // No grace: the same shared hasAccess precedence, run over the row's
    // untouched (never written by this action) billing/trial columns.
    expect(result.hasAccess).toBe(false);
    expect(
      profileAllowsAccess({
        subscription_status: result.profile.subscription_status,
        trial_ends_at: result.profile.trial_ends_at,
        comped: result.profile.comped
      })
    ).toBe(false);

    await writeAdminAuditLog(admin, {
      actorId,
      action: "revoke_comp",
      targetUserId,
      metadata: { resulting_access: result.hasAccess }
    });

    const auditRows = await admin
      .from("admin_audit_log")
      .select("actor_id, action, metadata")
      .eq("target_user_id", targetUserId)
      .eq("action", "revoke_comp");
    expect(auditRows.data ?? []).toHaveLength(1);
    expect(auditRows.data?.[0]?.metadata).toEqual({ resulting_access: false });
  }, 30_000);
});
