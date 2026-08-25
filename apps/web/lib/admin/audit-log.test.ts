import { describe, expect, it, vi } from "vitest";
import { ADMIN_AUDIT_ACTIONS, humanizeAuditAction, isAdminAuditAction, writeAdminAuditLog } from "./audit-log";

/**
 * Pure/mocked-client unit tests for the one shared admin_audit_log writer.
 * The live-DB proof that a real row lands with the right shape is exercised
 * end-to-end by the resend-email and support-request live tests (they call
 * this same function against the real project) — this file proves the
 * function's own contract in isolation: closed vocabulary, exact row shape,
 * and "never swallow an insert failure."
 */

function fakeServiceRoleClient(insertResult: { error: { message: string } | null }) {
  const insert = vi.fn().mockResolvedValue(insertResult);
  const from = vi.fn().mockReturnValue({ insert });
  return { client: { from } as never, from, insert };
}

describe("ADMIN_AUDIT_ACTIONS / isAdminAuditAction", () => {
  it("is exactly the six Stage 2 + comp Phase 1 actions, no more, no less", () => {
    expect([...ADMIN_AUDIT_ACTIONS].sort()).toEqual(
      [
        "close_support_request",
        "reopen_support_request",
        "resend_confirmation_email",
        "resend_password_reset_email",
        "grant_comp",
        "revoke_comp"
      ].sort()
    );
  });

  it("accepts every vocabulary entry and rejects anything else", () => {
    for (const action of ADMIN_AUDIT_ACTIONS) {
      expect(isAdminAuditAction(action)).toBe(true);
    }
    for (const bogus of ["grant_admin", "delete_user", "", "RESEND_CONFIRMATION_EMAIL", "close_support_request "]) {
      expect(isAdminAuditAction(bogus)).toBe(false);
    }
  });
});

describe("humanizeAuditAction", () => {
  it("labels every entry in the closed vocabulary, never the raw action string", () => {
    for (const action of ADMIN_AUDIT_ACTIONS) {
      const label = humanizeAuditAction(action);
      expect(label).not.toBe(action);
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it("falls back to the raw string for anything outside the closed vocabulary, rather than a misleading label", () => {
    expect(humanizeAuditAction("delete_user")).toBe("delete_user");
  });
});

describe("writeAdminAuditLog", () => {
  it("fails closed on an action outside the closed vocabulary, without ever calling insert", async () => {
    const { client, insert } = fakeServiceRoleClient({ error: null });
    await expect(
      writeAdminAuditLog(client, {
        actorId: "admin-1",
        // Cast to bypass the compile-time union — the runtime check is the
        // actual guard this test proves; a client that only ever calls this
        // through TypeScript wouldn't be defended against a bug that
        // computes the action dynamically.
        action: "grant_admin" as never,
        targetUserId: "user-1"
      })
    ).rejects.toThrow(/not in the closed audit-action vocabulary/);
    expect(insert).not.toHaveBeenCalled();
  });

  it("requires a non-empty actorId, without ever calling insert", async () => {
    const { client, insert } = fakeServiceRoleClient({ error: null });
    await expect(
      writeAdminAuditLog(client, {
        actorId: "",
        action: "close_support_request",
        targetUserId: "user-1"
      })
    ).rejects.toThrow(/actorId is required/);
    expect(insert).not.toHaveBeenCalled();
  });

  it("inserts exactly one row with the exact column shape (actor_id/action/target_user_id/metadata)", async () => {
    const { client, from, insert } = fakeServiceRoleClient({ error: null });
    await writeAdminAuditLog(client, {
      actorId: "admin-1",
      action: "resend_confirmation_email",
      targetUserId: "user-1",
      metadata: { email_type: "confirmation" }
    });

    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith("admin_audit_log");
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith({
      actor_id: "admin-1",
      action: "resend_confirmation_email",
      target_user_id: "user-1",
      metadata: { email_type: "confirmation" }
    });
  });

  it("defaults targetUserId/metadata to null when omitted, rather than undefined", async () => {
    const { client, insert } = fakeServiceRoleClient({ error: null });
    await writeAdminAuditLog(client, {
      actorId: "admin-1",
      action: "close_support_request"
    });
    expect(insert).toHaveBeenCalledWith({
      actor_id: "admin-1",
      action: "close_support_request",
      target_user_id: null,
      metadata: null
    });
  });

  it("throws (does not swallow) when the insert itself fails — an unlogged privileged action must surface, not silently succeed", async () => {
    const { client } = fakeServiceRoleClient({ error: { message: "insert failed: constraint violation" } });
    await expect(
      writeAdminAuditLog(client, {
        actorId: "admin-1",
        action: "reopen_support_request",
        targetUserId: "user-1"
      })
    ).rejects.toThrow(/insert failed/);
  });
});
