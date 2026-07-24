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
  it("names collapsing groups and conversation count", () => {
    expect(
      formatPersonDeleteConfirmation({
        personName: "Ada",
        collapsingGroupNames: ["Siblings"],
        conversationCount: 2
      })
    ).toBe(
      "This deletes Ada, and the group “Siblings” (it would drop below three people), plus 2 saved conversations."
    );
    expect(
      formatPersonDeleteConfirmation({
        personName: "Ada",
        collapsingGroupNames: [],
        conversationCount: 0
      })
    ).toBe("This deletes Ada.");
  });
});
