import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  describeFullShare,
  describePairHighlight,
  describePartialOverlap,
  distinctSignCountForPlanet,
  faultLinesInterpretation,
  generationalMapSummary,
  GEN_PLANET_MEANING,
  groupPartialOverlapsByMembers,
  groupSignatureLine,
  joinNames,
  parsePairNames,
  parsePairSummary,
  SHARED_SKY_TAIL,
  sharedSkyLines,
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
    expect(overlaps[0]).toEqual({
      planet: "pluto",
      sign: "Capricorn",
      names: ["Camila", "Emilio"],
      totalMembers: 3,
    });
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

describe("describePartialOverlap", () => {
  const pairUranus = {
    planet: "uranus",
    sign: "Taurus",
    names: ["Camila", "Emilio"],
    totalMembers: 4,
  };
  const majorityUranus = {
    planet: "uranus",
    sign: "Taurus",
    names: ["Camila", "Emilio", "Dana"],
    totalMembers: 4,
  };

  it("pair versus majority produce different tails", () => {
    const pair = describePartialOverlap(pairUranus);
    const majority = describePartialOverlap(majorityUranus);
    expect(pair).toContain(SHARED_SKY_TAIL.pair.uranus);
    expect(majority).toContain(SHARED_SKY_TAIL.majority.uranus);
    expect(SHARED_SKY_TAIL.pair.uranus).not.toBe(SHARED_SKY_TAIL.majority.uranus);
    expect(pair).not.toBe(majority);
  });

  it("each planet produces a different tail", () => {
    const tails = (["uranus", "neptune", "pluto"] as const).map((planet) => {
      const sentence = describePartialOverlap({
        planet,
        sign: "Pisces",
        names: ["Camila", "Emilio"],
        totalMembers: 4,
      });
      expect(sentence).toContain(GEN_PLANET_MEANING[planet]);
      expect(sentence).toContain(SHARED_SKY_TAIL.pair[planet]);
      return SHARED_SKY_TAIL.pair[planet];
    });
    expect(new Set(tails).size).toBe(3);
    const majorityTails = (["uranus", "neptune", "pluto"] as const).map((planet) => SHARED_SKY_TAIL.majority[planet]);
    const wholeTails = (["uranus", "neptune", "pluto"] as const).map((planet) => SHARED_SKY_TAIL.whole[planet]);
    expect(new Set([...tails, ...majorityTails, ...wholeTails]).size).toBe(9);
  });

  it("carries GEN_PLANET_MEANING so the line says what the planet means", () => {
    const sentence = describePartialOverlap({
      planet: "neptune",
      sign: "Pisces",
      names: ["Camila", "Emilio"],
      totalMembers: 3,
    });
    expect(sentence).toContain(GEN_PLANET_MEANING.neptune);
    expect(sentence).toContain("Camila and Emilio");
    expect(sentence).toContain("Neptune in Pisces");
  });
});

describe("sharedSkyLines", () => {
  it("a full group share does not suppress partial clusters on other planets", () => {
    const overlay: CohortOverlayLike = {
      sharedSky: [{ planet: "neptune", sign: "Pisces" }],
      faultLines: [
        {
          planet: "uranus",
          groups: [
            { sign: "Taurus", names: ["Camila", "Emilio"] },
            { sign: "Sagittarius", names: ["Carmen"] },
          ],
        },
        {
          planet: "pluto",
          groups: [
            { sign: "Capricorn", names: ["Camila"] },
            { sign: "Scorpio", names: ["Emilio"] },
            { sign: "Leo", names: ["Carmen"] },
          ],
        },
      ],
    };
    const lines = sharedSkyLines(overlay, 3);
    expect(lines.some((line) => line.coverage === "whole" && line.placements[0]?.planet === "neptune")).toBe(true);
    expect(lines.some((line) => line.placements.some((p) => p.planet === "uranus") && line.names.includes("Camila"))).toBe(true);
    expect(lines.map((line) => line.sentence).join(" ")).toContain("Neptune");
    expect(lines.map((line) => line.sentence).join(" ")).toContain("Uranus");
  });

  it("no two Shared Sky lines in one render share a tail", () => {
    const overlay: CohortOverlayLike = {
      sharedSky: [{ planet: "neptune", sign: "Pisces" }],
      faultLines: [
        {
          planet: "uranus",
          groups: [
            { sign: "Taurus", names: ["Camila", "Emilio"] },
            { sign: "Sagittarius", names: ["Carmen"] },
            { sign: "Aquarius", names: ["Dana"] },
          ],
        },
        {
          planet: "pluto",
          groups: [
            { sign: "Capricorn", names: ["Camila", "Emilio", "Carmen"] },
            { sign: "Scorpio", names: ["Dana"] },
          ],
        },
      ],
    };
    const lines = sharedSkyLines(overlay, 4);
    const tails = lines.map((line) => line.tail);
    expect(tails.length).toBeGreaterThan(1);
    expect(new Set(tails).size).toBe(tails.length);
  });

  it("groups partial overlaps by the set of members, one sentence per set", () => {
    const overlaps = sharedSkyPartialOverlaps(
      [
        {
          planet: "uranus",
          groups: [
            { sign: "Taurus", names: ["Camila", "Emilio"] },
            { sign: "Sagittarius", names: ["Carmen"] },
          ],
        },
        {
          planet: "pluto",
          groups: [
            { sign: "Capricorn", names: ["Camila", "Emilio"] },
            { sign: "Scorpio", names: ["Carmen"] },
          ],
        },
      ],
      3
    );
    const grouped = groupPartialOverlapsByMembers(overlaps);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]).toHaveLength(2);
    const lines = sharedSkyLines(
      {
        sharedSky: [],
        faultLines: [
          {
            planet: "uranus",
            groups: [
              { sign: "Taurus", names: ["Camila", "Emilio"] },
              { sign: "Sagittarius", names: ["Carmen"] },
            ],
          },
          {
            planet: "pluto",
            groups: [
              { sign: "Capricorn", names: ["Camila", "Emilio"] },
              { sign: "Scorpio", names: ["Carmen"] },
            ],
          },
        ],
      },
      3
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]!.sentence).toContain("Uranus in Taurus");
    expect(lines[0]!.sentence).toContain("Pluto in Capricorn");
  });

  it("whole-group lines use GEN_PLANET_MEANING and the whole-coverage tail", () => {
    const sentence = describeFullShare("uranus", "Taurus");
    expect(sentence).toContain(GEN_PLANET_MEANING.uranus);
    expect(sentence).toContain(SHARED_SKY_TAIL.whole.uranus);
    expect(sentence).toContain("Everyone shares Uranus in Taurus");
  });
});

describe("em dash purge in Groups user-facing copy", () => {
  function stripComments(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  }

  it("ships zero U+2014 in user-facing strings in the three named files", () => {
    const files = [
      "lib/groups-copy.ts",
      "app/app/groups/page.tsx",
      "components/groups/generational-map.tsx",
    ];
    for (const rel of files) {
      const src = stripComments(readFileSync(resolve(__dirname, "..", rel), "utf8"));
      expect(src, `${rel} still contains U+2014 outside comments`).not.toContain("\u2014");
    }
  });

  it("copy functions never emit an em dash", () => {
    const samples = [
      SHARED_SKY_NO_OVERLAP_NOTE,
      describeFullShare("pluto", "Scorpio"),
      describePartialOverlap({
        planet: "neptune",
        sign: "Pisces",
        names: ["Camila", "Emilio"],
        totalMembers: 3,
      }),
      generationalMapSummary(["Camila", "Emilio"], {
        sharedSky: [
          { planet: "uranus", sign: "Taurus" },
          { planet: "neptune", sign: "Capricorn" },
          { planet: "pluto", sign: "Scorpio" },
        ],
        faultLines: [],
      }),
      faultLinesInterpretation([
        { planet: "uranus", groups: [{ sign: "Taurus", names: ["Camila", "Emilio"] }, { sign: "Sagittarius", names: ["Carmen"] }] },
        { planet: "neptune", groups: [{ sign: "Pisces", names: ["Camila", "Emilio"] }, { sign: "Capricorn", names: ["Carmen"] }] },
        { planet: "pluto", groups: [{ sign: "Capricorn", names: ["Camila", "Emilio"] }, { sign: "Scorpio", names: ["Carmen"] }] },
      ]),
      describePairHighlight("Carmen", "Camila", "Fault line: uranus Taurus/Sagittarius · neptune Pisces/Capricorn · pluto Capricorn/Scorpio.").sentence,
      describePairHighlight("Camila", "Emilio", "Same generation (uranus Taurus, neptune Pisces, pluto Capricorn).").sentence,
      describePairHighlight("Carmen", "Camila", "Fault line: uranus Taurus/Sagittarius · neptune Pisces/Capricorn.").sentence,
    ];
    for (const sample of samples) {
      expect(sample).not.toContain("\u2014");
    }
  });
});
