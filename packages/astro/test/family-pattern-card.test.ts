import { describe, expect, it } from "vitest";
import {
  FAMILY_COMPARE_PLANETS,
  FAMILY_PLANET_LABEL,
  SHARED_PLACEMENT_GUIDANCE,
  formatSharedPlacementHeadline,
  interpretSharedPlacement,
  interpretSharedPlacementCardLine,
  type SharedPlacementPattern,
} from "../src/index";
import type { Sign } from "../src/index";

const SIGNS: Sign[] = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

function pattern(planet: SharedPlacementPattern["planet"], sign: Sign): SharedPlacementPattern {
  return { planet, sign, personIds: ["a", "b"], personNames: ["Ada Lovelace", "Bo"] };
}

describe("formatSharedPlacementHeadline", () => {
  it("lists every shared placement as sign then planet, joined with a middle dot", () => {
    const headline = formatSharedPlacementHeadline([
      pattern("sun", "Leo"),
      pattern("moon", "Cancer"),
      pattern("rising", "Virgo"),
    ]);
    expect(headline).toBe("Leo Sun · Cancer Moon · Virgo Rising");
    expect(headline).not.toContain("\u2014");
    expect(headline).not.toContain("House");
  });

  it("uses FAMILY_PLANET_LABEL so Rising is never 'rising'", () => {
    for (const planet of FAMILY_COMPARE_PLANETS) {
      const headline = formatSharedPlacementHeadline([pattern(planet, "Leo")]);
      expect(headline).toBe(`Leo ${FAMILY_PLANET_LABEL[planet]}`);
    }
  });
});

describe("interpretSharedPlacementCardLine", () => {
  it("is the first sentence of the existing interpretation, not a new invented line", () => {
    const p = pattern("sun", "Leo");
    const full = interpretSharedPlacement(p, 3);
    const line = interpretSharedPlacementCardLine(p, 3);
    expect(full.startsWith(line.replace(/\.$/, "")) || full.startsWith(line)).toBe(true);
    expect(line.endsWith(".")).toBe(true);
    expect(line.includes(". ")).toBe(false);
    expect(line).toContain("Leo");
    expect(line).toContain("Sun");
    expect(line).not.toContain("House");
    expect(line).not.toContain("\u2014");
  });

  it("covers all 72 combinations without houses, dates, or em dashes", () => {
    for (const planet of FAMILY_COMPARE_PLANETS) {
      for (const sign of SIGNS) {
        expect(SHARED_PLACEMENT_GUIDANCE[planet][sign]).toBeTruthy();
        const line = interpretSharedPlacementCardLine(pattern(planet, sign), 3);
        expect(line.length).toBeGreaterThan(8);
        expect(line).not.toContain("House");
        expect(line).not.toContain("\u2014");
        expect(line).not.toMatch(/\b\d{4}-\d{2}-\d{2}\b/);
      }
    }
  });
});
