import { describe, expect, it } from "vitest";
import {
  elementFromRelation,
  formFromRelation,
  hasPassed,
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

  it("ancestors use ancient light even when present", () => {
    expect(usesAncientLight({ relation: "ancestor", passed_at: null })).toBe(true);
    expect(usesAncientLight({ relation: "grandparent", passed_at: null })).toBe(true);
  });

  it("a passed parent/friend/child adopts ancient light without inventing a new form", () => {
    const when = "2026-01-01T00:00:00.000Z";
    expect(usesAncientLight({ relation: "parent", passed_at: when })).toBe(true);
    expect(usesAncientLight({ relation: "friend", passed_at: when })).toBe(true);
    expect(usesAncientLight({ relation: "child", passed_at: when })).toBe(true);
    expect(formFromRelation(false, "parent", when)).toBe("ancient");
    expect(formFromRelation(false, "friend", when)).toBe("ancient");
    expect(ringIndex(false, "parent", when)).toBe(7);
    expect(ringIndex(false, "friend", when)).toBe(7);
    expect(elementFromRelation("friend", when)).toBe("water");
  });

  it("self never becomes ancient light even if passed_at were set", () => {
    expect(usesAncientLight({ is_self: true, relation: "self", passed_at: "2026-01-01T00:00:00.000Z" })).toBe(false);
    expect(formFromRelation(true, "self", "2026-01-01T00:00:00.000Z")).toBe("self");
    expect(ringIndex(true, "self", "2026-01-01T00:00:00.000Z")).toBe(0);
  });

  it("living non-ancestors keep their existing forms", () => {
    expect(formFromRelation(false, "partner", null)).toBe("binary");
    expect(formFromRelation(false, "child", null)).toBe("moon");
    expect(formFromRelation(false, "parent", null)).toBe("fixed");
    expect(formFromRelation(false, "friend", null)).toBe("star");
    expect(ringIndex(false, "partner", null)).toBe(1);
    expect(ringIndex(false, "child", null)).toBe(2);
    expect(ringIndex(false, "parent", null)).toBe(3);
  });
});
