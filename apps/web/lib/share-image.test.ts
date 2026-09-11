import { describe, expect, it } from "vitest";
import {
  SHARE_IMAGE_BG_RGB,
  SHARE_IMAGE_FAIL,
  SHARE_IMAGE_MAX_DIM,
  SHARE_SUCCESS_REVERT_MS,
  assertShareRasterHasContent,
  composeGalaxyRasters,
  countNonBackgroundSamples,
  isBlankShareRaster,
  paintConstellationFixture,
  shareButtonLabel,
  shareImageOutputSize,
  shouldRevertShareStatus,
} from "./share-image";

describe("shareImageOutputSize", () => {
  it("keeps a typical phone constellation under the iOS cap", () => {
    // 375 CSS px at DPR 2 — the /app constellation card on a phone.
    const size = shareImageOutputSize(750, 840);
    expect(size).toEqual({ width: 750, height: 840, scale: 1 });
  });

  it("scales a desktop-wide constellation down proportionally instead of overflowing 4096", () => {
    const size = shareImageOutputSize(5000, 2720);
    expect(size.width).toBe(SHARE_IMAGE_MAX_DIM);
    expect(size.height).toBe(Math.round((2720 * SHARE_IMAGE_MAX_DIM) / 5000));
    expect(size.width).toBeLessThanOrEqual(SHARE_IMAGE_MAX_DIM);
    expect(size.height).toBeLessThanOrEqual(SHARE_IMAGE_MAX_DIM);
  });
});

describe("blank-raster detection", () => {
  it("treats a solid background buffer as blank", () => {
    const width = 64;
    const height = 64;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = SHARE_IMAGE_BG_RGB[0];
      data[i + 1] = SHARE_IMAGE_BG_RGB[1];
      data[i + 2] = SHARE_IMAGE_BG_RGB[2];
      data[i + 3] = 255;
    }
    const { nonBg, sampled } = countNonBackgroundSamples(data, width, height);
    expect(isBlankShareRaster(nonBg, sampled)).toBe(true);
    expect(() => assertShareRasterHasContent(nonBg, sampled)).toThrow(SHARE_IMAGE_FAIL);
  });

  it("treats a star-painted buffer as content", () => {
    const { atm, motion } = paintConstellationFixture(80, 80, 1);
    const composed = composeGalaxyRasters(atm, motion);
    expect(isBlankShareRaster(composed.nonBg, composed.sampled)).toBe(false);
  });
});

describe("composeGalaxyRasters constellation sizes", () => {
  const cases: { name: string; people: number; width: number; height: number }[] = [
    { name: "1 person on a phone card", people: 1, width: 375, height: 380 },
    { name: "typical family (~8) on a phone card", people: 8, width: 390, height: 440 },
    { name: "largest realistic sky (~40) on the desktop card cap", people: 40, width: 680, height: 680 },
  ];

  for (const c of cases) {
    it(`returns a non-empty raster for ${c.name}`, () => {
      const { atm, motion } = paintConstellationFixture(c.width, c.height, c.people);
      const composed = composeGalaxyRasters(atm, motion);
      expect(composed.width).toBe(c.width);
      expect(composed.height).toBe(c.height);
      expect(composed.nonBg).toBeGreaterThan(0);
      expect(() => assertShareRasterHasContent(composed.nonBg, composed.sampled)).not.toThrow();
    });
  }

  it("caps an oversized backing store rather than producing a 4096+ canvas", () => {
    const { atm, motion } = paintConstellationFixture(4200, 900, 8);
    const composed = composeGalaxyRasters(atm, motion);
    expect(composed.width).toBe(SHARE_IMAGE_MAX_DIM);
    expect(composed.height).toBeLessThanOrEqual(SHARE_IMAGE_MAX_DIM);
    expect(() => assertShareRasterHasContent(composed.nonBg, composed.sampled)).not.toThrow();
  });

  it("throws when both canvases have no pixels", () => {
    const empty = { width: 0, height: 0, data: new Uint8ClampedArray(0) };
    expect(() => composeGalaxyRasters(empty, empty)).toThrow(SHARE_IMAGE_FAIL);
  });
});

describe("share button label state machine", () => {
  it("stays on Share until a confirmed success", () => {
    expect(shareButtonLabel("Share sky image", false, null)).toBe("Share sky image");
    expect(shareButtonLabel("Share sky image", true, null)).toBe("Creating image…");
  });

  it("only shows Shared after success, then reverts", () => {
    expect(shareButtonLabel("Share", false, "Shared")).toBe("Shared");
    expect(shareButtonLabel("Share", false, null)).toBe("Share");
    expect(SHARE_SUCCESS_REVERT_MS).toBeGreaterThan(1000);
    expect(SHARE_SUCCESS_REVERT_MS).toBeLessThan(10_000);
  });

  it("reverts when the tab is backgrounded, not while it stays visible", () => {
    expect(shouldRevertShareStatus(true)).toBe(true);
    expect(shouldRevertShareStatus(false)).toBe(false);
  });
});
