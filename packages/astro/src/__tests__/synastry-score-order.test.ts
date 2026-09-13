import { describe, expect, it } from "vitest";
import { orderedScoreEntries, SYNASTRY_SCORE_ORDER } from "../index";

describe("SYNASTRY_SCORE_ORDER", () => {
  it("starts with overall, then the five dimension rows", () => {
    expect([...SYNASTRY_SCORE_ORDER]).toEqual([
      "overall",
      "emotional",
      "communication",
      "warmth",
      "values",
      "stability",
    ]);
  });

  it("renders Overall first even when object keys arrive alphabetically (JSONB / JSON.parse)", () => {
    const alphabetical = {
      communication: 11,
      emotional: 22,
      overall: 33,
      stability: 44,
      values: 55,
      warmth: 66,
    };
    expect(orderedScoreEntries(alphabetical).map((row) => row.key)).toEqual([
      "overall",
      "emotional",
      "communication",
      "warmth",
      "values",
      "stability",
    ]);
  });

  it("keeps the same order when keys already match computeSynastry insertion order", () => {
    const live = {
      overall: 70,
      emotional: 60,
      communication: 50,
      warmth: 40,
      values: 30,
      stability: 20,
    };
    expect(orderedScoreEntries(live).map((row) => row.key)).toEqual([...SYNASTRY_SCORE_ORDER]);
    expect(orderedScoreEntries(alphabeticalShuffled()).map((row) => row.score)).toEqual([
      70, 60, 50, 40, 30, 20,
    ]);
  });
});

function alphabeticalShuffled() {
  return JSON.parse(
    '{"communication":50,"emotional":60,"overall":70,"stability":20,"values":30,"warmth":40}'
  ) as Record<string, number>;
}
