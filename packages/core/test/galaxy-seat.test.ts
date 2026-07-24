import { describe, expect, it } from "vitest";
import {
  GALAXY_COLLISION_JOIN,
  GALAXY_COLLISION_SEP,
  GALAXY_LABEL_JOIN_PX,
  GALAXY_MAX_RING,
  GALAXY_RING_JITTER,
  GALAXY_RING_MIN,
  GALAXY_RING_NORMS,
  angularDiff,
  galaxyLabelOffsets,
  galaxySeatAngle,
  galaxySeatNorm,
  galaxySeatXY,
  galaxySeatsResolved,
  hash01,
  ringBandHalfGap,
  ringBandRadius,
  ringNormAbsolute,
  ringNormsOccupied,
  ringSeatRadius,
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

describe("ringBandRadius — one function for seats and guides", () => {
  it("puts self/0 at the core and max ring at the rim", () => {
    expect(ringBandRadius(0)).toBe(0);
    expect(ringBandRadius(1)).toBeCloseTo(GALAXY_RING_MIN, 5);
    expect(ringBandRadius(GALAXY_MAX_RING)).toBeCloseTo(1, 5);
  });

  it("matches the fixed band table (parents = Ring 2 at 0.72)", () => {
    expect(ringBandRadius(2)).toBeCloseTo(0.58, 5); /* children · sketch Ring 1 */
    expect(ringBandRadius(3)).toBeCloseTo(0.72, 5); /* parents  · sketch Ring 2 */
    expect(ringBandRadius(4)).toBeCloseTo(0.84, 5); /* friends  · sketch Ring 3 */
    expect(ringBandRadius(5)).toBeCloseTo(0.93, 5); /* colleagues · sketch Ring 4 */
  });

  it("is identical to ringNormAbsolute (alias)", () => {
    for (let r = 0; r <= GALAXY_MAX_RING; r++) {
      expect(ringNormAbsolute(r)).toBe(ringBandRadius(r));
    }
  });

  it("keeps partner clear of the first guide band", () => {
    expect(GALAXY_RING_MIN).toBeLessThan(ringBandRadius(2) - 0.06);
  });
});

describe("ringNormsOccupied — fixed bands, no redistribution", () => {
  it("returns absolute band radii for occupied rings only", () => {
    const m = ringNormsOccupied([0, 1, 2, 3, 6]);
    expect(m.get(0)).toBe(0);
    expect(m.get(1)).toBeCloseTo(GALAXY_RING_MIN, 5);
    expect(m.get(2)).toBeCloseTo(GALAXY_RING_NORMS[2], 5);
    expect(m.get(3)).toBeCloseTo(GALAXY_RING_NORMS[3], 5);
    expect(m.get(6)).toBeCloseTo(1, 5);
    expect(m.has(4)).toBe(false);
    expect(m.has(5)).toBe(false);
  });

  it("does not push parents outward when friends/colleagues are empty", () => {
    /* Carmen's occupied set: children + parents + ancient — no 4/5. */
    const m = ringNormsOccupied([0, 1, 2, 3, 6]);
    expect(m.get(3)).toBeCloseTo(0.72, 5);
    expect(m.get(3)).toBeLessThan(GALAXY_RING_NORMS[4]!);
  });
});

describe("ringSeatRadius — within-band jitter never crosses bands", () => {
  it("stays inside the half-gap to neighbouring bands", () => {
    for (const ring of [1, 2, 3, 4, 5, 6]) {
      const base = ringBandRadius(ring);
      const half = ringBandHalfGap(ring);
      for (const id of ["a", "b", "mommy", "daddy", "uuid-1", "uuid-2"]) {
        const rn = ringSeatRadius(id, ring);
        expect(Math.abs(rn - base)).toBeLessThanOrEqual(half * 0.85 + 1e-9);
        expect(Math.abs(rn - base)).toBeLessThanOrEqual(base * GALAXY_RING_JITTER + 1e-9);
      }
    }
  });

  it("keeps Mommy/Daddy on the parents band (not friends/colleagues)", () => {
    const mommy = ringSeatRadius("a9545b9f-06bb-45df-b4ef-8880695fcb53", 3);
    const daddy = ringSeatRadius("0d07cca1-e57c-4f32-bc84-7ed3ae5d0663", 3);
    const parents = ringBandRadius(3);
    const friends = ringBandRadius(4);
    const midToFriends = (parents + friends) / 2;
    expect(mommy).toBeLessThan(midToFriends);
    expect(daddy).toBeLessThan(midToFriends);
    expect(Math.abs(mommy - parents)).toBeLessThan(Math.abs(mommy - friends));
    expect(Math.abs(daddy - parents)).toBeLessThan(Math.abs(daddy - friends));
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

describe("galaxySeatsResolved — fixed bands + collision separation", () => {
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

  it("adding a person does not move anyone else's seat", () => {
    const base = [
      { id: "rosa", isSelf: false, ring: 3 },
      { id: "mateo", isSelf: false, ring: 4 },
    ];
    const before = galaxySeatsResolved(base);
    /* Onto an already-occupied ring */
    const afterSame = galaxySeatsResolved([
      ...base,
      { id: "eli-on-mateo-ring", isSelf: false, ring: 4 },
    ]);
    expect(afterSame.get("rosa")).toEqual(before.get("rosa"));
    expect(afterSame.get("mateo")).toEqual(before.get("mateo"));
    /* Opening a new ring — radii stay fixed; peers do not redistribute */
    const afterNew = galaxySeatsResolved([
      ...base,
      { id: "colleague", isSelf: false, ring: 5 },
    ]);
    expect(afterNew.get("rosa")).toEqual(before.get("rosa"));
    expect(afterNew.get("mateo")).toEqual(before.get("mateo"));
  });

  it("seat radius matches the guide band radius (modulo within-band jitter)", () => {
    const people = [
      { id: "a9545b9f-06bb-45df-b4ef-8880695fcb53", isSelf: false, ring: 3 }, /* Mommy */
      { id: "0d07cca1-e57c-4f32-bc84-7ed3ae5d0663", isSelf: false, ring: 3 }, /* Daddy */
      { id: "221729a3-8d80-4371-8656-842660cb86f5", isSelf: false, ring: 2 }, /* Emilio */
    ];
    const resolved = galaxySeatsResolved(people);
    for (const p of people) {
      const seat = resolved.get(p.id)!;
      const guide = ringBandRadius(p.ring);
      expect(Math.abs(seat.rn - guide)).toBeLessThanOrEqual(
        ringBandHalfGap(p.ring) * 0.85 + 1e-9,
      );
    }
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

  it("on a circle, Mommy and Daddy share Ring 2 Euclidean radius", () => {
    /* Carmen's parents — opposite angles; an ellipse made their px radii diverge. */
    const mommyId = "a9545b9f-06bb-45df-b4ef-8880695fcb53";
    const daddyId = "0d07cca1-e57c-4f32-bc84-7ed3ae5d0663";
    const resolved = galaxySeatsResolved([
      { id: mommyId, isSelf: false, ring: 3 },
      { id: daddyId, isSelf: false, ring: 3 },
    ]);
    const geom = { cx: 172, cy: 192, radX: 127.5, radY: 127.5 }; /* circular */
    const m = galaxySeatXY(resolved.get(mommyId)!, geom);
    const d = galaxySeatXY(resolved.get(daddyId)!, geom);
    const mR = Math.hypot(m.x - geom.cx, m.y - geom.cy);
    const dR = Math.hypot(d.x - geom.cx, d.y - geom.cy);
    const ring2 = ringBandRadius(3) * geom.radX;
    const ring4 = ringBandRadius(5) * geom.radX;
    /* Both on Ring 2 band (within jitter), not colleague Ring 4. */
    expect(Math.abs(mR - ring2)).toBeLessThan(ring2 * GALAXY_RING_JITTER + 1.5);
    expect(Math.abs(dR - ring2)).toBeLessThan(ring2 * GALAXY_RING_JITTER + 1.5);
    expect(Math.abs(mR - dR)).toBeLessThan(3); /* co-ring: nearly equal px radius */
    expect(Math.abs(mR - ring2)).toBeLessThan(Math.abs(mR - ring4));
    expect(Math.abs(dR - ring2)).toBeLessThan(Math.abs(dR - ring4));
  });
});
