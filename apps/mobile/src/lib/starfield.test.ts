import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildRuntimeLayers,
  nextEmaFrameMs,
  shedFarLayer,
  starCount,
  STARFIELD_EMA_SHED_MS,
  STARFIELD_LAYER_CAP,
  STARFIELD_LAYERS,
  STARFIELD_PARALLAX_LERP,
  STARFIELD_SMALL_VIEWPORT_FACTOR,
  STARFIELD_WARMUP_FRAMES,
  wrapCoord
} from "./starfield";

const mobileRoot = resolve(__dirname, "../..");
const repoRoot = resolve(mobileRoot, "../..");

describe("starfield math matches web CosmicBackground", () => {
  it("keeps the web layer table (parallax, density, radii, alpha, twinkle)", () => {
    const web = readFileSync(resolve(repoRoot, "apps/web/components/cosmic-background.tsx"), "utf8");
    expect(STARFIELD_LAYERS).toEqual([
      { parallax: 9, density: 4200, rMin: 0.15, rMax: 0.65, aMin: 0.14, aRange: 0.20, twMul: 0.7 },
      { parallax: 24, density: 6500, rMin: 0.35, rMax: 1.05, aMin: 0.26, aRange: 0.30, twMul: 1.0 },
      { parallax: 42, density: 9500, rMin: 0.55, rMax: 1.55, aMin: 0.40, aRange: 0.36, twMul: 1.3 }
    ]);
    for (const layer of STARFIELD_LAYERS) {
      expect(web).toContain(`parallax: ${layer.parallax}`);
      expect(web).toContain(`density: ${layer.density}`);
      expect(web).toContain(`rMin: ${layer.rMin}`);
      expect(web).toContain(`rMax: ${layer.rMax}`);
      expect(web).toContain(`aMin: ${layer.aMin}`);
      expect(web).toContain(`aRange: ${layer.aRange}`);
      expect(web).toContain(`twMul: ${layer.twMul}`);
    }
    expect(web).toContain("small ? 1.7");
    expect(web).toContain(", 900)");
    expect(web).toContain("* 0.06");
    expect(web).toContain("emaFrameMs > 29");
    expect(STARFIELD_SMALL_VIEWPORT_FACTOR).toBe(1.7);
    expect(STARFIELD_LAYER_CAP).toBe(900);
    expect(STARFIELD_PARALLAX_LERP).toBe(0.06);
    expect(STARFIELD_EMA_SHED_MS).toBe(29);
    expect(STARFIELD_WARMUP_FRAMES).toBe(10);
  });

  it("caps star counts on a 375-class phone and a large desktop", () => {
    expect(starCount(375, 812, 4200)).toBe(Math.min(Math.round((375 * 812) / (4200 * 1.7)), 900));
    expect(starCount(1440, 900, 4200)).toBe(Math.min(Math.round((1440 * 900) / 4200), 900));
    expect(starCount(375, 812, 4200)).toBeLessThan(starCount(1440, 900, 4200));
  });

  it("wraps coordinates, lerps EMA, and sheds the far layer after warmup", () => {
    expect(wrapCoord(-4, 100)).toBe(96);
    expect(wrapCoord(104, 100)).toBe(4);
    expect(nextEmaFrameMs(16.7, 40)).toBeCloseTo(16.7 * 0.9 + 40 * 0.1, 5);
    expect(shedFarLayer(3, 3, 30, 5)).toBe(3);
    expect(shedFarLayer(3, 3, 30, 11)).toBe(2);
    expect(shedFarLayer(2, 3, 40, 20)).toBe(2);
  });

  it("builds three layers with the web density formula", () => {
    let i = 0;
    const random = () => {
      i += 1;
      return (i % 10) / 10;
    };
    const layers = buildRuntimeLayers(375, 812, random);
    expect(layers).toHaveLength(3);
    expect(layers[0].stars.length).toBe(starCount(375, 812, 4200));
    expect(layers[2].stars.length).toBe(starCount(375, 812, 9500));
    expect(layers[0].stars[0].r).toBeGreaterThan(0);
  });
});
