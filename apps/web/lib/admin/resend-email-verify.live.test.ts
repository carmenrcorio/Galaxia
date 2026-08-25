/**
 * VERIFY proof (Stage 2, resend-email action): against a LIVE, disposable
 * Supabase project (no local stack in this repo — see AGENTS.md), same
 * pattern as `read-admin-row.live.test.ts` /
 * `profile-timezone-capture-verify.live.test.ts`.
 *
 * Quarantined out of the default suite (`*.live.test.ts`, its own vitest
 * project) and gated by `assertDisposableDbTarget` — see
 * `apps/web/lib/test-utils/assert-not-prod.ts` and `test:live` in
 * `package.json`. Run via `pnpm --filter web test:live` with
 * `ALLOW_LIVE_DB_TESTS_AGAINST=<disposable-ref>` set; aborts loudly against
 * prod or with no opt-in.
 *
 * Proves:
 *   1. An unconfirmed signup and a confirmed user really do branch
 *      differently through `resendUserEmail` (not just the pure decision
 *      function in isolation — the full path against real
 *      `auth.admin.getUserById` data).
 *   2. Both branches complete without error against the real GoTrue admin
 *      API (`auth.resend` / `auth.resetPasswordForEmail`) — this proves the
 *      call succeeds server-side; it does not (and cannot, without a
 *      mailbox) prove an email was delivered to an inbox.
 *   3. `writeAdminAuditLog`, called the same way the route handler calls
 *      it, lands exactly one real `admin_audit_log` row per action with
 *      the correct actor/target/action/metadata.email_type.
 *
 * Creates throwaway auth users (one confirmed, one not) and a throwaway
 * admin actor id, and cleans up every row/user it creates in `afterAll`.
 * Skips (with a clear reason) when live credentials aren't present.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertDisposableDbTarget } from "../test-utils/assert-not-prod";
import { resendUserEmail } from "./resend-email";
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

describe("VERIFY (live): resendUserEmail branches correctly and audits exactly once per call", () => {
  let admin: SupabaseClient;
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = `Qa-${Math.random().toString(36).slice(2, 10)}!Aa1`;
  let unconfirmedUserId = "";
  let confirmedUserId = "";
  let actorId = "";

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const { data: unconfirmed, error: unconfirmedErr } = await admin.auth.admin.createUser({
      email: `qa-resend-unconfirmed-${stamp}@galaxia-audit.test`,
      password,
      email_confirm: false
    });
    if (unconfirmedErr || !unconfirmed?.user) throw new Error(`create unconfirmed user failed: ${unconfirmedErr?.message}`);
    unconfirmedUserId = unconfirmed.user.id;

    const { data: confirmed, error: confirmedErr } = await admin.auth.admin.createUser({
      email: `qa-resend-confirmed-${stamp}@galaxia-audit.test`,
      password,
      email_confirm: true
    });
    if (confirmedErr || !confirmed?.user) throw new Error(`create confirmed user failed: ${confirmedErr?.message}`);
    confirmedUserId = confirmed.user.id;

    // A throwaway "actor" id — a real auth.users row is required because
    // admin_audit_log.actor_id has a foreign key to auth.users(id), but
    // this account is never granted admin_users; it stands in for "the
    // verified admin id the guard would have supplied."
    const { data: actor, error: actorErr } = await admin.auth.admin.createUser({
      email: `qa-resend-actor-${stamp}@galaxia-audit.test`,
      password,
      email_confirm: true
    });
    if (actorErr || !actor?.user) throw new Error(`create actor user failed: ${actorErr?.message}`);
    actorId = actor.user.id;
  }, 30_000);

  afterAll(async () => {
    await admin.from("admin_audit_log").delete().eq("actor_id", actorId);
    for (const id of [unconfirmedUserId, confirmedUserId, actorId]) {
      if (!id) continue;
      await admin.from("profiles").delete().eq("id", id);
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) console.error(`cleanup: failed to delete test user ${id}: ${error.message}`);
    }
  }, 30_000);

  it("an unconfirmed target resolves to the confirmation branch and writes exactly one resend_confirmation_email audit row", async () => {
    const before = await admin.from("admin_audit_log").select("id", { count: "exact", head: true }).eq("target_user_id", unconfirmedUserId);

    const result = await resendUserEmail(SUPABASE_URL, SERVICE_ROLE_KEY, unconfirmedUserId);
    expect(result.emailType).toBe("confirmation");

    await writeAdminAuditLog(admin, {
      actorId,
      action: "resend_confirmation_email",
      targetUserId: unconfirmedUserId,
      metadata: { email_type: result.emailType }
    });

    const after = await admin
      .from("admin_audit_log")
      .select("actor_id, action, target_user_id, metadata")
      .eq("target_user_id", unconfirmedUserId);
    expect(after.data ?? []).toHaveLength((before.count ?? 0) + 1);
    const row = after.data?.at(-1);
    expect(row?.actor_id).toBe(actorId);
    expect(row?.action).toBe("resend_confirmation_email");
    expect(row?.target_user_id).toBe(unconfirmedUserId);
    expect(row?.metadata).toEqual({ email_type: "confirmation" });
  }, 30_000);

  it("a confirmed target resolves to the reset branch and writes exactly one resend_password_reset_email audit row", async () => {
    const before = await admin.from("admin_audit_log").select("id", { count: "exact", head: true }).eq("target_user_id", confirmedUserId);

    const result = await resendUserEmail(SUPABASE_URL, SERVICE_ROLE_KEY, confirmedUserId);
    expect(result.emailType).toBe("reset");

    await writeAdminAuditLog(admin, {
      actorId,
      action: "resend_password_reset_email",
      targetUserId: confirmedUserId,
      metadata: { email_type: result.emailType }
    });

    const after = await admin
      .from("admin_audit_log")
      .select("actor_id, action, target_user_id, metadata")
      .eq("target_user_id", confirmedUserId);
    expect(after.data ?? []).toHaveLength((before.count ?? 0) + 1);
    const row = after.data?.at(-1);
    expect(row?.actor_id).toBe(actorId);
    expect(row?.action).toBe("resend_password_reset_email");
    expect(row?.target_user_id).toBe(confirmedUserId);
    expect(row?.metadata).toEqual({ email_type: "reset" });
  }, 30_000);

  it("a nonexistent target user id fails clearly instead of silently sending nothing", async () => {
    await expect(
      resendUserEmail(SUPABASE_URL, SERVICE_ROLE_KEY, "00000000-0000-0000-0000-000000000000")
    ).rejects.toThrow(/not found/i);
  }, 30_000);
});
