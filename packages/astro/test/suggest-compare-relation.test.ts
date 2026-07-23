import { describe, expect, it } from "vitest";
import {
  COMPARE_RELATION_SUGGESTION_HINT,
  defaultCompareRelationType,
  isRomanticRelation,
  suggestCompareRelationType,
} from "../src/compare-guidance";

describe("suggestCompareRelationType — self + other only", () => {
  it("maps self + partner → partners (and the reverse order)", () => {
    expect(suggestCompareRelationType("self", "partner")).toBe("partners");
    expect(suggestCompareRelationType("partner", "self")).toBe("partners");
  });

  it("maps the confident non-romantic self + tag pairs", () => {
    expect(suggestCompareRelationType("self", "sibling")).toBe("siblings");
    expect(suggestCompareRelationType("self", "friend")).toBe("friends");
    expect(suggestCompareRelationType("self", "parent")).toBe("parent-child");
    expect(suggestCompareRelationType("self", "child")).toBe("parent-child");
    expect(suggestCompareRelationType("self", "ancestor")).toBe("ancestor");
  });

  it("does not suggest for self + grandparent / colleague / unmapped", () => {
    expect(suggestCompareRelationType("self", "grandparent")).toBeNull();
    expect(suggestCompareRelationType("self", "colleague")).toBeNull();
    expect(suggestCompareRelationType("self", "coworker")).toBeNull();
    expect(suggestCompareRelationType("self", "spouse")).toBeNull(); // no fuzzy match
    expect(suggestCompareRelationType("self", "Partner")).toBeNull(); // exact, case-sensitive
    expect(suggestCompareRelationType("self", "")).toBeNull();
    expect(suggestCompareRelationType("self", null)).toBeNull();
  });

  it("never infers a pair relation when neither side is self", () => {
    // Two children of the user are siblings to each other — but the tags do
    // not establish that as a Compare default. Must fall back, not guess.
    expect(suggestCompareRelationType("child", "child")).toBeNull();
    // Two parents of the user must NEVER become partners by inference.
    expect(suggestCompareRelationType("parent", "parent")).toBeNull();
    expect(suggestCompareRelationType("friend", "friend")).toBeNull();
    expect(suggestCompareRelationType("partner", "friend")).toBeNull();
    expect(suggestCompareRelationType("sibling", "sibling")).toBeNull();
  });

  it("never suggests when both sides are self", () => {
    expect(suggestCompareRelationType("self", "self")).toBeNull();
  });

  it("partners is only reachable from an explicit self + partner pairing", () => {
    const romanticGuesses = [
      ["parent", "parent"],
      ["partner", "friend"],
      ["partner", "partner"],
      ["self", "spouse"],
      ["self", "husband"],
      ["self", "wife"],
      ["self", "colleague"],
    ] as const;
    for (const [a, b] of romanticGuesses) {
      const suggested = suggestCompareRelationType(a, b);
      expect(suggested).not.toBe("partners");
      if (suggested) expect(isRomanticRelation(suggested)).toBe(false);
    }
    expect(suggestCompareRelationType("self", "partner")).toBe("partners");
  });
});

describe("suggestCompareRelationType — caller contract with defaults + minor clamp", () => {
  it("fallback when null is defaultCompareRelationType(false) = friends", () => {
    const suggested = suggestCompareRelationType("child", "child");
    expect(suggested).toBeNull();
    expect(defaultCompareRelationType(false)).toBe("friends");
  });

  it("minor clamp applied AFTER suggestion still strips romantic (self + partner + minor)", () => {
    // Simulate the page order: suggest first, then clamp when pairHasMinor.
    let relationType =
      suggestCompareRelationType("self", "partner") ?? defaultCompareRelationType(false);
    expect(relationType).toBe("partners");
    const pairHasMinor = true;
    if (pairHasMinor && isRomanticRelation(relationType)) {
      relationType = defaultCompareRelationType(true);
    }
    expect(relationType).toBe("parent-child");
    expect(isRomanticRelation(relationType)).toBe(false);
  });

  it("hint copy is authored and has no em dash", () => {
    expect(COMPARE_RELATION_SUGGESTION_HINT.length).toBeGreaterThan(0);
    expect(COMPARE_RELATION_SUGGESTION_HINT).not.toContain("—");
    expect(COMPARE_RELATION_SUGGESTION_HINT).toBe("Preselected from how you saved them.");
  });
});
