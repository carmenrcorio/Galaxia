import { describe, expect, it } from "vitest";
import {
  COMPARE_RELATION_SUGGESTION_HINT,
  defaultCompareRelationType,
  initialComparePairIds,
  isRomanticRelation,
  suggestCompareRelationType,
} from "../src/compare-guidance";

describe("suggestCompareRelationType — self + other, and neither-side-self", () => {
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

  it("neither side self: an exact, symmetric, non-romantic match is carried over", () => {
    // Two of the user's siblings are siblings of each other.
    expect(suggestCompareRelationType("sibling", "sibling")).toBe("siblings");
    // A safe, low-stakes default: two of the user's friends read as friends.
    expect(suggestCompareRelationType("friend", "friend")).toBe("friends");
  });

  it("neither side self: mismatched or non-symmetric tags never infer a pair relation", () => {
    // Two children of the user are siblings to each other — but the tags do
    // not establish that as a Compare default. Must fall back, not guess.
    expect(suggestCompareRelationType("child", "child")).toBeNull();
    // Two parents of the user must NEVER become partners by inference.
    expect(suggestCompareRelationType("parent", "parent")).toBeNull();
    expect(suggestCompareRelationType("partner", "friend")).toBeNull();
    expect(suggestCompareRelationType("grandparent", "grandparent")).toBeNull();
    expect(suggestCompareRelationType("colleague", "colleague")).toBeNull();
    expect(suggestCompareRelationType("ancestor", "ancestor")).toBeNull();
  });

  it("neither side self: a matching partner tag on both sides must NOT open romantic", () => {
    // A single "partner" tag between two non-self people must not suggest a
    // romantic lens, even when both sides agree — a `people.relation` tag
    // is each person's relation to the USER, not to each other.
    expect(suggestCompareRelationType("partner", "partner")).toBeNull();
  });

  it("neither side self: no possible tag pair ever suggests a romantic type", () => {
    const tags = ["self", "partner", "sibling", "friend", "parent", "child", "grandparent", "grandchild", "colleague", "ancestor", ""];
    for (const t of tags) {
      const suggested = suggestCompareRelationType(t, t);
      if (suggested) expect(isRomanticRelation(suggested)).toBe(false);
    }
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

  it("minor clamp still wins on the neither-side-self path (sibling + sibling + minor)", () => {
    // The neither-side-self suggestion is non-romantic already, but the
    // clamp must still be the final authority regardless of source.
    let relationType =
      suggestCompareRelationType("sibling", "sibling") ?? defaultCompareRelationType(false);
    expect(relationType).toBe("siblings");
    const pairHasMinor = true;
    if (pairHasMinor && isRomanticRelation(relationType)) {
      relationType = defaultCompareRelationType(true);
    }
    // Not romantic to begin with, so the clamp's "reset when romantic"
    // branch does not fire — siblings stays selected, which is correct.
    expect(relationType).toBe("siblings");
    expect(isRomanticRelation(relationType)).toBe(false);
  });

  it("hint copy is authored and has no em dash", () => {
    expect(COMPARE_RELATION_SUGGESTION_HINT.length).toBeGreaterThan(0);
    expect(COMPARE_RELATION_SUGGESTION_HINT).not.toContain("—");
    expect(COMPARE_RELATION_SUGGESTION_HINT).toBe("Preselected from how you saved them.");
  });
});

describe("initialComparePairIds — Person A/B preselection prefers self", () => {
  it("prefers the self record as Person A, most-recent other as Person B", () => {
    const people = [
      { id: "friend-1", relation: "friend" },
      { id: "partner-1", relation: "partner" },
      { id: "self-1", relation: "self" },
    ];
    expect(initialComparePairIds(people)).toEqual({ personAId: "self-1", personBId: "friend-1" });
  });

  it("finds self even when it is not the most-recently-created row", () => {
    // Newest-first order (created_at desc): self can be anywhere in the array.
    const people = [
      { id: "friend-1", relation: "friend" },
      { id: "self-1", relation: "self" },
      { id: "partner-1", relation: "partner" },
    ];
    expect(initialComparePairIds(people)).toEqual({ personAId: "self-1", personBId: "friend-1" });
  });

  it("falls back to the two most-recently-created people when there is no self record", () => {
    const people = [
      { id: "friend-1", relation: "friend" },
      { id: "partner-1", relation: "partner" },
    ];
    expect(initialComparePairIds(people)).toEqual({ personAId: "friend-1", personBId: "partner-1" });
  });

  it("returns nulls for an empty list, and a null Person B for a self-only list", () => {
    expect(initialComparePairIds([])).toEqual({ personAId: null, personBId: null });
    expect(initialComparePairIds([{ id: "self-1", relation: "self" }])).toEqual({
      personAId: "self-1",
      personBId: null,
    });
  });

  it("never reorders or mutates the input list", () => {
    const people = [
      { id: "friend-1", relation: "friend" },
      { id: "self-1", relation: "self" },
    ];
    const copy = [...people];
    initialComparePairIds(people);
    expect(people).toEqual(copy);
  });
});
