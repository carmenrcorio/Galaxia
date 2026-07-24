import { describe, expect, it } from "vitest";
import {
  GALAXY_COLLISION_JOIN,
  GALAXY_COLLISION_SEP,
  GALAXY_MAX_RING,
  GALAXY_RING_MIN,
  angularDiff,
  galaxySeatNorm,
  galaxySeatXY,
  galaxySeatsResolved,
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

  it("adding another person does not move an existing raw seat (peer-free)", () => {
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
});

describe("galaxySeatsResolved — collision separation", () => {
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

  it("adding an unrelated person does not move existing seats", () => {
    const base = [
      { id: "rosa", isSelf: false, ring: 3 },
      { id: "mateo", isSelf: false, ring: 5 },
    ];
    const before = galaxySeatsResolved(base);
    const after = galaxySeatsResolved([
      ...base,
      { id: "eli-far-away-uuid", isSelf: false, ring: 6 },
    ]);
    expect(after.get("rosa")).toEqual(before.get("rosa"));
    expect(after.get("mateo")).toEqual(before.get("mateo"));
  });

  it("near-collision cluster is spread by stable id order along the ring", () => {
    /* Force three ids onto nearly the same raw angle via a tiny join window
       and synthetic seats: we pick real ids whose hashes already cluster, or
       use a custom join large enough to group anyone on the ring — here we
       use Carmen's known stack (see regression below) pattern with sep check. */
    const people = [
      { id: "aaa-collide", isSelf: false, ring: 4 },
      { id: "bbb-collide", isSelf: false, ring: 4 },
      { id: "ccc-collide", isSelf: false, ring: 4 },
    ];
    /* Widen join so these three (whatever their hashes) form one cluster. */
    const resolved = galaxySeatsResolved(people, { join: Math.PI * 2, sep: GALAXY_COLLISION_SEP });
    const ids = ["aaa-collide", "bbb-collide", "ccc-collide"];
    const angles = ids.map((id) => resolved.get(id)!.angle);
    /* Sorted by id → evenly spaced by SEP around their mean. */
    expect(angularDiff(angles[1], angles[0])).toBeCloseTo(GALAXY_COLLISION_SEP, 5);
    expect(angularDiff(angles[2], angles[1])).toBeCloseTo(GALAXY_COLLISION_SEP, 5);
    /* Distinct seats — no stacking. */
    expect(angles[0]).not.toBe(angles[1]);
    expect(angles[1]).not.toBe(angles[2]);
  });

  it("people already farther than join stay on their raw seats", () => {
    const a = { id: "lonely-a", isSelf: false, ring: 5 };
    const b = { id: "lonely-b", isSelf: false, ring: 5 };
    const rawA = galaxySeatNorm(a);
    const rawB = galaxySeatNorm(b);
    /* Only assert when they do not raw-collide; if they happen to, skip. */
    if (angularDiff(rawA.angle, rawB.angle) >= GALAXY_COLLISION_JOIN) {
      const resolved = galaxySeatsResolved([a, b]);
      expect(resolved.get("lonely-a")).toEqual(rawA);
      expect(resolved.get("lonely-b")).toEqual(rawB);
    }
  });

  it("separates Carmen's Abuelita Rosa / Stevie / Viejita ring-7 stack", () => {
    /* Live account regression — three ancient-light seats within ~8°; labels
       were drawn on top of each other after #91. */
    const people = [
      { id: "5da4a9a8-bcf1-4957-a67b-bad3fdf8aca7", isSelf: false, ring: 7 }, /* Abuelita Rosa */
      { id: "4ff0b94f-7a91-4390-bd84-d0c94d186f9b", isSelf: false, ring: 7 }, /* Stevie */
      { id: "05b5fddb-48c3-40f1-b760-8728c231d5a4", isSelf: false, ring: 7 }, /* Viejita */
      { id: "aa9a15db-b8a5-45d6-ae80-9ac1520da90c", isSelf: false, ring: 7 }, /* Calita — far */
    ];
    const rawRosa = galaxySeatNorm(people[0]);
    const rawStevie = galaxySeatNorm(people[1]);
    const rawViejita = galaxySeatNorm(people[2]);
    expect(angularDiff(rawRosa.angle, rawStevie.angle)).toBeLessThan(GALAXY_COLLISION_JOIN);
    expect(angularDiff(rawStevie.angle, rawViejita.angle)).toBeLessThan(GALAXY_COLLISION_JOIN);

    const resolved = galaxySeatsResolved(people);
    const rosa = resolved.get(people[0].id)!;
    const stevie = resolved.get(people[1].id)!;
    const viejita = resolved.get(people[2].id)!;
    const calita = resolved.get(people[3].id)!;

    expect(angularDiff(rosa.angle, stevie.angle)).toBeGreaterThanOrEqual(GALAXY_COLLISION_SEP - 1e-9);
    expect(angularDiff(stevie.angle, viejita.angle)).toBeGreaterThanOrEqual(GALAXY_COLLISION_SEP - 1e-9);
    expect(angularDiff(rosa.angle, viejita.angle)).toBeGreaterThanOrEqual(GALAXY_COLLISION_SEP - 1e-9);
    /* Calita was not in the cluster — raw seat preserved. */
    expect(calita).toEqual(galaxySeatNorm(people[3]));

    /* Pixel legibility on a typical web ellipse (~900×560). */
    const geom = { cx: 450, cy: 280, radX: 410, radY: 236 };
    const pRosa = galaxySeatXY(rosa, geom);
    const pStevie = galaxySeatXY(stevie, geom);
    const pViejita = galaxySeatXY(viejita, geom);
    expect(Math.hypot(pRosa.x - pStevie.x, pRosa.y - pStevie.y)).toBeGreaterThan(60);
    expect(Math.hypot(pStevie.x - pViejita.x, pStevie.y - pViejita.y)).toBeGreaterThan(60);
  });

  it("id order of cluster members is stable regardless of input order", () => {
    const a = { id: "5da4a9a8-bcf1-4957-a67b-bad3fdf8aca7", isSelf: false, ring: 7 };
    const b = { id: "4ff0b94f-7a91-4390-bd84-d0c94d186f9b", isSelf: false, ring: 7 };
    const c = { id: "05b5fddb-48c3-40f1-b760-8728c231d5a4", isSelf: false, ring: 7 };
    const forward = galaxySeatsResolved([a, b, c]);
    const reverse = galaxySeatsResolved([c, b, a]);
    expect(forward.get(a.id)).toEqual(reverse.get(a.id));
    expect(forward.get(b.id)).toEqual(reverse.get(b.id));
    expect(forward.get(c.id)).toEqual(reverse.get(c.id));
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
