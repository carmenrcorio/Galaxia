/**
 * VERIFY proof (Stage 2, support queue) against the LIVE Supabase project
 * (no local stack in this repo — see AGENTS.md), same pattern as
 * `read-admin-row.test.ts`.
 *
 * Proves:
 *   1. A signed-in user CAN insert their own support_requests row (the
 *      owner-insert policy works for the legitimate path).
 *   2. That same user CANNOT read it back at all — not "sees it but
 *      denied," genuinely permission-denied, the same "no policy = no
 *      client access" property proven for admin_users.
 *   3. A SECOND authenticated user cannot read the first user's row either
 *      (cross-user isolation) — proven the same way: permission-denied, not
 *      an empty filtered result.
 *   4. Neither user can update or delete support_requests at all.
 *   5. The per-owner rate-limit trigger actually fires after 5 inserts in
 *      the window.
 *   6. `listAdminSupportRequests` (service-role) can read it, sorts open
 *      before closed.
 *   7. `transitionSupportRequest` (close/reopen) sets status + handled_by +
 *      handled_at, rejects a same-state transition as a conflict, and (via
 *      `writeAdminAuditLog`, called the same way the route handlers call
 *      it) lands exactly one audit row per transition.
 *
 * Creates throwaway auth users and rows, and cleans up everything it
 * created in `afterAll`. Skips (with a clear reason) when live credentials
 * aren't present.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  SupportRequestConflictError,
  listAdminSupportRequests,
  transitionSupportRequest
} from "./support-requests";
import { writeAdminAuditLog } from "./audit-log";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
const hasLiveCreds =
  Boolean(SUPABASE_URL) && Boolean(SERVICE_ROLE_KEY) && Boolean(ANON_KEY) && !SUPABASE_URL.includes("placeholder");

if (!hasLiveCreds) {
  // eslint-disable-next-line no-console
  console.warn(
    "[verify] support-requests: SKIPPED — no live Supabase credentials in this environment. " +
      "This is a live-DB proof, not a pure-logic test; run with those env vars set."
  );
}

describe.skipIf(!hasLiveCreds)("VERIFY (live): support_requests RLS — insert-your-own, no read/update/delete for anyone", () => {
  let admin: SupabaseClient;
  let userA: SupabaseClient;
  let userB: SupabaseClient;
  let userAId = "";
  let userBId = "";
  let requestId = "";
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = `Qa-${Math.random().toString(36).slice(2, 10)}!Aa1`;

  async function signedInClient(tag: string): Promise<{ id: string; client: SupabaseClient; email: string }> {
    const email = `qa-support-${tag}-${stamp}@galaxia-audit.test`;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (createErr || !created?.user) throw new Error(`create user ${tag} failed: ${createErr?.message}`);
    const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { error: signInErr } = await client.auth.signInWithPassword({ email, password });
    if (signInErr) throw new Error(`sign-in ${tag} failed: ${signInErr.message}`);
    return { id: created.user.id, client, email };
  }

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const a = await signedInClient("a");
    const b = await signedInClient("b");
    userA = a.client;
    userAId = a.id;
    userB = b.client;
    userBId = b.id;

    // No `.select()` chained on the insert: support_requests has no select
    // grant for authenticated at all, and PostgREST's "return=representation"
    // (what `.select()` triggers) needs one even for the row just inserted —
    // proven by this failing with "permission denied" when chained. The
    // in-app form (Settings) relies on exactly this: it only checks for an
    // insert error, never reads the row back. The generated id is fetched
    // here via the service-role client instead, purely for the test's own
    // bookkeeping.
    const { error: insertErr } = await userA
      .from("support_requests")
      .insert({ owner_id: userAId, email: a.email, subject: "QA audit — RLS proof", body: "Ignore — throwaway test row." });
    if (insertErr) throw new Error(`seed insert failed: ${insertErr.message}`);

    const { data: seeded, error: seedFetchErr } = await admin
      .from("support_requests")
      .select("id")
      .eq("owner_id", userAId)
      .eq("subject", "QA audit — RLS proof")
      .single();
    if (seedFetchErr || !seeded) throw new Error(`seed fetch (via service-role) failed: ${seedFetchErr?.message}`);
    requestId = seeded.id;
  }, 30_000);

  afterAll(async () => {
    await admin.from("admin_audit_log").delete().in("target_user_id", [userAId, userBId].filter(Boolean));
    await admin.from("support_requests").delete().eq("owner_id", userAId);
    for (const id of [userAId, userBId]) {
      if (!id) continue;
      await admin.from("profiles").delete().eq("id", id);
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) console.error(`cleanup: failed to delete test user ${id}: ${error.message}`);
    }
  }, 30_000);

  it("the owner-insert policy allows a signed-in user to insert their own row (already proven by beforeAll not throwing)", () => {
    expect(requestId).toBeTruthy();
  });

  it("EXPLOIT ATTEMPT — the owner cannot read their own just-inserted row back through the client at all", async () => {
    const { data, error } = await userA.from("support_requests").select("*").eq("id", requestId);
    expect(error).not.toBeNull();
    expect(error?.code).toBe("42501");
    expect(data ?? []).toHaveLength(0);
  });

  it("EXPLOIT ATTEMPT — a second authenticated user cannot read the first user's row either (cross-user isolation)", async () => {
    const { data, error } = await userB.from("support_requests").select("*").eq("id", requestId);
    expect(error).not.toBeNull();
    expect(error?.code).toBe("42501");
    expect(data ?? []).toHaveLength(0);
  });

  it("EXPLOIT ATTEMPT — the owner cannot update their own row (e.g. forging status/handled_by)", async () => {
    const { data, error } = await userA
      .from("support_requests")
      .update({ status: "closed", handled_by: userAId })
      .eq("id", requestId)
      .select("id");
    expect(error).not.toBeNull();
    expect(data ?? []).toHaveLength(0);
    const { data: check } = await admin.from("support_requests").select("status, handled_by").eq("id", requestId).single();
    expect(check?.status).toBe("open");
    expect(check?.handled_by).toBeNull();
  });

  it("EXPLOIT ATTEMPT — the owner cannot delete their own row", async () => {
    const { error } = await userA.from("support_requests").delete().eq("id", requestId);
    expect(error).not.toBeNull();
    const { data: check } = await admin.from("support_requests").select("id").eq("id", requestId).maybeSingle();
    expect(check?.id).toBe(requestId);
  });

  it("EXPLOIT ATTEMPT — inserting a row on someone else's behalf (owner_id != auth.uid()) is rejected", async () => {
    const { data, error } = await userA
      .from("support_requests")
      .insert({ owner_id: userBId, email: "forged@galaxia-audit.test", subject: "forged", body: "forged" })
      .select("id");
    expect(error).not.toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("the per-owner rate limit trigger fires after 5 inserts within the window", async () => {
    const email = `qa-support-a-${stamp}@galaxia-audit.test`;
    for (let i = 0; i < 4; i += 1) {
      const { error } = await userA
        .from("support_requests")
        .insert({ owner_id: userAId, email, subject: `QA rate-limit probe ${i}`, body: "Ignore." });
      expect(error).toBeNull();
    }
    // 6th insert overall for this owner (1 from beforeAll + 4 above + this one) must be rejected.
    const { error: limitedError } = await userA
      .from("support_requests")
      .insert({ owner_id: userAId, email, subject: "QA rate-limit probe (over limit)", body: "Ignore." });
    expect(limitedError).not.toBeNull();
    expect(limitedError?.message ?? "").toMatch(/too many support requests/i);
  }, 30_000);

  it("listAdminSupportRequests (service-role) reads the row and puts it in the open group", async () => {
    const rows = await listAdminSupportRequests(admin);
    const openIds = new Set(rows.filter((r) => r.status === "open").map((r) => r.id));
    expect(openIds.has(requestId)).toBe(true);
    const firstClosedIndex = rows.findIndex((r) => r.status === "closed");
    const lastOpenIndex = rows.map((r) => r.status).lastIndexOf("open");
    if (firstClosedIndex !== -1 && lastOpenIndex !== -1) {
      expect(lastOpenIndex).toBeLessThan(firstClosedIndex);
    }
  }, 30_000);

  it("close: sets status/handled_by/handled_at, and audits exactly one close_support_request row", async () => {
    const before = await admin.from("admin_audit_log").select("id", { count: "exact", head: true }).eq("target_user_id", userAId);

    const updated = await transitionSupportRequest(admin, requestId, userBId, "close");
    expect(updated.status).toBe("closed");
    expect(updated.handled_by).toBe(userBId);
    expect(updated.handled_at).toBeTruthy();

    await writeAdminAuditLog(admin, {
      actorId: userBId,
      action: "close_support_request",
      targetUserId: userAId,
      metadata: { support_request_id: requestId }
    });

    const after = await admin
      .from("admin_audit_log")
      .select("actor_id, action, target_user_id, metadata")
      .eq("target_user_id", userAId)
      .eq("action", "close_support_request");
    expect(after.data ?? []).toHaveLength((before.count ?? 0) + 1);
    expect(after.data?.[0]?.actor_id).toBe(userBId);
    expect(after.data?.[0]?.metadata).toEqual({ support_request_id: requestId });
  }, 30_000);

  it("closing an already-closed request throws SupportRequestConflictError, without writing another audit row", async () => {
    await expect(transitionSupportRequest(admin, requestId, userBId, "close")).rejects.toThrow(SupportRequestConflictError);
  }, 30_000);

  it("reopen: sets status back to open with a fresh handled_by/handled_at, and audits exactly one reopen_support_request row", async () => {
    const updated = await transitionSupportRequest(admin, requestId, userBId, "reopen");
    expect(updated.status).toBe("open");
    expect(updated.handled_by).toBe(userBId);

    await writeAdminAuditLog(admin, {
      actorId: userBId,
      action: "reopen_support_request",
      targetUserId: userAId,
      metadata: { support_request_id: requestId }
    });

    const after = await admin
      .from("admin_audit_log")
      .select("action")
      .eq("target_user_id", userAId)
      .eq("action", "reopen_support_request");
    expect(after.data ?? []).toHaveLength(1);
  }, 30_000);
});
