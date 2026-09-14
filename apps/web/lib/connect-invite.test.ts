import { describe, expect, it } from "vitest";
import {
  CONNECT_BLOCKED_RELATIONS,
  CONNECT_SHARING,
  CONNECT_UNKNOWN_SENDER,
  CONNECT_WHAT_GALAXIA_IS,
  canOfferConnectInvite,
  connectAcceptLabel,
  connectCompareHref,
  connectInviteTimeRemaining,
  connectLandingHeadline,
  connectPath,
  connectRelationForPerson,
  connectRelationLabel,
  isConnectMergeTarget,
  isConnectRateLimitError,
  isConnectToken,
  landingStatusFromInvite,
  loginForConnectHref,
  reverseConnectRelation,
  signupForConnectHref,
} from "./connect-invite";

describe("connect token shape", () => {
  it("accepts 32 hex and rejects everything else", () => {
    expect(isConnectToken("a".repeat(32))).toBe(true);
    expect(isConnectToken("A".repeat(32))).toBe(true);
    expect(isConnectToken("a".repeat(31))).toBe(false);
    expect(isConnectToken("not-a-token")).toBe(false);
    expect(isConnectToken("")).toBe(false);
  });

  it("builds a /connect path with no query and no PII", () => {
    const token = "ab".repeat(16);
    expect(connectPath(token)).toBe(`/connect/${token}`);
    expect(connectPath(token)).not.toMatch(/@|name|birth/i);
  });
});

describe("canOfferConnectInvite is the universal UI gate", () => {
  const adultFriend = {
    is_self: false,
    relation: "friend",
    is_minor: false,
    birth_date: "1987-12-29",
    birth_precision: "date" as const,
    linked_user_id: null,
  };

  it("allows an adult non-child relation who is not already linked", () => {
    expect(canOfferConnectInvite(adultFriend)).toBe(true);
  });

  it("hides for self, linked, child band, and isMinorForSafety", () => {
    expect(canOfferConnectInvite({ ...adultFriend, is_self: true })).toBe(false);
    expect(canOfferConnectInvite({ ...adultFriend, linked_user_id: "other-user" })).toBe(false);
    expect(canOfferConnectInvite({ ...adultFriend, relation: "child" })).toBe(false);
    expect(canOfferConnectInvite({ ...adultFriend, relation: "grandchild" })).toBe(false);
    expect(canOfferConnectInvite({ ...adultFriend, relation: "daughter" })).toBe(false);
    expect(canOfferConnectInvite({
      ...adultFriend,
      is_minor: true,
    })).toBe(false);
    expect(canOfferConnectInvite({
      ...adultFriend,
      is_minor: false,
      birth_date: "2017-04-03",
      birth_precision: "exact",
    })).toBe(false);
  });

  it("only treats birth_precision none as a merge target", () => {
    expect(isConnectMergeTarget({ ...adultFriend, birth_precision: "none" })).toBe(true);
    expect(isConnectMergeTarget(adultFriend)).toBe(false);
  });
});

describe("relation helpers", () => {
  it("sends picker values the RPC will accept", () => {
    expect(connectRelationForPerson("friend")).toBe("friend");
    expect(connectRelationForPerson("husband")).toBe("partner");
    expect(CONNECT_BLOCKED_RELATIONS).toEqual(["child", "grandchild"]);
  });

  it("inverts the sender relation for mutual add", () => {
    expect(reverseConnectRelation("partner")).toBe("partner");
    expect(reverseConnectRelation("mother")).toBe("child");
    expect(reverseConnectRelation("friend")).toBe("friend");
  });

  it("labels picker values and returns empty when the relation is missing", () => {
    expect(connectRelationLabel("partner")).toBe("Partner");
    expect(connectRelationLabel(null)).toBe("");
  });
});

describe("landing status and remaining time", () => {
  it("treats a pending invite past expires_at as expired", () => {
    expect(landingStatusFromInvite("pending", "2000-01-01T00:00:00Z", new Date("2026-09-14T00:00:00Z"))).toBe("expired");
    expect(landingStatusFromInvite("pending", "2099-01-01T00:00:00Z", new Date("2026-09-14T00:00:00Z"))).toBe("pending");
    expect(landingStatusFromInvite("accepted", null)).toBe("accepted");
    expect(landingStatusFromInvite("revoked", null)).toBe("revoked");
  });

  it("formats remaining time as N days left", () => {
    const now = new Date("2026-09-14T12:00:00Z");
    expect(connectInviteTimeRemaining("2026-09-20T12:00:00Z", now)).toBe("6 days left");
    expect(connectInviteTimeRemaining("2026-09-15T12:00:00Z", now)).toBe("1 day left");
    expect(connectInviteTimeRemaining("2026-09-01T12:00:00Z", now)).toBe("Expired");
  });
});

describe("rate limit copy and auth hrefs", () => {
  it("detects the RPC exception", () => {
    expect(isConnectRateLimitError("Too many open invitations")).toBe(true);
    expect(isConnectRateLimitError("Not authenticated")).toBe(false);
  });

  it("carries the token through signup and login as next, never redirect as the only param", () => {
    const token = "ab".repeat(16);
    expect(signupForConnectHref(token)).toContain("/signup?next=");
    expect(signupForConnectHref(token)).toContain(encodeURIComponent(connectPath(token)));
    expect(loginForConnectHref(token)).toBe(`/login?next=${encodeURIComponent(connectPath(token))}`);
  });

  it("preloads compare with both person ids on the authed compare route", () => {
    expect(connectCompareHref("self-1", "other-1")).toBe("/app/compare?a=self-1&b=other-1");
  });
});

describe("founder-review copy", () => {
  it("does not use an em dash and does not call Galaxia an astrology app", () => {
    expect(CONNECT_WHAT_GALAXIA_IS.includes("\u2014")).toBe(false);
    expect(CONNECT_SHARING.includes("\u2014")).toBe(false);
    expect(CONNECT_WHAT_GALAXIA_IS).not.toMatch(/astrology\s+app/i);
    expect(connectLandingHeadline("Maya", "partner")).toBe("Maya invited you to connect as their partner.");
    expect(connectLandingHeadline("Maya", "")).toBe("Maya invited you to connect.");
  });

  it("uses Accept and connect for the unknown sender and the first name otherwise", () => {
    expect(connectAcceptLabel(CONNECT_UNKNOWN_SENDER)).toBe("Accept and connect");
    expect(connectAcceptLabel("Someone you know")).toBe("Accept and connect");
    expect(connectAcceptLabel("Alex Reyes")).toBe("Connect with Alex");
  });
});
