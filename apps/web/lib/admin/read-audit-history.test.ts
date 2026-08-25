import { describe, expect, it, vi } from "vitest";
import { readAdminAuditHistory } from "./read-audit-history";

/**
 * Pure/mocked-client unit tests for the first reader of `admin_audit_log`.
 * No live DB — the real-row-shape proof belongs to a future `*.live.test.ts`
 * (per the assert-not-prod quarantine) if one is ever added; this file
 * proves the function's own contract in isolation: query shape, actor-email
 * resolution/fallback, ordering pass-through, and the NEVER-FABRICATE
 * before/after pass-through.
 */
function fakeServiceRoleClient({
  auditRows,
  auditError = null,
  actorEmails
}: {
  auditRows: unknown[];
  auditError?: { message: string } | null;
  actorEmails: Record<string, string | null | undefined>;
}) {
  const order = vi.fn().mockResolvedValue({ data: auditRows, error: auditError });
  const eq = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });

  const getUserById = vi.fn(async (actorId: string) => {
    const email = actorEmails[actorId];
    if (email === undefined) {
      return { data: { user: null }, error: { message: "not found" } };
    }
    return { data: { user: email === null ? null : { email } }, error: null };
  });

  const client = { from, auth: { admin: { getUserById } } } as never;
  return { client, from, select, eq, order, getUserById };
}

const BASE_ROW = {
  id: "audit-1",
  actor_id: "admin-1",
  action: "grant_comp",
  target_user_id: "user-1",
  before: null,
  after: null,
  metadata: { resulting_access: true },
  created_at: "2026-08-20T00:00:00.000Z"
};

describe("readAdminAuditHistory", () => {
  it("queries admin_audit_log filtered by target_user_id, ordered created_at desc", async () => {
    const { client, from, select, eq, order } = fakeServiceRoleClient({
      auditRows: [BASE_ROW],
      actorEmails: { "admin-1": "admin@galaxia.app" }
    });

    await readAdminAuditHistory(client, "user-1");

    expect(from).toHaveBeenCalledWith("admin_audit_log");
    expect(select).toHaveBeenCalledWith("id, actor_id, action, target_user_id, before, after, metadata, created_at");
    expect(eq).toHaveBeenCalledWith("target_user_id", "user-1");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("resolves actor_id to an actor email via the Admin API, once per distinct actor", async () => {
    const rows = [
      BASE_ROW,
      { ...BASE_ROW, id: "audit-2", actor_id: "admin-1", action: "revoke_comp" },
      { ...BASE_ROW, id: "audit-3", actor_id: "admin-2", action: "resend_confirmation_email" }
    ];
    const { client, getUserById } = fakeServiceRoleClient({
      auditRows: rows,
      actorEmails: { "admin-1": "admin1@galaxia.app", "admin-2": "admin2@galaxia.app" }
    });

    const result = await readAdminAuditHistory(client, "user-1");

    expect(getUserById).toHaveBeenCalledTimes(2); // once per distinct actor, not once per row
    expect(result[0]!.actorEmail).toBe("admin1@galaxia.app");
    expect(result[1]!.actorEmail).toBe("admin1@galaxia.app");
    expect(result[2]!.actorEmail).toBe("admin2@galaxia.app");
  });

  it("renders the bare UUID (actorEmail: null) rather than dropping the row when the actor cannot be resolved", async () => {
    const { client } = fakeServiceRoleClient({
      auditRows: [BASE_ROW],
      actorEmails: { "admin-1": undefined }
    });

    const result = await readAdminAuditHistory(client, "user-1");

    expect(result).toHaveLength(1);
    expect(result[0]!.actorId).toBe("admin-1");
    expect(result[0]!.actorEmail).toBeNull();
  });

  it("never infers a before/after value — null passes through as null (NEVER-FABRICATE)", async () => {
    const { client } = fakeServiceRoleClient({
      auditRows: [BASE_ROW],
      actorEmails: { "admin-1": "admin@galaxia.app" }
    });

    const result = await readAdminAuditHistory(client, "user-1");

    expect(result[0]!.before).toBeNull();
    expect(result[0]!.after).toBeNull();
  });

  it("passes metadata through as-is when present, and defaults it to null when absent", async () => {
    const rowWithoutMetadata = { ...BASE_ROW, metadata: null };
    const { client } = fakeServiceRoleClient({
      auditRows: [rowWithoutMetadata],
      actorEmails: { "admin-1": "admin@galaxia.app" }
    });

    const result = await readAdminAuditHistory(client, "user-1");
    expect(result[0]!.metadata).toBeNull();
  });

  it("returns an empty array (never throws) when there are no rows for this user", async () => {
    const { client, getUserById } = fakeServiceRoleClient({ auditRows: [], actorEmails: {} });
    const result = await readAdminAuditHistory(client, "user-1");
    expect(result).toEqual([]);
    expect(getUserById).not.toHaveBeenCalled();
  });

  it("throws (does not swallow) when the query itself fails", async () => {
    const { client } = fakeServiceRoleClient({
      auditRows: [],
      auditError: { message: "connection refused" },
      actorEmails: {}
    });
    await expect(readAdminAuditHistory(client, "user-1")).rejects.toThrow(/connection refused/);
  });
});
