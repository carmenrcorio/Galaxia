import { describe, expect, it } from "vitest";
import {
  ELEMENT_NODE_COLORS,
  STAR_COLOR_PALETTE,
  isStarColorPaletteHex,
  normalizeStarColorForWrite,
  resolveNodeColor,
} from "../src/index";

describe("star color palette", () => {
  it("exposes only design-system hexes (with #)", () => {
    for (const entry of STAR_COLOR_PALETTE) {
      expect(entry.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(isStarColorPaletteHex(entry.hex)).toBe(true);
    }
  });

  it("rejects empty / unknown / bare values", () => {
    expect(isStarColorPaletteHex(null)).toBe(false);
    expect(isStarColorPaletteHex(undefined)).toBe(false);
    expect(isStarColorPaletteHex("")).toBe(false);
    expect(isStarColorPaletteHex("#000000")).toBe(false);
    expect(isStarColorPaletteHex("E0825C")).toBe(false);
    expect(isStarColorPaletteHex("#e0825c")).toBe(false); // case-sensitive store
  });
});

describe("normalizeStarColorForWrite", () => {
  it("clears default / empty to null", () => {
    expect(normalizeStarColorForWrite(null)).toBeNull();
    expect(normalizeStarColorForWrite("")).toBeNull();
    expect(normalizeStarColorForWrite("default")).toBeNull();
  });

  it("keeps palette hexes and drops unknown", () => {
    expect(normalizeStarColorForWrite("#E0825C")).toBe("#E0825C");
    expect(normalizeStarColorForWrite("#ff00ff")).toBeNull();
  });
});

describe("resolveNodeColor", () => {
  it("uses star_color when set to a palette hex", () => {
    expect(
      resolveNodeColor({
        is_self: false,
        relation: "friend",
        star_color: "#DA8C8C",
      })
    ).toBe("#DA8C8C");
  });

  it("falls back to element color when star_color is null", () => {
    // friend → fire on the living path
    expect(
      resolveNodeColor({ is_self: false, relation: "friend", star_color: null })
    ).toBe(ELEMENT_NODE_COLORS.fire);
  });

  it("self stays gold when star_color is null", () => {
    expect(
      resolveNodeColor({ is_self: true, relation: "self", star_color: null })
    ).toBe(ELEMENT_NODE_COLORS.gold);
  });

  it("star_color overrides self gold", () => {
    expect(
      resolveNodeColor({ is_self: true, relation: "self", star_color: "#6FB1B8" })
    ).toBe("#6FB1B8");
  });

  it("ignores non-palette star_color and uses element path", () => {
    expect(
      resolveNodeColor({
        is_self: false,
        relation: "partner",
        star_color: "#123456",
      })
    ).toBe(ELEMENT_NODE_COLORS.air);
  });

  it("passed people keep water element fallback when star_color is null", () => {
    expect(
      resolveNodeColor({
        is_self: false,
        relation: "friend",
        passed_at: "2024-11-02T00:00:00.000Z",
        star_color: null,
      })
    ).toBe(ELEMENT_NODE_COLORS.water);
  });
});
