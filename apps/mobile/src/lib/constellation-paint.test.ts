import { describe, expect, it } from "vitest";
import {
  applyEmaShed,
  bezierCP,
  buildConstellationModel,
  constellationStageHeight,
  hitTestAt,
  hexA,
  nodePos,
  quadraticPoint,
  bodyLayerPad,
  overlayPerson,
  dragSeatFromPointer,
  type ConstellationPerson,
} from "./constellation-paint";

function person(partial: Partial<ConstellationPerson> & Pick<ConstellationPerson, "id">): ConstellationPerson {
  return {
    display_name: partial.display_name ?? partial.id,
    relation: partial.relation ?? "friend",
    birth_precision: partial.birth_precision ?? "exact",
    is_self: partial.is_self ?? false,
    ...partial,
    id: partial.id,
  };
}

describe("constellation paint math", () => {
  it("matches web stage bounds (aspect 1.12, min 380, max min(72vh, 680))", () => {
    expect(constellationStageHeight(335, 812)).toBe(380);
    expect(constellationStageHeight(700, 900)).toBe(648);
    expect(constellationStageHeight(500, 500)).toBe(380);
    expect(constellationStageHeight(600, 1000)).toBe(672);
  });

  it("keeps the web bezier control-point recipe (12% of chord, perpendicular)", () => {
    const { cpx, cpy } = bezierCP(0, 0, 100, 0);
    expect(cpx).toBeCloseTo(50, 5);
    expect(cpy).toBeCloseTo(12, 5);
    const mid = quadraticPoint(0, 0, cpx, cpy, 100, 0, 0.5);
    expect(mid.y).toBeCloseTo(6, 5);
  });

  it("freezes drift for self and custom_position seats", () => {
    const people = [
      person({ id: "self", is_self: true, relation: "self", display_name: "Me" }),
      person({
        id: "custom",
        relation: "friend",
        display_name: "Ada",
        custom_position: { angle: 0.4, radius_pct: 0.7 },
      }),
      person({ id: "drifts", relation: "colleague", display_name: "Nia" }),
    ];
    const model = buildConstellationModel({
      people,
      links: [],
      honorEdges: [],
      width: 390,
      height: 420,
    });
    const t0 = 0;
    const t1 = 8000;
    const self0 = nodePos(model, 0, t0, 2000, false, 1, false);
    const self1 = nodePos(model, 0, t1, 2000, false, 1, false);
    expect(self0).toEqual(self1);

    const custom0 = nodePos(model, 1, t0, 2000, false, 1, false);
    const custom1 = nodePos(model, 1, t1, 2000, false, 1, false);
    expect(custom0).toEqual(custom1);

    const live0 = nodePos(model, 2, t0, 2000, false, 1, false);
    const live1 = nodePos(model, 2, t1, 2000, false, 1, false);
    expect(Math.hypot(live1.x - live0.x, live1.y - live0.y)).toBeGreaterThan(0.5);
  });

  it("reduced-motion also freezes every seat", () => {
    const people = [person({ id: "a", relation: "friend", display_name: "Ada" })];
    const model = buildConstellationModel({
      people,
      links: [],
      honorEdges: [],
      width: 390,
      height: 420,
    });
    const a = nodePos(model, 0, 0, 2000, true, 1, false);
    const b = nodePos(model, 0, 9000, 2000, true, 1, false);
    expect(a).toEqual(b);
  });

  it("hit-tests the nearest star within the memorial/live radius", () => {
    const people = [
      person({ id: "self", is_self: true, relation: "self", display_name: "Me" }),
      person({ id: "outer", relation: "colleague", display_name: "Nia" }),
    ];
    const model = buildConstellationModel({
      people,
      links: [],
      honorEdges: [],
      width: 390,
      height: 420,
    });
    const positions = people.map((_, i) => nodePos(model, i, 0, 2000, true, 1, false));
    expect(hitTestAt(model, positions[0].x, positions[0].y, positions, false)?.id).toBe("self");
    expect(hitTestAt(model, positions[1].x, positions[1].y, positions, false)?.id).toBe("outer");
    expect(hitTestAt(model, 0, 0, positions, false)).toBeNull();
  });

  it("sheds meteors before glow, then recovers with hysteresis", () => {
    let state = { emaFrameMs: 23.5, warmup: 12, meteorsOff: false, lowPerf: false };
    state = applyEmaShed(state, 40, false);
    expect(state.meteorsOff).toBe(true);
    expect(state.lowPerf).toBe(false);
    state = applyEmaShed(state, 50, false);
    expect(state.lowPerf).toBe(true);
    state = applyEmaShed({ ...state, emaFrameMs: 24 }, 16, false);
    expect(state.lowPerf).toBe(true);
    state = applyEmaShed({ ...state, emaFrameMs: 22 }, 16, false);
    expect(state.lowPerf).toBe(false);
    expect(state.meteorsOff).toBe(true);
    state = applyEmaShed({ ...state, emaFrameMs: 18 }, 16, false);
    expect(state.meteorsOff).toBe(false);
  });

  it("encodes hex alpha the way the web canvas does", () => {
    expect(hexA("#E6AE6C", 0.5)).toBe("rgba(230,174,108,0.5)");
  });

  it("sizes the body saveLayer past glow, flare, and memorial wash", () => {
    const self = person({ id: "self", is_self: true, relation: "self", birth_precision: "exact" });
    const memorial = person({
      id: "abuelita",
      relation: "grandparent",
      passed_at: "2019-01-01",
      memorial_constellation: "orion",
      star_scale: 2,
    });
    expect(bodyLayerPad(self, false)).toBeGreaterThan(80);
    expect(bodyLayerPad(memorial, false)).toBeGreaterThan(80);
  });

  it("overlays a pending custom seat and never lets self leave the core", () => {
    const friend = person({ id: "ada", relation: "friend", display_name: "Ada" });
    const self = person({ id: "self", is_self: true, relation: "self", display_name: "Me" });
    const pending = { personId: "ada", angle: 0.4, radiusPct: 0.7 };
    expect(overlayPerson(friend, pending).custom_position).toEqual({ angle: 0.4, radius_pct: 0.7 });
    expect(overlayPerson(self, { personId: "self", angle: 1, radiusPct: 0.9 }).custom_position).toBeUndefined();
    const geom = { cx: 195, cy: 210, radX: 140, radY: 150 };
    const seat = dragSeatFromPointer(195 + 140, 210, friend, false, geom);
    expect(seat.angle).toBeCloseTo(0, 5);
    expect(seat.radius_pct).toBeGreaterThan(0.05);
  });
});
