import { describe, expect, it } from "vitest";
import { invitePersonOwnedByInviter } from "../lib/invite-ownership";

describe("invitePersonOwnedByInviter", () => {
  const owner = "11111111-1111-4111-8111-111111111111";
  const other = "22222222-2222-4222-8222-222222222222";

  it("allows when person.owner_id matches from_user", () => {
    expect(invitePersonOwnedByInviter({ owner_id: owner }, owner)).toBe(true);
  });

  it("denies when person belongs to someone else", () => {
    expect(invitePersonOwnedByInviter({ owner_id: other }, owner)).toBe(false);
  });

  it("denies when person is missing", () => {
    expect(invitePersonOwnedByInviter(null, owner)).toBe(false);
    expect(invitePersonOwnedByInviter(undefined, owner)).toBe(false);
  });

  it("denies when from_user is empty", () => {
    expect(invitePersonOwnedByInviter({ owner_id: owner }, "")).toBe(false);
  });
});
