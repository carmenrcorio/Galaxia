import { describe, expect, it } from "vitest";
import {
  GALAXY_MAX_RING,
  GALAXY_RING_MIN,
  galaxySeatNorm,
  galaxySeatXY,
  hash01,
  ringNormAbsolute,
} from "../src/galaxy-seat";

describe("hash01", () => {
  it("is stable for the same input", () => {
    expect(hash01("person-a")).toBe(hash01("person-a"));
  });

  it("stays in [0, 1)", () => {
    for (const s of ["a", "b", "uuid-ish-0000", ""]) {
      const v = hash01(s);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("differs across distinct ids (not collapsing to coarse buckets)", () => {
    const a = hash01("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    const b = hash01("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    expect(a).not.toBe(b);
  });
});

describe("ringNormAbsolute", () => {
  it("puts self/0 at the core and ring 7 at the rim", () => {
    expect(ringNormAbsolute(0)).toBe(0);
    expect(ringNormAbsolute(1)).toBeCloseTo(GALAXY_RING_MIN, 5);
    expect(ringNormAbsolute(GALAXY_MAX_RING)).toBeCloseTo(1, 5);
  });

  it("does not depend on which other rings are occupied (absolute)", () => {
    /* Same ring always same radius — peer set is not an input. */
    expect(ringNormAbsolute(3)).toBe(ringNormAbsolute(3));
    expect(ringNormAbsolute(2)).toBeLessThan(ringNormAbsolute(5));
  });
});

describe("galaxySeatNorm — learnable map invariants", () => {
  it("same id + ring → identical seat across calls (two-load stability)", () => {
    const a = galaxySeatNorm({ id: "p1", isSelf: false, ring: 5 });
    const b = galaxySeatNorm({ id: "p1", isSelf: false, ring: 5 });
    expect(a).toEqual(b);
  });

  it("self is always the core", () => {
    expect(galaxySeatNorm({ id: "me", isSelf: true, ring: 0 })).toEqual({
      nx: 0, ny: 0, angle: 0, rn: 0,
    });
  });

  it("adding another person does not move an existing seat (peer-free)", () => {
    const before = galaxySeatNorm({ id: "rosa", isSelf: false, ring: 3 });
    /* Simulate a second person existing — seat fn never receives them. */
    const after = galaxySeatNorm({ id: "rosa", isSelf: false, ring: 3 });
    const newcomer = galaxySeatNorm({ id: "eli", isSelf: false, ring: 5 });
    expect(after).toEqual(before);
    expect(newcomer).not.toEqual(before);
  });

  it("moving a person to another ring changes only their radius band", () => {
    const friend = galaxySeatNorm({ id: "mateo", isSelf: false, ring: 5 });
    const ancient = galaxySeatNorm({ id: "mateo", isSelf: false, ring: 7 });
    expect(ancient.rn).toBeGreaterThan(friend.rn);
    /* Angle is id-derived and independent of ring. */
    expect(ancient.angle).toBe(friend.angle);
  });

  it("hash collision stacks deterministically (same seat, no index fallback)", () => {
    /* Force the same inputs → same outputs. Peer-free stacking, not index walk. */
    const a = galaxySeatNorm({ id: "twin", isSelf: false, ring: 4 });
    const b = galaxySeatNorm({ id: "twin", isSelf: false, ring: 4 });
    expect(a.angle).toBe(b.angle);
    expect(a.rn).toBe(b.rn);
  });
});

describe("galaxySeatXY", () => {
  it("maps normalised seats onto the ellipse", () => {
    const seat = galaxySeatNorm({ id: "luna", isSelf: false, ring: 2 });
    const { x, y } = galaxySeatXY(seat, { cx: 200, cy: 100, radX: 180, radY: 80 });
    expect(x).toBeCloseTo(200 + seat.nx * 180, 5);
    expect(y).toBeCloseTo(100 + seat.ny * 80, 5);
  });
});
