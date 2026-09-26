import { describe, expect, it } from "vitest";
import {
  HOUSE_OVERLAY_DESCRIPTIONS,
  houseOverlayDescription,
  narrateHouseOverlay,
  narrateHouseOverlayDetail,
  type HouseNumber,
  type HouseOverlayLens,
  type HouseOverlayLine,
  type RelationType,
} from "../src/index";

const HOUSES: HouseNumber[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const LENSES: HouseOverlayLens[] = ["friend", "partner", "family", "coworker"];

const EXPECTED_LENS: Record<RelationType, HouseOverlayLens> = {
  partners: "partner",
  romantic: "partner",
  friends: "friend",
  platonic: "friend",
  siblings: "family",
  "parent-child": "family",
  ancestor: "family",
  colleagues: "coworker",
  "manager-report": "coworker",
  "mentor-mentee": "coworker",
};

function line(house: number): HouseOverlayLine {
  return { owner: "A", body: "mercury", house, area: "communication & siblings" };
}

describe("house overlay descriptions", () => {
  it("authors short and detailed copy for all 12 houses in every lens", () => {
    for (const lens of LENSES) {
      expect(Object.keys(HOUSE_OVERLAY_DESCRIPTIONS[lens]).map(Number)).toEqual(HOUSES);
      for (const house of HOUSES) {
        const description = HOUSE_OVERLAY_DESCRIPTIONS[lens][house];
        expect(description.short.length, `${lens}/${house}/short`).toBeGreaterThan(10);
        expect(description.detail.length, `${lens}/${house}/detail`).toBeGreaterThan(40);
        expect(description.detail, `${lens}/${house}/name`).toContain("{name}");
        expect(description.detail, `${lens}/${house}/planet`).toContain("{planet}");
      }
    }
  });

  it("maps every relationship frame to its intended copy lens", () => {
    for (const [relationType, lens] of Object.entries(EXPECTED_LENS) as [RelationType, HouseOverlayLens][]) {
      for (const house of HOUSES) {
        expect(houseOverlayDescription(line(house), relationType), `${relationType}/${house}`).toBe(
          HOUSE_OVERLAY_DESCRIPTIONS[lens][house]
        );
      }
    }
  });

  it("renders computed names and bodies while naming the receiving perspective", () => {
    const overlay = line(3);
    expect(narrateHouseOverlay(overlay, "friends", "Ada", "Sam")).toBe(
      "Ada's Mercury lands in Sam's 3rd house (communication & siblings). They change how you think and communicate."
    );

    const detail = narrateHouseOverlayDetail(overlay, "friends", "Ada", "Sam");
    expect(detail).toContain("From Sam's perspective:");
    expect(detail).toContain("Ada's Mercury in your 3rd house");
    expect(detail).not.toMatch(/\{(?:name|planet)\}/);
  });

  it("uses the opposite house owner when person B supplies the planet", () => {
    const overlay: HouseOverlayLine = { ...line(10), owner: "B", body: "saturn" };
    const detail = narrateHouseOverlayDetail(overlay, "manager-report", "Ada", "Sam");
    expect(detail).toContain("From Ada's perspective:");
    expect(detail).toContain("Sam's Saturn in your 10th house");
  });

  it("declines invalid house numbers instead of inventing an interpretation", () => {
    expect(houseOverlayDescription(line(0), "friends")).toBeNull();
    expect(houseOverlayDescription(line(13), "partners")).toBeNull();
    expect(narrateHouseOverlayDetail(line(13), "partners", "Ada", "Sam")).toBeNull();
  });
});
