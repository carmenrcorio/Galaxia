import { initialComparePairIds } from "@galaxia/astro";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toVelaGroups, toVelaPeople, velaDefaultSubjectId } from "./vela-roster";

vi.mock("@galaxia/astro", () => ({
  initialComparePairIds: vi.fn(() => ({ personAId: "known-a", personBId: "known-b" }))
}));

describe("toVelaPeople", () => {
  it("maps sunSign onto sun and keeps passed_at", () => {
    const people = toVelaPeople([
      {
        id: "p1",
        display_name: "Ada",
        relation: "self",
        is_minor: false,
        birth_date: "1990-01-01",
        birth_precision: "exact",
        passed_at: null,
        sunSign: "Leo"
      }
    ]);
    expect(people).toEqual([
      {
        id: "p1",
        display_name: "Ada",
        relation: "self",
        sun: "Leo",
        passed_at: null,
        is_minor: false,
        birth_date: "1990-01-01",
        birth_precision: "exact"
      }
    ]);
  });
});

describe("toVelaGroups", () => {
  it("maps name onto displayName and keeps memberCount", () => {
    expect(toVelaGroups([{ id: "g1", name: "Family", memberCount: 4 }])).toEqual([
      { id: "g1", displayName: "Family", memberCount: 4 }
    ]);
  });
});

describe("velaDefaultSubjectId", () => {
  beforeEach(() => {
    vi.mocked(initialComparePairIds).mockClear();
    vi.mocked(initialComparePairIds).mockReturnValue({ personAId: "known-a", personBId: "known-b" });
  });

  it("uses initialComparePairIds personAId when subject is unset", () => {
    expect(velaDefaultSubjectId(null, [{ id: "self-1", relation: "self" }])).toBe("known-a");
    expect(initialComparePairIds).toHaveBeenCalledTimes(1);
  });

  it("does not reset a subject the user already chose", () => {
    expect(velaDefaultSubjectId("user-picked", [{ id: "self-1", relation: "self" }])).toBe("user-picked");
    expect(initialComparePairIds).not.toHaveBeenCalled();
  });
});
