import { describe, expect, it } from "vitest";
import {
  CHIP_INK2,
  CHIP_NAVY,
  SIGN_CHIP_COLORS,
  ZODIAC_SIGNS,
  contrastRatio,
  elementOfSign,
  personChipColor,
  personInitials,
  sunSignFromChart,
  type ZodiacSign,
} from "../src/index";

describe("personChipColor — sun sign element + per-sign variation", () => {
  it("maps each sign to its element family", () => {
    expect(elementOfSign("Aries")).toBe("fire");
    expect(elementOfSign("Leo")).toBe("fire");
    expect(elementOfSign("Sagittarius")).toBe("fire");
    expect(elementOfSign("Taurus")).toBe("earth");
    expect(elementOfSign("Virgo")).toBe("earth");
    expect(elementOfSign("Capricorn")).toBe("earth");
    expect(elementOfSign("Gemini")).toBe("air");
    expect(elementOfSign("Libra")).toBe("air");
    expect(elementOfSign("Aquarius")).toBe("air");
    expect(elementOfSign("Cancer")).toBe("water");
    expect(elementOfSign("Scorpio")).toBe("water");
    expect(elementOfSign("Pisces")).toBe("water");
  });

  it("keeps two water signs in the water family but not identical", () => {
    const cancer = personChipColor({ id: "a", sunSign: "Cancer" });
    const pisces = personChipColor({ id: "b", sunSign: "Pisces" });
    expect(cancer.element).toBe("water");
    expect(pisces.element).toBe("water");
    expect(cancer.fill).not.toBe(pisces.fill);
    expect(cancer.source).toBe("sun-sign");
  });

  it("uses the constellation element hex for the cardinal sign of each element", () => {
    expect(personChipColor({ id: "x", sunSign: "Aries" }).fill).toBe("#E0825C");
    expect(personChipColor({ id: "x", sunSign: "Taurus" }).fill).toBe("#cdbd7a");
    expect(personChipColor({ id: "x", sunSign: "Gemini" }).fill).toBe("#B79AD8");
    expect(personChipColor({ id: "x", sunSign: "Cancer" }).fill).toBe("#6FB1B8");
  });

  it("normalizes sign casing and ignores unknown signs (falls back to id hash)", () => {
    const aries = personChipColor({ id: "same", sunSign: "aries" });
    expect(aries.sign).toBe("Aries");
    expect(aries.source).toBe("sun-sign");
    const unknown = personChipColor({ id: "same", sunSign: "Ophiuchus" });
    const hashed = personChipColor({ id: "same" });
    expect(unknown.fill).toBe(hashed.fill);
    expect(unknown.source).toBe("id-hash");
  });
});

describe("personChipColor — id hash fallback", () => {
  it("is stable for the same id and does not use the display name", () => {
    const a = personChipColor({ id: "person-uuid-1" });
    const b = personChipColor({ id: "person-uuid-1" });
    expect(a.fill).toBe(b.fill);
    expect(a.source).toBe("id-hash");
    expect(a.sign).toBe(b.sign);
  });

  it("spreads different ids across the 12-sign palette", () => {
    const sequential = new Set<string>();
    const uuidLike = new Set<string>();
    for (let i = 0; i < 80; i++) {
      sequential.add(personChipColor({ id: `person-${i}` }).fill);
      uuidLike.add(
        personChipColor({
          id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
        }).fill
      );
    }
    expect(sequential.size).toBeGreaterThanOrEqual(8);
    expect(uuidLike.size).toBeGreaterThanOrEqual(8);
  });
});

describe("personChipColor — contrast on the dark canvas", () => {
  const fills = ZODIAC_SIGNS.map((sign) => SIGN_CHIP_COLORS[sign]);

  it("every fill clears 3:1 against --ink and --ink2 (chip vs navy)", () => {
    for (const fill of fills) {
      expect(contrastRatio(fill, CHIP_NAVY), `${fill} vs navy`).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(fill, CHIP_INK2), `${fill} vs ink2`).toBeGreaterThanOrEqual(3);
    }
  });

  it("every initial-on-fill pair clears 4.5:1 (text on chip)", () => {
    for (const sign of ZODIAC_SIGNS) {
      const chip = personChipColor({ id: sign, sunSign: sign });
      expect(contrastRatio(chip.initial, chip.fill), `${sign} ${chip.fill}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("covers all twelve signs", () => {
    expect(Object.keys(SIGN_CHIP_COLORS).sort()).toEqual([...ZODIAC_SIGNS].sort());
  });
});

describe("sunSignFromChart", () => {
  it("returns a confident Sun and skips uncertain year-only Suns", () => {
    expect(
      sunSignFromChart({
        placements: [{ body: "sun", sign: "Virgo", confident: true }],
      })
    ).toBe("Virgo");
    expect(
      sunSignFromChart({
        placements: [{ body: "Sun", sign: "Virgo", confident: false }],
      })
    ).toBeNull();
    expect(sunSignFromChart(null)).toBeNull();
    expect(sunSignFromChart({ placements: [] })).toBeNull();
  });
});

describe("personInitials", () => {
  it("uses first + last, or a single initial, never an empty chip", () => {
    expect(personInitials("Ada Lovelace")).toBe("AL");
    expect(personInitials("Maya")).toBe("M");
    expect(personInitials("  ")).toBe("?");
  });
});

describe("palette stays inside the brand family", () => {
  it("does not introduce neon / saturated hexes outside the gold-violet-teal set", () => {
    const forbiddenHueHints = ["#00ff", "#ff00", "#0000ff", "#ff0000", "#00ff00"];
    for (const sign of ZODIAC_SIGNS as readonly ZodiacSign[]) {
      const hex = SIGN_CHIP_COLORS[sign].toLowerCase();
      for (const bad of forbiddenHueHints) {
        expect(hex.startsWith(bad)).toBe(false);
      }
    }
  });
});
