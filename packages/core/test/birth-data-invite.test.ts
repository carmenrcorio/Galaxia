import { describe, expect, it } from "vitest";
import {
  ASK_BIRTH_DATA_CREATING,
  ASK_BIRTH_DATA_REUSED,
  ASK_BIRTH_DATA_SHARE,
  ASK_BIRTH_DATA_TOGGLE,
  BIRTH_DATA_INVITE_KIND,
  BIRTH_DATA_INVITE_TTL_DAYS,
  askBirthDataAskCopy,
  askBirthDataSendCopy,
  birthDataInviteExpiresAt,
  birthDataInviteInsertRow,
  birthDataInvitePath,
  birthDataInviteUrl,
  canCreateBirthDataInvite,
  isBirthDataInviteExpired,
  resolveBirthDataInvite
} from "../src/birth-data-invite";

const NOW = new Date("2026-09-15T12:00:00.000Z");

describe("birth_data invite copy", () => {
  it("reuses the existing send and creating strings", () => {
    expect(askBirthDataSendCopy("Maya")).toBe(
      "Send this to Maya. When they fill it in, their chart appears here automatically."
    );
    expect(ASK_BIRTH_DATA_CREATING).toBe("Creating link…");
    expect(askBirthDataAskCopy("Maya")).toBe("Ask Maya for their birth details");
  });

  it("names the new share, reused, and toggle strings without an em dash", () => {
    expect(ASK_BIRTH_DATA_SHARE).toBe("Share");
    expect(ASK_BIRTH_DATA_REUSED).toMatch(/same link/);
    expect(ASK_BIRTH_DATA_TOGGLE).toMatch(/Ask them/);
    expect(`${ASK_BIRTH_DATA_SHARE}${ASK_BIRTH_DATA_REUSED}${ASK_BIRTH_DATA_TOGGLE}`).not.toContain(
      "\u2014"
    );
  });
});

describe("resolveBirthDataInvite", () => {
  it("refuses a minor, even if a pending token exists", () => {
    const result = resolveBirthDataInvite({
      person: { isMinor: true },
      pendingToken: "abc",
      now: NOW
    });
    expect(result).toEqual({ action: "refuse", reason: "minor" });
    expect(canCreateBirthDataInvite({ isMinor: true })).toBe(false);
  });

  it("refuses when the birth date backstop says they are under 18", () => {
    const result = resolveBirthDataInvite({
      person: { isMinor: false, birthDate: "2015-06-01", birthPrecision: "date" },
      pendingToken: null,
      now: NOW
    });
    expect(result.action).toBe("refuse");
  });

  it("reuses a pending unexpired token instead of minting another", () => {
    const result = resolveBirthDataInvite({
      person: { isMinor: false },
      pendingToken: "existingtoken",
      pendingExpiresAt: "2026-10-01T00:00:00.000Z",
      now: NOW
    });
    expect(result).toEqual({ action: "reuse", token: "existingtoken" });
  });

  it("treats a null expires_at as still live, matching invites already in production", () => {
    const result = resolveBirthDataInvite({
      person: { isMinor: false },
      pendingToken: "legacy",
      pendingExpiresAt: null,
      now: NOW
    });
    expect(result).toEqual({ action: "reuse", token: "legacy" });
  });

  it("mints a new token with a 30-day expiry when none is pending", () => {
    const result = resolveBirthDataInvite({
      person: { isMinor: false },
      pendingToken: null,
      now: NOW
    });
    expect(result.action).toBe("create");
    if (result.action !== "create") return;
    expect(result.token.length).toBeGreaterThan(8);
    expect(result.token).not.toContain("-");
    expect(result.expiresAt).toBe(birthDataInviteExpiresAt(NOW));
    expect(BIRTH_DATA_INVITE_TTL_DAYS).toBe(30);
    expect(isBirthDataInviteExpired(result.expiresAt, NOW)).toBe(false);
  });

  it("does not reuse an expired pending invite", () => {
    const result = resolveBirthDataInvite({
      person: { isMinor: false },
      pendingToken: "old",
      pendingExpiresAt: "2026-09-01T00:00:00.000Z",
      now: NOW
    });
    expect(result.action).toBe("create");
  });
});

describe("birthDataInviteInsertRow", () => {
  it("always writes birth_data with a person_id and a 30-day expiry", () => {
    const row = birthDataInviteInsertRow(
      "user-1",
      "person-1",
      "tok",
      birthDataInviteExpiresAt(NOW)
    );
    expect(row.kind).toBe(BIRTH_DATA_INVITE_KIND);
    expect(row.person_id).toBe("person-1");
    expect(row.relationship_type).toBeNull();
    expect(row.expires_at).toBeTruthy();
  });

  it("refuses to insert a birth_data invite without a person", () => {
    expect(() => birthDataInviteInsertRow("user-1", "", "tok", birthDataInviteExpiresAt(NOW))).toThrow(
      /person/
    );
  });

  it("builds the public invite URL from the site origin", () => {
    expect(birthDataInvitePath("abc")).toBe("/invite/abc");
    expect(birthDataInviteUrl("https://galaxiamea.com/", "abc")).toBe(
      "https://galaxiamea.com/invite/abc"
    );
  });
});
