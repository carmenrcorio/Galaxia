import { describe, expect, it } from "vitest";
import {
  elementFromRelation,
  formFromRelation,
  hasPassed,
  isAncestorRelation,
  resolveGalaxyRelation,
  ringIndex,
  usesAncientLight,
} from "../src/index";

describe("hasPassed / usesAncientLight", () => {
  it("treats null/undefined passed_at as present", () => {
    expect(hasPassed({ passed_at: null })).toBe(false);
    expect(hasPassed({ passed_at: undefined })).toBe(false);
    expect(hasPassed({})).toBe(false);
  });

  it("treats a timestamptz as remembered (reversible by clearing)", () => {
    expect(hasPassed({ passed_at: "2026-07-12T15:00:00.000Z" })).toBe(true);
  });

  it("ancestor tag uses ancient light even when passed_at is null (no coerce)", () => {
    expect(usesAncientLight({ relation: "ancestor", passed_at: null })).toBe(true);
    expect(isAncestorRelation("ancestor")).toBe(true);
    expect(isAncestorRelation("grandparent")).toBe(false);
  });

  it("living grandparent is family light, not ancient", () => {
    expect(usesAncientLight({ relation: "grandparent", passed_at: null })).toBe(false);
    expect(formFromRelation(false, "grandparent", null)).toBe("star");
    expect(ringIndex(false, "grandparent", null)).toBe(3);
  });

  it("a passed parent/friend/child adopts ancient light without inventing a new form", () => {
    const when = "2026-01-01T00:00:00.000Z";
    expect(usesAncientLight({ relation: "parent", passed_at: when })).toBe(true);
    expect(usesAncientLight({ relation: "friend", passed_at: when })).toBe(true);
    expect(usesAncientLight({ relation: "child", passed_at: when })).toBe(true);
    expect(formFromRelation(false, "parent", when)).toBe("ancient");
    expect(formFromRelation(false, "friend", when)).toBe("ancient");
    expect(ringIndex(false, "parent", when)).toBe(6);
    expect(ringIndex(false, "friend", when)).toBe(6);
    expect(elementFromRelation("friend", when)).toBe("water");
  });

  it("self never becomes ancient light even if passed_at were set", () => {
    expect(usesAncientLight({ is_self: true, relation: "self", passed_at: "2026-01-01T00:00:00.000Z" })).toBe(false);
    expect(formFromRelation(true, "self", "2026-01-01T00:00:00.000Z")).toBe("self");
    expect(ringIndex(true, "self", "2026-01-01T00:00:00.000Z")).toBe(0);
  });

  it("living non-ancestors keep their forms under the P1 map", () => {
    expect(formFromRelation(false, "partner", null)).toBe("binary");
    expect(formFromRelation(false, "child", null)).toBe("moon");
    expect(formFromRelation(false, "parent", null)).toBe("fixed");
    expect(formFromRelation(false, "friend", null)).toBe("star");
    expect(ringIndex(false, "partner", null)).toBe(1);
    expect(ringIndex(false, "child", null)).toBe(2);
    expect(ringIndex(false, "parent", null)).toBe(3);
  });
});

describe("resolveGalaxyRelation — whole values, no substring", () => {
  it("granddaughter / grandson are children (generation down), not ancestors", () => {
    for (const rel of ["granddaughter", "grandson", "grandchild"]) {
      const r = resolveGalaxyRelation(rel);
      expect(r.known).toBe(true);
      expect(r.band).toBe("children");
      expect(r.ring).toBe(2);
      expect(isAncestorRelation(rel)).toBe(false);
      expect(formFromRelation(false, rel, null)).toBe("moon");
      expect(ringIndex(false, rel, null)).toBe(2);
    }
  });

  it("does not treat arbitrary *grand* substrings as ancestors", () => {
    expect(isAncestorRelation("grand")).toBe(false);
    expect(isAncestorRelation("my grandparent")).toBe(false);
    expect(resolveGalaxyRelation("my grandparent").known).toBe(false);
  });

  it("does not match mom/dad as substrings inside other words", () => {
    expect(resolveGalaxyRelation("mommy").known).toBe(false);
    expect(resolveGalaxyRelation("daddy").known).toBe(false);
    expect(resolveGalaxyRelation("mom").band).toBe("family");
    expect(resolveGalaxyRelation("dad").band).toBe("family");
  });

  it("case-folds free-text synonyms (Daughter → child band)", () => {
    const r = resolveGalaxyRelation("Daughter");
    expect(r.known).toBe(true);
    expect(r.band).toBe("children");
    expect(r.ring).toBe(2);
  });

  it("unknown free-text falls back to circle ring 4 with known:false", () => {
    const r = resolveGalaxyRelation("bestie");
    expect(r.known).toBe(false);
    expect(r.band).toBe("unknown");
    expect(r.ring).toBe(4);
    expect(ringIndex(false, "bestie", null)).toBe(4);
  });

  it("maps new picker values onto sketch rings", () => {
    expect(ringIndex(false, "cousin", null)).toBe(4);
    expect(ringIndex(false, "ex", null)).toBe(4);
    expect(ringIndex(false, "boss", null)).toBe(5);
    expect(ringIndex(false, "mentor", null)).toBe(5);
    expect(ringIndex(false, "colleague", null)).toBe(5);
    expect(ringIndex(false, "ancestor", null)).toBe(6);
  });
});
