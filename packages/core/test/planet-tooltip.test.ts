import { describe, expect, it } from "vitest";
import {
  PLANET_TOOLTIP_CLOSE_DELAY_MS,
  PLANET_TOOLTIP_DISMISS_LABEL,
  PLANET_TOOLTIP_FULL_READING_MOBILE,
  PLANET_TOOLTIP_FULL_READING_WEB,
  houseTooltipLabel,
  placementAnchorId,
  planetTooltipContent,
  planetTooltipSummary,
  signDegreeLabel,
} from "../src/planet-tooltip";

describe("placementAnchorId", () => {
  it("is the one id both the wheel link and the placement row derive", () => {
    expect(placementAnchorId("venus")).toBe("placement-venus");
    expect(placementAnchorId("north_node")).toBe("placement-north_node");
  });

  it("lower-cases engine casing so Venus and venus reach the same card", () => {
    expect(placementAnchorId("Venus")).toBe(placementAnchorId("venus"));
  });
});

describe("houseTooltipLabel", () => {
  it("names every house with its ordinal", () => {
    expect(houseTooltipLabel(1)).toBe("1st House");
    expect(houseTooltipLabel(2)).toBe("2nd House");
    expect(houseTooltipLabel(3)).toBe("3rd House");
    expect(houseTooltipLabel(10)).toBe("10th House");
    expect(houseTooltipLabel(12)).toBe("12th House");
  });

  it("returns null rather than inventing a label for an impossible house", () => {
    expect(houseTooltipLabel(0)).toBeNull();
    expect(houseTooltipLabel(13)).toBeNull();
    expect(houseTooltipLabel(4.5)).toBeNull();
    expect(houseTooltipLabel(null)).toBeNull();
    expect(houseTooltipLabel(undefined)).toBeNull();
  });
});

describe("signDegreeLabel", () => {
  it("floors to whole degrees within the sign", () => {
    expect(signDegreeLabel("Gemini", 14.82)).toBe("Gemini 14\u00B0");
    expect(signDegreeLabel("Aries", 0.4)).toBe("Aries 0\u00B0");
  });

  it("shows the sign alone when there is no degree, never a made-up zero", () => {
    expect(signDegreeLabel("Pisces", undefined)).toBe("Pisces");
    expect(signDegreeLabel("Pisces", null)).toBe("Pisces");
    expect(signDegreeLabel("Pisces", Number.NaN)).toBe("Pisces");
  });
});

describe("planetTooltipContent", () => {
  const base = {
    name: "Venus",
    domain: "How they love",
    sign: "Gemini",
    degree: 14.3,
    house: 10,
    hasHouses: true,
  };

  it("carries name, sign and degree, house, and the domain line", () => {
    const content = planetTooltipContent(base);
    expect(content.name).toBe("Venus");
    expect(content.signLine).toBe("Gemini 14\u00B0");
    expect(content.houseLine).toBe("10th House");
    expect(content.domain).toBe("How they love");
    expect(content.retroLabel).toBeNull();
  });

  it("adds the Rx badge only for a retrograde placement", () => {
    expect(planetTooltipContent({ ...base, retro: true }).retroLabel).toBe("Rx");
    expect(planetTooltipContent({ ...base, retro: false }).retroLabel).toBeNull();
  });

  it("drops the house line when the chart has no cusps, even if a number was passed", () => {
    const content = planetTooltipContent({ ...base, hasHouses: false });
    expect(content.houseLine).toBeNull();
    expect(content.signLine).toBe("Gemini 14\u00B0");
  });

  it("speaks the same facts for a screen reader as the visual card shows", () => {
    const summary = planetTooltipSummary(planetTooltipContent({ ...base, retro: true }));
    expect(summary).toBe("Venus. Gemini 14\u00B0. 10th House. Retrograde. How they love.");
  });

  it("leaves out what it does not have instead of reading an empty slot", () => {
    const summary = planetTooltipSummary(
      planetTooltipContent({ name: "Mars", domain: "Drive & conflict", sign: "Leo", hasHouses: false }),
    );
    expect(summary).toBe("Mars. Leo. Drive & conflict.");
  });
});

describe("tooltip copy", () => {
  it("links into the placement list on both surfaces", () => {
    expect(PLANET_TOOLTIP_FULL_READING_WEB).toBe("See full reading below");
    expect(PLANET_TOOLTIP_FULL_READING_MOBILE).toBe("See full reading");
    expect(PLANET_TOOLTIP_DISMISS_LABEL).toBe("Close placement details");
  });

  it("has no em dash in user-visible copy (ENGINEERING.md 15)", () => {
    for (const copy of [
      PLANET_TOOLTIP_FULL_READING_WEB,
      PLANET_TOOLTIP_FULL_READING_MOBILE,
      PLANET_TOOLTIP_DISMISS_LABEL,
      houseTooltipLabel(10) ?? "",
    ]) {
      expect(copy).not.toContain("\u2014");
    }
  });

  it("gives the reader 300ms to reach the card before it dismisses", () => {
    expect(PLANET_TOOLTIP_CLOSE_DELAY_MS).toBe(300);
  });
});
