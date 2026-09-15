import { describe, expect, it } from "vitest";
import { ensureBirthDataInvite } from "./ensure-birth-data-invite";

type InviteRow = { token: string; expires_at: string | null };

function fakeClient(opts: { pending?: InviteRow | null; insertError?: string }) {
  const inserted: Record<string, unknown>[] = [];
  return {
    inserted,
    from: (table: string) => {
      if (table !== "invites") throw new Error(`unexpected table ${table}`);
      const chain: Record<string, unknown> = {
        select() { return chain; },
        eq() { return chain; },
        order() { return chain; },
        limit() { return chain; },
        maybeSingle: async () => ({ data: opts.pending ?? null, error: null }),
        insert: async (row: Record<string, unknown>) => {
          if (opts.insertError) return { error: { message: opts.insertError } };
          inserted.push(row);
          return { error: null };
        }
      };
      return chain;
    }
  };
}

describe("ensureBirthDataInvite", () => {
  const person = { isMinor: false as const };

  it("refuses a minor and never inserts", async () => {
    const client = fakeClient({});
    const result = await ensureBirthDataInvite(client as never, {
      userId: "u1",
      personId: "p1",
      person: { isMinor: true },
      siteOrigin: "https://galaxiamea.com",
      createIfMissing: true
    });
    expect(result).toEqual({ status: "refused" });
    expect(client.inserted).toEqual([]);
  });

  it("reuses a pending token instead of inserting a second invite", async () => {
    const client = fakeClient({ pending: { token: "pendingtoken", expires_at: null } });
    const first = await ensureBirthDataInvite(client as never, {
      userId: "u1",
      personId: "p1",
      person,
      siteOrigin: "https://galaxiamea.com",
      createIfMissing: true
    });
    const second = await ensureBirthDataInvite(client as never, {
      userId: "u1",
      personId: "p1",
      person,
      siteOrigin: "https://galaxiamea.com",
      createIfMissing: true
    });
    expect(first).toEqual({
      status: "ready",
      url: "https://galaxiamea.com/invite/pendingtoken",
      reused: true
    });
    expect(second).toEqual(first);
    expect(client.inserted).toEqual([]);
  });

  it("inserts a birth_data invite with a 30-day expiry when none is pending", async () => {
    const client = fakeClient({});
    const result = await ensureBirthDataInvite(client as never, {
      userId: "u1",
      personId: "p1",
      person,
      siteOrigin: "https://galaxiamea.com",
      createIfMissing: true
    });
    expect(result.status).toBe("ready");
    expect(client.inserted).toHaveLength(1);
    expect(client.inserted[0]?.kind).toBe("birth_data");
    expect(client.inserted[0]?.person_id).toBe("p1");
    expect(client.inserted[0]?.expires_at).toBeTruthy();
    if (result.status === "ready") {
      expect(result.reused).toBe(false);
      expect(result.url).toMatch(/^https:\/\/galaxiamea.com\/invite\//);
    }
  });

  it("stays idle when createIfMissing is false and nothing is pending", async () => {
    const client = fakeClient({});
    const result = await ensureBirthDataInvite(client as never, {
      userId: "u1",
      personId: "p1",
      person,
      siteOrigin: "https://galaxiamea.com",
      createIfMissing: false
    });
    expect(result).toEqual({ status: "idle" });
    expect(client.inserted).toEqual([]);
  });
});
