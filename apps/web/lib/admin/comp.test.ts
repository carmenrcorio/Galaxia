import { describe, expect, it, vi } from "vitest";
import {
  CompConflictError,
  CompTargetNotFoundError,
  SelfCompError,
  transitionComp
} from "./comp";

/**
 * Pure/mocked-client unit tests for `transitionComp`, mirroring
 * `support-requests.test.ts`'s tests for `transitionSupportRequest`: fake
 * the service-role client's chained calls, prove the read-validate-write
 * shape without a live database. The live-DB proof (real audit rows, real
 * hasAccess crossing) is `comp-verify.test.ts`.
 */

interface FakeRow {
  id: string;
  comped: boolean;
  subscription_status?: string | null;
  trial_ends_at?: string | null;
}

function fakeClientFor(existing: FakeRow | null, updateResult: FakeRow | null) {
  const maybeSingleForSelect = vi.fn().mockResolvedValue({ data: existing, error: null });
  const eqForSelect = vi.fn().mockReturnValue({ maybeSingle: maybeSingleForSelect });
  const selectForFetch = vi.fn().mockReturnValue({ eq: eqForSelect });

  const maybeSingleForUpdate = vi.fn().mockResolvedValue({ data: updateResult, error: null });
  const selectForUpdate = vi.fn().mockReturnValue({ maybeSingle: maybeSingleForUpdate });
  const eqCompedForUpdate = vi.fn().mockReturnValue({ select: selectForUpdate });
  const eqIdForUpdate = vi.fn().mockReturnValue({ eq: eqCompedForUpdate });
  const update = vi.fn().mockReturnValue({ eq: eqIdForUpdate });

  const from = vi.fn().mockReturnValue({ select: selectForFetch, update });
  return { client: { from } as never, from, update, eqCompedForUpdate };
}

describe("transitionComp — self-action refusal", () => {
  it("refuses when targetUserId === actorId, before touching the database at all", async () => {
    const { client, from } = fakeClientFor(null, null);
    await expect(transitionComp(client, "user-1", "user-1", "grant")).rejects.toThrow(SelfCompError);
    // No read, no write — the self-check runs before any database call.
    expect(from).not.toHaveBeenCalled();
  });

  it("refuses a self-revoke the same way as a self-grant", async () => {
    const { client, from } = fakeClientFor(null, null);
    await expect(transitionComp(client, "admin-1", "admin-1", "revoke")).rejects.toThrow(SelfCompError);
    expect(from).not.toHaveBeenCalled();
  });
});

describe("transitionComp — not-found", () => {
  it("throws CompTargetNotFoundError when the target profile does not exist", async () => {
    const { client } = fakeClientFor(null, null);
    await expect(transitionComp(client, "missing-user", "admin-1", "grant")).rejects.toThrow(
      CompTargetNotFoundError
    );
  });
});

describe("transitionComp — no-op conflict guard (never a silent re-stamp)", () => {
  it("throws CompConflictError granting an already-comped account, without writing", async () => {
    const { client, update } = fakeClientFor({ id: "user-1", comped: true }, null);
    await expect(transitionComp(client, "user-1", "admin-1", "grant")).rejects.toThrow(CompConflictError);
    expect(update).not.toHaveBeenCalled();
  });

  it("throws CompConflictError revoking a non-comped account, without writing", async () => {
    const { client, update } = fakeClientFor({ id: "user-1", comped: false }, null);
    await expect(transitionComp(client, "user-1", "admin-1", "revoke")).rejects.toThrow(CompConflictError);
    expect(update).not.toHaveBeenCalled();
  });

  it("throws CompConflictError (not a silent overwrite) when the guarded update matches zero rows (lost the race)", async () => {
    const { client } = fakeClientFor({ id: "user-1", comped: false }, null);
    await expect(transitionComp(client, "user-1", "admin-1", "grant")).rejects.toThrow(/already comped/);
  });
});

describe("transitionComp — writes ONLY comped, guarded on the expected prior value", () => {
  it("grant: updates comped=true, guarded on comped=false, and writes no other column", async () => {
    const { client, update, eqCompedForUpdate } = fakeClientFor(
      { id: "user-1", comped: false },
      { id: "user-1", comped: true, subscription_status: "trialing", trial_ends_at: null }
    );
    const result = await transitionComp(client, "user-1", "admin-1", "grant");
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({ comped: true });
    expect(eqCompedForUpdate).toHaveBeenCalledWith("comped", false);
    expect(result.profile.comped).toBe(true);
  });

  it("revoke: updates comped=false, guarded on comped=true, and writes no other column", async () => {
    const { client, update, eqCompedForUpdate } = fakeClientFor(
      { id: "user-1", comped: true },
      { id: "user-1", comped: false, subscription_status: "canceled", trial_ends_at: null }
    );
    const result = await transitionComp(client, "user-1", "admin-1", "revoke");
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({ comped: false });
    expect(eqCompedForUpdate).toHaveBeenCalledWith("comped", true);
    expect(result.profile.comped).toBe(false);
  });
});

describe("transitionComp — resulting access is decided by the shared hasAccess precedence, never reimplemented", () => {
  it("grant on a canceled/expired-trial account still resolves hasAccess=true (comped short-circuits)", async () => {
    const { client } = fakeClientFor(
      { id: "user-1", comped: false },
      { id: "user-1", comped: true, subscription_status: "canceled", trial_ends_at: "2020-01-01T00:00:00.000Z" }
    );
    const result = await transitionComp(client, "user-1", "admin-1", "grant");
    expect(result.hasAccess).toBe(true);
  });

  it("revoke on a stale-trialing account (no other access) resolves hasAccess=false the instant it lands", async () => {
    const { client } = fakeClientFor(
      { id: "user-1", comped: true },
      { id: "user-1", comped: false, subscription_status: "trialing", trial_ends_at: "2020-01-01T00:00:00.000Z" }
    );
    const result = await transitionComp(client, "user-1", "admin-1", "revoke");
    expect(result.hasAccess).toBe(false);
  });

  it("revoke on an account with a genuinely live trial still resolves hasAccess=true (falls through to real trial state)", async () => {
    const future = new Date(Date.now() + 5 * 86_400_000).toISOString();
    const { client } = fakeClientFor(
      { id: "user-1", comped: true },
      { id: "user-1", comped: false, subscription_status: "trialing", trial_ends_at: future }
    );
    const result = await transitionComp(client, "user-1", "admin-1", "revoke");
    expect(result.hasAccess).toBe(true);
  });

  it("revoke on an active-billing account still resolves hasAccess=true (comp was redundant with real billing)", async () => {
    const { client } = fakeClientFor(
      { id: "user-1", comped: true },
      { id: "user-1", comped: false, subscription_status: "active", trial_ends_at: null }
    );
    const result = await transitionComp(client, "user-1", "admin-1", "revoke");
    expect(result.hasAccess).toBe(true);
  });
});
