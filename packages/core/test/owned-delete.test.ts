import { describe, expect, it } from "vitest";
import {
  GROUP_MIN_MEMBERS,
  formatGroupDeleteConfirmation,
  formatPersonDeleteConfirmation,
  groupsCollapsedByMemberRemoval,
  isBelowGroupMinimum
} from "../src/owned-delete";

describe("groupsCollapsedByMemberRemoval", () => {
  it("flags groups at or below the create minimum (would drop below 3)", () => {
    const collapsed = groupsCollapsedByMemberRemoval([
      { groupId: "a", name: "Siblings", memberCount: 3 },
      { groupId: "b", name: "Friends", memberCount: 4 },
      { groupId: "c", name: "Emptyish", memberCount: 2 },
      { groupId: "d", name: "Solo", memberCount: 1 }
    ]);
    expect(collapsed.map((g) => g.groupId).sort()).toEqual(["a", "c", "d"]);
  });

  it("keeps the create minimum constant at 3", () => {
    expect(GROUP_MIN_MEMBERS).toBe(3);
  });
});

describe("isBelowGroupMinimum", () => {
  it("treats 0–2 as below minimum and 3+ as valid", () => {
    expect(isBelowGroupMinimum(0)).toBe(true);
    expect(isBelowGroupMinimum(2)).toBe(true);
    expect(isBelowGroupMinimum(3)).toBe(false);
  });
});

describe("formatGroupDeleteConfirmation", () => {
  it("names the group and conversation count", () => {
    expect(formatGroupDeleteConfirmation("Siblings", 0)).toBe(
      "This deletes Siblings. There are no saved conversations on this group."
    );
    expect(formatGroupDeleteConfirmation("Siblings", 1)).toBe(
      "This deletes Siblings and 1 saved conversation."
    );
    expect(formatGroupDeleteConfirmation("Siblings", 4)).toBe(
      "This deletes Siblings and 4 saved conversations."
    );
  });
});

describe("formatPersonDeleteConfirmation", () => {
  it("names each collapsing group with its own conversation count", () => {
    expect(
      formatPersonDeleteConfirmation({
        personName: "Ada",
        collapsingGroups: [
          { groupId: "a", name: "Siblings", conversationCount: 2 },
          { groupId: "b", name: "Friends", conversationCount: 0 }
        ],
        personConversationCount: 1
      })
    ).toBe(
      "This deletes Ada and 1 saved conversation about them. This also deletes Siblings and 2 saved conversations. This also deletes Friends. There are no saved conversations on this group."
    );
  });

  it("works with no collapsing groups and no person conversations", () => {
    expect(
      formatPersonDeleteConfirmation({
        personName: "Ada",
        collapsingGroups: [],
        personConversationCount: 0
      })
    ).toBe("This deletes Ada.");
  });
});
