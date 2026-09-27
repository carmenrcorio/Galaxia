import { describe, expect, it } from "vitest";
import { BIRTHSTONE_COLORS, ZODIAC_SIGNS } from "../src";

describe("sign metadata colors", () => {
  it("defines one valid birthstone color for every zodiac sign", () => {
    expect(Object.keys(BIRTHSTONE_COLORS)).toEqual([...ZODIAC_SIGNS]);
    for (const color of Object.values(BIRTHSTONE_COLORS)) {
      expect(color).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it("uses recognizable hues for the named stones", () => {
    expect(BIRTHSTONE_COLORS.Aries).toBe("#E8EEF2");
    expect(BIRTHSTONE_COLORS.Taurus).toBe("#50A878");
    expect(BIRTHSTONE_COLORS.Capricorn).toBe("#7B1E32");
    expect(BIRTHSTONE_COLORS.Aquarius).toBe("#9966CC");
  });
});
