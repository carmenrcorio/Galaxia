import { describe, expect, it, vi } from "vitest";
import {
  SupportRequestConflictError,
  SupportRequestNotFoundError,
  sortSupportRequestsOpenFirst,
  transitionSupportRequest
} from "./support-requests";

describe("sortSupportRequestsOpenFirst", () => {
  it("puts every open row before every closed row", () => {
    const rows = [
      { id: "a", status: "closed" as const },
      { id: "b", status: "open" as const },
      { id: "c", status: "closed" as const },
      { id: "d", status: "open" as const }
    ];
    const sorted = sortSupportRequestsOpenFirst(rows);
    expect(sorted.map((r) => r.status)).toEqual(["open", "open", "closed", "closed"]);
  });

  it("preserves the incoming (created_at desc) order within each status group — stable sort, not re-ordered by id", () => {
    const rows = [
      { id: "newest-closed", status: "closed" as const },
      { id: "newest-open", status: "open" as const },
      { id: "older-open", status: "open" as const },
      { id: "older-closed", status: "closed" as const }
    ];
    const sorted = sortSupportRequestsOpenFirst(rows);
    expect(sorted.map((r) => r.id)).toEqual(["newest-open", "older-open", "newest-closed", "older-closed"]);
  });

  it("does not mutate the input array", () => {
    const rows = [{ id: "a", status: "closed" as const }, { id: "b", status: "open" as const }];
    const original = [...rows];
    sortSupportRequestsOpenFirst(rows);
    expect(rows).toEqual(original);
  });
});

interface FakeRow {
  id: string;
  status: "open" | "closed";
  owner_id?: string;
  email?: string;
  subject?: string;
  body?: string;
  created_at?: string;
  handled_by?: string | null;
  handled_at?: string | null;
}

function fakeClientFor(existing: FakeRow | null, updateResult: FakeRow | null) {
  const maybeSingleForSelect = vi.fn().mockResolvedValue({ data: existing, error: null });
  const eqForSelect = vi.fn().mockReturnValue({ maybeSingle: maybeSingleForSelect });
  const selectForFetch = vi.fn().mockReturnValue({ eq: eqForSelect });

  const maybeSingleForUpdate = vi.fn().mockResolvedValue({ data: updateResult, error: null });
  const selectForUpdate = vi.fn().mockReturnValue({ maybeSingle: maybeSingleForUpdate });
  const eqStatusForUpdate = vi.fn().mockReturnValue({ select: selectForUpdate });
  const eqIdForUpdate = vi.fn().mockReturnValue({ eq: eqStatusForUpdate });
  const update = vi.fn().mockReturnValue({ eq: eqIdForUpdate });

  const from = vi.fn().mockReturnValue({ select: selectForFetch, update });
  return { client: { from } as never, from, update, eqStatusForUpdate };
}

describe("transitionSupportRequest", () => {
  it("close: reads the current row, then updates status/handled_by/handled_at together", async () => {
    const { client, update } = fakeClientFor({ id: "req-1", status: "open" }, {
      id: "req-1",
      status: "closed",
      handled_by: "admin-1",
      handled_at: "2026-08-22T00:00:00.000Z"
    });

    const result = await transitionSupportRequest(client, "req-1", "admin-1", "close");
    expect(result.status).toBe("closed");
    expect(update).toHaveBeenCalledTimes(1);
    const updatePayload = update.mock.calls[0][0];
    expect(updatePayload.status).toBe("closed");
    expect(updatePayload.handled_by).toBe("admin-1");
    expect(typeof updatePayload.handled_at).toBe("string");
  });

  it("reopen: only valid when the current status is closed", async () => {
    const { client, eqStatusForUpdate } = fakeClientFor({ id: "req-1", status: "closed" }, {
      id: "req-1",
      status: "open",
      handled_by: "admin-1",
      handled_at: "2026-08-22T00:00:00.000Z"
    });

    await transitionSupportRequest(client, "req-1", "admin-1", "reopen");
    // The update itself is also gated on the pre-transition status, so a
    // concurrent transition between the read and the write can't silently
    // overwrite it either.
    expect(eqStatusForUpdate).toHaveBeenCalledWith("status", "closed");
  });

  it("throws SupportRequestNotFoundError when the request does not exist", async () => {
    const { client } = fakeClientFor(null, null);
    await expect(transitionSupportRequest(client, "missing", "admin-1", "close")).rejects.toThrow(
      SupportRequestNotFoundError
    );
  });

  it("throws SupportRequestConflictError when closing an already-closed request", async () => {
    const { client } = fakeClientFor({ id: "req-1", status: "closed" }, null);
    await expect(transitionSupportRequest(client, "req-1", "admin-1", "close")).rejects.toThrow(
      SupportRequestConflictError
    );
  });

  it("throws SupportRequestConflictError when reopening an already-open request", async () => {
    const { client } = fakeClientFor({ id: "req-1", status: "open" }, null);
    await expect(transitionSupportRequest(client, "req-1", "admin-1", "reopen")).rejects.toThrow(
      SupportRequestConflictError
    );
  });

  it("throws SupportRequestConflictError (not a silent overwrite) when the guarded update matches zero rows (lost the race)", async () => {
    const { client } = fakeClientFor({ id: "req-1", status: "open" }, null);
    await expect(transitionSupportRequest(client, "req-1", "admin-1", "close")).rejects.toThrow(
      /already closed/
    );
  });
});
