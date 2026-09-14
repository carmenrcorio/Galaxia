import { describe, expect, it } from "vitest";
import {
  GLYPH_BASE_PX,
  GLYPH_BASE_PX_LITE,
  GLYPH_WASH_SCALE,
  GLOW_OUTER_SCALE,
  STAR_CORE_RADIUS,
  STAR_SCALE_DEFAULT,
  STAR_SCALE_MAX,
  STAR_SCALE_MIN,
  glyphRadiusPx,
  glowHaloMultiplier,
  nodeDrawnExtent,
  normalizeStarScale,
  starCoreRadius,
} from "../src/galaxy-visual";

describe("starCoreRadius", () => {
  it("gives binary the same core as self", () => {
    expect(starCoreRadius("self")).toBe(7);
    expect(starCoreRadius("binary")).toBe(7);
    expect(starCoreRadius("binary")).toBe(starCoreRadius("self"));
  });

  it("keeps ancient, moon, and default", () => {
    expect(starCoreRadius("ancient")).toBe(STAR_CORE_RADIUS.ancient);
    expect(starCoreRadius("moon")).toBe(STAR_CORE_RADIUS.moon);
    expect(starCoreRadius("star")).toBe(STAR_CORE_RADIUS.default);
    expect(starCoreRadius("fixed")).toBe(STAR_CORE_RADIUS.default);
  });
});

describe("normalizeStarScale", () => {
  it("treats null as 1.0", () => {
    expect(normalizeStarScale(null)).toBe(STAR_SCALE_DEFAULT);
    expect(normalizeStarScale(undefined)).toBe(STAR_SCALE_DEFAULT);
  });

  it("clamps into 0.6–2.0", () => {
    expect(normalizeStarScale(0.2)).toBe(STAR_SCALE_MIN);
    expect(normalizeStarScale(9)).toBe(STAR_SCALE_MAX);
    expect(normalizeStarScale(1.4)).toBeCloseTo(1.4);
  });
});

describe("nodeDrawnExtent", () => {
  it("scales a memorial glyph further out than a plain star", () => {
    const plain = nodeDrawnExtent({ form: "star", precision: "exact", starScale: 1 });
    const memorial = nodeDrawnExtent({
      form: "ancient",
      memorial: true,
      lite: false,
      starScale: 2,
    });
    expect(memorial).toBeCloseTo(GLYPH_BASE_PX * 2 * GLYPH_WASH_SCALE);
    expect(memorial).toBeGreaterThan(plain);
    expect(glyphRadiusPx(true, 1)).toBe(GLYPH_BASE_PX_LITE);
  });

  it("does not change with seat geometry, only visual size", () => {
    const a = nodeDrawnExtent({ form: "self", precision: "year", starScale: 1 });
    const b = nodeDrawnExtent({ form: "self", precision: "year", starScale: 2 });
    expect(b).toBeCloseTo(a * 2);
    expect(a).toBeCloseTo(
      STAR_CORE_RADIUS.self * glowHaloMultiplier(0.32) * GLOW_OUTER_SCALE,
    );
  });
});
