import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { backfillProfileTimezoneIfMissing, resolveBrowserTimezone } from "./timezone";

/** A minimal fake of the `supabase.from("profiles").update({...}).eq("id", ...)` chain, spying on `update`. */
function fakeSupabase(): { client: SupabaseClient; update: ReturnType<typeof vi.fn> } {
  const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
  const client = { from: vi.fn(() => ({ update })) } as unknown as SupabaseClient;
  return { client, update };
}

describe("resolveBrowserTimezone", () => {
  it("returns the real Intl-resolved zone in this test environment", () => {
    // Whatever the CI/dev runtime's zone is, it must round-trip through Intl.
    const tz = resolveBrowserTimezone();
    expect(typeof tz).toBe("string");
    expect(tz!.length).toBeGreaterThan(0);
  });
});

describe("backfillProfileTimezoneIfMissing", () => {
  it("writes once when the stored value is null", async () => {
    const { client, update } = fakeSupabase();
    await backfillProfileTimezoneIfMissing(client, "user-1", null);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("writes once when the stored value is an empty string", async () => {
    const { client, update } = fakeSupabase();
    await backfillProfileTimezoneIfMissing(client, "user-1", "");
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("NEVER writes when a value is already stored — the write-amplification guard", async () => {
    const { client, update } = fakeSupabase();
    await backfillProfileTimezoneIfMissing(client, "user-1", "America/New_York");
    expect(update).not.toHaveBeenCalled();
  });

  it("simulated repeat page loads: only the first (null) load writes, every later load is a no-op", async () => {
    const { client, update } = fakeSupabase();
    // Load 1: no stored value yet.
    await backfillProfileTimezoneIfMissing(client, "user-1", null);
    expect(update).toHaveBeenCalledTimes(1);
    // Load 2, 3, 4: a value is now stored (as it would be after load 1's
    // write landed), so every subsequent mount/load must be a no-op.
    await backfillProfileTimezoneIfMissing(client, "user-1", "America/New_York");
    await backfillProfileTimezoneIfMissing(client, "user-1", "America/New_York");
    await backfillProfileTimezoneIfMissing(client, "user-1", "America/New_York");
    expect(update).toHaveBeenCalledTimes(1);
  });
});
