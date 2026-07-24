import { describe, expect, it } from "vitest";
import {
  GALAXY_COLLISION_JOIN,
  GALAXY_COLLISION_SEP,
  GALAXY_LABEL_JOIN_PX,
  GALAXY_MAX_RING,
  GALAXY_OCCUPIED_INNER,
  GALAXY_RING_MIN,
  angularDiff,
  galaxyLabelOffsets,
  galaxySeatAngle,
  galaxySeatNorm,
  galaxySeatXY,
  galaxySeatsResolved,
  hash01,
  ringNormAbsolute,
  ringNormsOccupied,
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

describe("ringNormsOccupied — spread across the card", () => {
  it("keeps partner at GALAXY_RING_MIN and spreads other bands to the rim", () => {
    const m = ringNormsOccupied([0, 1, 2, 3, 4, 5]);
    expect(m.get(0)).toBe(0);
    expect(m.get(1)).toBeCloseTo(GALAXY_RING_MIN, 5);
    expect(m.get(2)).toBeCloseTo(GALAXY_OCCUPIED_INNER, 5);
    expect(m.get(5)).toBeCloseTo(1, 5);
    expect(m.get(2)!).toBeLessThan(m.get(3)!);
    expect(m.get(3)!).toBeLessThan(m.get(4)!);
  });

  it("omits empty rings so four occupied bands use the full radius", () => {
    const m = ringNormsOccupied([2, 3, 4, 5]);
    expect(m.has(1)).toBe(false);
    expect(m.get(2)).toBeCloseTo(GALAXY_OCCUPIED_INNER, 5);
    expect(m.get(5)).toBeCloseTo(1, 5);
    /* Even steps — not bunched in the middle third. */
    const step = (m.get(3)! - m.get(2)!) ;
    expect(m.get(4)! - m.get(3)!).toBeCloseTo(step, 5);
    expect(m.get(5)! - m.get(4)!).toBeCloseTo(step, 5);
  });

  it("partner stays clear of the first occupied guide band", () => {
    expect(GALAXY_RING_MIN).toBeLessThan(GALAXY_OCCUPIED_INNER - 0.06);
  });
});

describe("ringNormAbsolute", () => {
  it("puts self/0 at the core and max ring at the rim", () => {
    expect(ringNormAbsolute(0)).toBe(0);
    expect(ringNormAbsolute(1)).toBeCloseTo(GALAXY_RING_MIN, 5);
    expect(ringNormAbsolute(GALAXY_MAX_RING)).toBeCloseTo(1, 5);
  });
});

describe("galaxySeatNorm / angle — learnable map invariants", () => {
  it("same id + ring → identical absolute seat across calls", () => {
    const a = galaxySeatNorm({ id: "p1", isSelf: false, ring: 5 });
    const b = galaxySeatNorm({ id: "p1", isSelf: false, ring: 5 });
    expect(a).toEqual(b);
  });

  it("self is always the core", () => {
    expect(galaxySeatNorm({ id: "me", isSelf: true, ring: 0 })).toEqual({
      nx: 0, ny: 0, angle: 0, rn: 0,
    });
  });

  it("angle is id-stable and independent of ring", () => {
    expect(galaxySeatAngle("mateo")).toBe(galaxySeatNorm({ id: "mateo", isSelf: false, ring: 2 }).angle);
    expect(galaxySeatAngle("mateo")).toBe(galaxySeatNorm({ id: "mateo", isSelf: false, ring: 6 }).angle);
  });
});

describe("galaxySeatsResolved — occupied spread + collision separation", () => {
  it("same input set → identical resolved seats (two-load stability)", () => {
    const people = [
      { id: "a", isSelf: true, ring: 0 },
      { id: "b", isSelf: false, ring: 5 },
      { id: "c", isSelf: false, ring: 5 },
    ];
    const a = galaxySeatsResolved(people);
    const b = galaxySeatsResolved(people);
    expect([...a.entries()]).toEqual([...b.entries()]);
  });

  it("adding a person onto an already-occupied ring does not move other rings", () => {
    const base = [
      { id: "rosa", isSelf: false, ring: 3 },
      { id: "mateo", isSelf: false, ring: 4 },
    ];
    const before = galaxySeatsResolved(base);
    const after = galaxySeatsResolved([
      ...base,
      { id: "eli-on-mateo-ring", isSelf: false, ring: 4 },
    ]);
    /* Occupied set still {3,4} — rosa's seat unchanged. */
    expect(after.get("rosa")).toEqual(before.get("rosa"));
  });

  it("opening a new occupied ring redistributes radii but keeps angles", () => {
    const base = [
      { id: "child", isSelf: false, ring: 2 },
      { id: "friend", isSelf: false, ring: 4 },
    ];
    const before = galaxySeatsResolved(base);
    const after = galaxySeatsResolved([
      ...base,
      { id: "colleague", isSelf: false, ring: 5 },
    ]);
    expect(after.get("child")!.angle).toBe(before.get("child")!.angle);
    expect(after.get("friend")!.angle).toBe(before.get("friend")!.angle);
    /* Innermost occupied band stays at INNER; the former rim band moves inward. */
    expect(after.get("child")!.rn).toBeCloseTo(before.get("child")!.rn, 5);
    expect(after.get("friend")!.rn).toBeLessThan(before.get("friend")!.rn);
  });

  it("near-collision cluster is spread by stable id order along the ring", () => {
    const people = [
      { id: "aaa-collide", isSelf: false, ring: 4 },
      { id: "bbb-collide", isSelf: false, ring: 4 },
      { id: "ccc-collide", isSelf: false, ring: 4 },
    ];
    const resolved = galaxySeatsResolved(people, { join: Math.PI * 2, sep: GALAXY_COLLISION_SEP });
    const ids = ["aaa-collide", "bbb-collide", "ccc-collide"];
    const angles = ids.map((id) => resolved.get(id)!.angle);
    expect(angularDiff(angles[1], angles[0])).toBeCloseTo(GALAXY_COLLISION_SEP, 5);
    expect(angularDiff(angles[2], angles[1])).toBeCloseTo(GALAXY_COLLISION_SEP, 5);
  });

  it("separates Carmen's Stevie / Viejita passed-band stack", () => {
    const stevie = { id: "4ff0b94f-7a91-4390-bd84-d0c94d186f9b", isSelf: false, ring: 6 };
    const viejita = { id: "05b5fddb-48c3-40f1-b760-8728c231d5a4", isSelf: false, ring: 6 };
    const calita = { id: "aa9a15db-b8a5-45d6-ae80-9ac1520da90c", isSelf: false, ring: 6 };
    const rosa = { id: "5da4a9a8-bcf1-4957-a67b-bad3fdf8aca7", isSelf: false, ring: 3 };

    expect(angularDiff(galaxySeatAngle(stevie.id), galaxySeatAngle(viejita.id))).toBeLessThan(GALAXY_COLLISION_JOIN);

    const resolved = galaxySeatsResolved([rosa, stevie, viejita, calita]);
    const s = resolved.get(stevie.id)!;
    const v = resolved.get(viejita.id)!;
    expect(angularDiff(s.angle, v.angle)).toBeGreaterThanOrEqual(GALAXY_COLLISION_SEP - 1e-9);

    const geom = { cx: 200, cy: 200, radX: 160, radY: 160 };
    const pS = galaxySeatXY(s, geom);
    const pV = galaxySeatXY(v, geom);
    expect(Math.hypot(pS.x - pV.x, pS.y - pV.y)).toBeGreaterThan(50);
  });

  it("id order of cluster members is stable regardless of input order", () => {
    const a = { id: "5da4a9a8-bcf1-4957-a67b-bad3fdf8aca7", isSelf: false, ring: 6 };
    const b = { id: "4ff0b94f-7a91-4390-bd84-d0c94d186f9b", isSelf: false, ring: 6 };
    const c = { id: "05b5fddb-48c3-40f1-b760-8728c231d5a4", isSelf: false, ring: 6 };
    const forward = galaxySeatsResolved([a, b, c]);
    const reverse = galaxySeatsResolved([c, b, a]);
    expect(forward.get(a.id)).toEqual(reverse.get(a.id));
    expect(forward.get(b.id)).toEqual(reverse.get(b.id));
    expect(forward.get(c.id)).toEqual(reverse.get(c.id));
  });
});

describe("galaxyLabelOffsets", () => {
  it("same anchors → same offsets (two-load stability)", () => {
    const anchors = [
      { id: "carmen", x: 100, y: 120 },
      { id: "hubs", x: 108, y: 122 },
    ];
    expect([...galaxyLabelOffsets(anchors).entries()]).toEqual([
      ...galaxyLabelOffsets(anchors).entries(),
    ]);
  });

  it("pushes overlapping core labels apart past the join threshold", () => {
    const anchors = [
      { id: "aaa-self", x: 100, y: 100 },
      { id: "bbb-partner", x: 104, y: 100 },
    ];
    const off = galaxyLabelOffsets(anchors, { join: GALAXY_LABEL_JOIN_PX });
    const a = anchors[0];
    const b = anchors[1];
    const ax = a.x + off.get(a.id)!.dx;
    const ay = a.y + off.get(a.id)!.dy;
    const bx = b.x + off.get(b.id)!.dx;
    const by = b.y + off.get(b.id)!.dy;
    expect(Math.hypot(bx - ax, by - ay)).toBeGreaterThanOrEqual(GALAXY_LABEL_JOIN_PX - 0.5);
  });

  it("is order-independent", () => {
    const a = { id: "emilio", x: 200, y: 210 };
    const b = { id: "gabriel", x: 205, y: 212 };
    const forward = galaxyLabelOffsets([a, b]);
    const reverse = galaxyLabelOffsets([b, a]);
    expect(forward.get(a.id)).toEqual(reverse.get(a.id));
    expect(forward.get(b.id)).toEqual(reverse.get(b.id));
  });
});

describe("galaxySeatXY", () => {
  it("maps normalised seats onto the geometry", () => {
    const seat = galaxySeatNorm({ id: "luna", isSelf: false, ring: 2 });
    const { x, y } = galaxySeatXY(seat, { cx: 200, cy: 100, radX: 180, radY: 80 });
    expect(x).toBeCloseTo(200 + seat.nx * 180, 5);
    expect(y).toBeCloseTo(100 + seat.ny * 80, 5);
  });
});
