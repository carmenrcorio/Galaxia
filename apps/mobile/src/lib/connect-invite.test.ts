import { describe, expect, it } from "vitest";
import {
  CONNECT_BLOCKED_RELATIONS,
  CONNECT_INVITE_ACTION,
  CONNECT_PENDING_TITLE,
  canOfferConnectInvite,
  connectPath,
  connectRelationForPerson,
  isConnectMergeTarget,
  isConnectRateLimitError,
  isConnectToken
} from "./connect-invite";

describe("mobile connect invite gates match web", () => {
  const adultFriend = {
    is_self: false,
    relation: "friend",
    is_minor: false,
    birth_date: "1987-12-29",
    birth_precision: "date" as const,
    linked_user_id: null as string | null
  };

  it("accepts 32 hex tokens and builds /connect/{token}", () => {
    expect(isConnectToken("a".repeat(32))).toBe(true);
    expect(isConnectToken("not-a-token")).toBe(false);
    expect(connectPath("ab".repeat(16))).toBe(`/connect/${"ab".repeat(16)}`);
  });

  it("allows an adult non-child relation who is not already linked", () => {
    expect(canOfferConnectInvite(adultFriend)).toBe(true);
  });

  it("hides for self, linked, child band, memorial, and isMinorForSafety", () => {
    expect(canOfferConnectInvite({ ...adultFriend, is_self: true })).toBe(false);
    expect(canOfferConnectInvite({ ...adultFriend, linked_user_id: "other-user" })).toBe(false);
    expect(canOfferConnectInvite({ ...adultFriend, relation: "child" })).toBe(false);
    expect(canOfferConnectInvite({ ...adultFriend, relation: "grandchild" })).toBe(false);
    expect(canOfferConnectInvite({ ...adultFriend, is_minor: true })).toBe(false);
    expect(canOfferConnectInvite({
      ...adultFriend,
      is_minor: false,
      birth_date: "2017-04-03",
      birth_precision: "exact"
    })).toBe(false);
    expect(canOfferConnectInvite({
      ...adultFriend,
      passed_at: "2024-11-02T00:00:00.000Z"
    })).toBe(false);
  });

  it("merge target is an unlinked none-precision adult", () => {
    expect(isConnectMergeTarget({ ...adultFriend, birth_precision: "none" })).toBe(true);
    expect(isConnectMergeTarget(adultFriend)).toBe(false);
  });

  it("maps relation for the RPC and detects rate-limit copy", () => {
    expect(connectRelationForPerson("friend")).toBe("friend");
    expect(connectRelationForPerson("husband")).toBe("partner");
    expect(CONNECT_BLOCKED_RELATIONS).toEqual(["child", "grandchild"]);
    expect(isConnectRateLimitError("Too many open invitations.")).toBe(true);
    expect(CONNECT_INVITE_ACTION).toBe("Invite to connect");
    expect(CONNECT_PENDING_TITLE).toBe("Pending invites");
  });
});
