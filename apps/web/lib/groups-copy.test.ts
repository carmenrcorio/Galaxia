import { describe, expect, it } from "vitest";
import {
  describePairHighlight,
  distinctSignCountForPlanet,
  faultLinesInterpretation,
  generationalMapSummary,
  groupSignatureLine,
  joinNames,
  parsePairNames,
  parsePairSummary,
  sharedSkyPartialOverlaps,
  SHARED_SKY_NO_OVERLAP_NOTE,
  type CohortOverlayLike,
} from "./groups-copy";

describe("joinNames", () => {
  it("joins one, two, and three+ names with an Oxford comma", () => {
    expect(joinNames(["Camila"])).toBe("Camila");
    expect(joinNames(["Camila", "Emilio"])).toBe("Camila and Emilio");
    expect(joinNames(["Camila", "Emilio", "Carmen"])).toBe("Camila, Emilio, and Carmen");
  });
  it("drops empty names", () => {
    expect(joinNames(["", "Camila", ""])).toBe("Camila");
  });
});

describe("distinctSignCountForPlanet", () => {
  const overlay: CohortOverlayLike = {
    sharedSky: [{ planet: "uranus", sign: "Taurus" }],
    faultLines: [{ planet: "pluto", groups: [{ sign: "Capricorn", names: ["A", "B"] }, { sign: "Scorpio", names: ["C"] }] }],
  };
  it("returns 1 for a planet in sharedSky", () => {
    expect(distinctSignCountForPlanet(overlay, "uranus")).toBe(1);
  });
  it("returns the number of sign groups for a planet in faultLines", () => {
    expect(distinctSignCountForPlanet(overlay, "pluto")).toBe(2);
  });
  it("returns 0 for a planet absent from both", () => {
    expect(distinctSignCountForPlanet(overlay, "neptune")).toBe(0);
  });
});

describe("groupSignatureLine", () => {
  it("shows only the member count when there is no overlay (insufficient chart data)", () => {
    expect(groupSignatureLine(3, null)).toBe("3 members");
    expect(groupSignatureLine(1, null)).toBe("1 member");
  });
  it("matches the example: members, split Pluto signs, one fault line", () => {
    const overlay: CohortOverlayLike = {
      sharedSky: [
        { planet: "uranus", sign: "Taurus" },
        { planet: "neptune", sign: "Capricorn" },
      ],
      faultLines: [
        {
          planet: "pluto",
          groups: [
            { sign: "Capricorn", names: ["Camila", "Emilio"] },
            { sign: "Scorpio", names: ["Carmen"] },
          ],
        },
      ],
    };
    expect(groupSignatureLine(3, overlay)).toBe("3 members · 2 Pluto signs · 1 fault line");
  });
  it("says 'same generational sky' when there are no fault lines", () => {
    const overlay: CohortOverlayLike = {
      sharedSky: [
        { planet: "uranus", sign: "Taurus" },
        { planet: "neptune", sign: "Capricorn" },
        { planet: "pluto", sign: "Scorpio" },
      ],
      faultLines: [],
    };
    expect(groupSignatureLine(3, overlay)).toBe("3 members · same generational sky");
  });
});

describe("sharedSkyPartialOverlaps", () => {
  it("finds a sub-group overlap that falls short of the full roster", () => {
    const faultLines: CohortOverlayLike["faultLines"] = [
      {
        planet: "pluto",
        groups: [
          { sign: "Capricorn", names: ["Camila", "Emilio"] },
          { sign: "Scorpio", names: ["Carmen"] },
        ],
      },
    ];
    const overlaps = sharedSkyPartialOverlaps(faultLines, 3);
    expect(overlaps).toHaveLength(1);
    expect(overlaps[0]).toEqual({ planet: "pluto", sign: "Capricorn", names: ["Camila", "Emilio"] });
  });
  it("returns nothing when every sign group is a singleton", () => {
    const faultLines: CohortOverlayLike["faultLines"] = [
      {
        planet: "pluto",
        groups: [
          { sign: "Capricorn", names: ["Camila"] },
          { sign: "Scorpio", names: ["Carmen"] },
          { sign: "Leo", names: ["Emilio"] },
        ],
      },
    ];
    expect(sharedSkyPartialOverlaps(faultLines, 3)).toHaveLength(0);
  });
  it("never treats a full-roster sign group (already in sharedSky) as partial", () => {
    // faultLines only ever contains planets NOT fully shared, so a group
    // spanning every member inside faultLines should not occur — but guard anyway.
    const faultLines: CohortOverlayLike["faultLines"] = [
      { planet: "pluto", groups: [{ sign: "Capricorn", names: ["A", "B", "C"] }] },
    ];
    expect(sharedSkyPartialOverlaps(faultLines, 3)).toHaveLength(0);
  });
});

describe("SHARED_SKY_NO_OVERLAP_NOTE", () => {
  it("never reads as a dead end", () => {
    expect(SHARED_SKY_NO_OVERLAP_NOTE.toLowerCase()).not.toContain("no full-group shared");
    expect(SHARED_SKY_NO_OVERLAP_NOTE).toContain("Fault Lines");
  });
});

describe("faultLinesInterpretation", () => {
  it("returns empty string when there are no fault lines", () => {
    expect(faultLinesInterpretation([])).toBe("");
  });
  it("names the minority against the majority when the same 2-way split repeats on every planet", () => {
    const faultLines: CohortOverlayLike["faultLines"] = [
      { planet: "uranus", groups: [{ sign: "Taurus", names: ["Camila", "Emilio"] }, { sign: "Sagittarius", names: ["Carmen"] }] },
      { planet: "neptune", groups: [{ sign: "Pisces", names: ["Camila", "Emilio"] }, { sign: "Capricorn", names: ["Carmen"] }] },
      { planet: "pluto", groups: [{ sign: "Capricorn", names: ["Camila", "Emilio"] }, { sign: "Scorpio", names: ["Carmen"] }] },
    ];
    const text = faultLinesInterpretation(faultLines);
    expect(text).toContain("two distinct generational cohorts");
    expect(text).toContain("On every slow-moving planet");
    expect(text).toContain("Carmen's instincts were shaped by a different era than Camila and Emilio's");
  });
  it("falls back to a generic split narration when the partition differs per planet", () => {
    const faultLines: CohortOverlayLike["faultLines"] = [
      { planet: "uranus", groups: [{ sign: "Taurus", names: ["Camila"] }, { sign: "Aquarius", names: ["Emilio", "Carmen"] }] },
      { planet: "pluto", groups: [{ sign: "Capricorn", names: ["Camila", "Carmen"] }, { sign: "Scorpio", names: ["Emilio"] }] },
    ];
    const text = faultLinesInterpretation(faultLines);
    expect(text).toContain("shift depending on the planet");
    expect(text).toContain("Uranus");
    expect(text).toContain("Pluto");
  });
});

describe("generationalMapSummary", () => {
  it("returns empty string for fewer than two members", () => {
    expect(generationalMapSummary(["Solo"], { sharedSky: [], faultLines: [] })).toBe("");
  });
  it("celebrates full alignment when there are no fault lines", () => {
    const text = generationalMapSummary(["Camila", "Emilio"], {
      sharedSky: [
        { planet: "uranus", sign: "Taurus" },
        { planet: "neptune", sign: "Capricorn" },
        { planet: "pluto", sign: "Scorpio" },
      ],
      faultLines: [],
    });
    expect(text).toContain("Everyone here shares the same generational sky");
  });
  it("matches the example: an aligned pair plus a lone outlier", () => {
    const overlay: CohortOverlayLike = {
      sharedSky: [],
      faultLines: [
        { planet: "uranus", groups: [{ sign: "Taurus", names: ["Camila", "Emilio"] }, { sign: "Sagittarius", names: ["Carmen"] }] },
        { planet: "neptune", groups: [{ sign: "Pisces", names: ["Camila", "Emilio"] }, { sign: "Capricorn", names: ["Carmen"] }] },
        { planet: "pluto", groups: [{ sign: "Capricorn", names: ["Camila", "Emilio"] }, { sign: "Scorpio", names: ["Carmen"] }] },
      ],
    };
    const text = generationalMapSummary(["Camila", "Emilio", "Carmen"], overlay);
    expect(text).toBe("Camila and Emilio share all three generational planets. Carmen diverges on every one.");
  });
});

describe("parsePairSummary", () => {
  it("parses a 'Same generation' summary", () => {
    const parsed = parsePairSummary("Same generation (uranus Taurus, neptune Pisces).");
    expect(parsed).toEqual({
      sameGeneration: true,
      planets: [{ planet: "uranus", sign: "Taurus" }, { planet: "neptune", sign: "Pisces" }],
    });
  });
  it("parses a 'Fault line' summary", () => {
    const parsed = parsePairSummary("Fault line: uranus Taurus/Sagittarius · pluto Capricorn/Scorpio.");
    expect(parsed).toEqual({
      sameGeneration: false,
      planets: [
        { planet: "uranus", signA: "Taurus", signB: "Sagittarius" },
        { planet: "pluto", signA: "Capricorn", signB: "Scorpio" },
      ],
    });
  });
  it("returns null for an unrecognized string", () => {
    expect(parsePairSummary("something else entirely")).toBeNull();
  });
});

describe("parsePairNames", () => {
  it("splits the persisted 'Name A × Name B' key", () => {
    expect(parsePairNames("Camila × Emilio")).toEqual(["Camila", "Emilio"]);
  });
  it("returns null when the separator is missing", () => {
    expect(parsePairNames("Camila Emilio")).toBeNull();
  });
});

describe("describePairHighlight", () => {
  it("leads with a plain-English sentence and badges a full fault line", () => {
    const result = describePairHighlight(
      "Carmen",
      "Camila",
      "Fault line: uranus Taurus/Sagittarius · neptune Pisces/Capricorn · pluto Capricorn/Scorpio."
    );
    expect(result.badge).toBe("FAULT LINE");
    expect(result.sentence).toContain("Carmen and Camila diverge on every generational planet");
    expect(result.detail).toBe("Uranus Taurus/Sagittarius · Neptune Pisces/Capricorn · Pluto Capricorn/Scorpio");
  });
  it("leads with a plain-English sentence and badges a same-generation pair", () => {
    const result = describePairHighlight("Camila", "Emilio", "Same generation (uranus Taurus, neptune Pisces, pluto Capricorn).");
    expect(result.badge).toBe("SAME GENERATION");
    expect(result.sentence).toContain("Camila and Emilio share every generational planet");
  });
  it("mentions the still-shared planet when only some diverge", () => {
    const result = describePairHighlight("Carmen", "Camila", "Fault line: uranus Taurus/Sagittarius · neptune Pisces/Capricorn.");
    expect(result.sentence).toContain("though they still share Pluto");
  });
  it("never throws on an unrecognized summary, and infers a reasonable badge", () => {
    const result = describePairHighlight("A", "B", "Same generation vibes, roughly.");
    expect(result.badge).toBe("SAME GENERATION");
    expect(result.sentence).toBe("Same generation vibes, roughly.");
  });
});
