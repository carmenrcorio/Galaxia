import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  describeFullShare,
  describePairHighlight,
  describePartialOverlap,
  distinctSignCountForPlanet,
  FAULT_LINE_PAIR_LEAD,
  FAULT_LINES_LEAD_SHIFTING,
  FAULT_LINES_LEAD_TWO_WAY,
  faultLinesInterpretation,
  generationalMapSummary,
  GEN_PLANET_MEANING,
  groupPartialOverlapsByMembers,
  groupSignatureLine,
  joinNames,
  parsePairNames,
  parsePairSummary,
  SAME_GENERATION_LEAD,
  SHARED_SKY_TAIL,
  sharedSkyLines,
  sharedSkyPartialOverlaps,
  SHARED_SKY_NO_OVERLAP_NOTE,
  toPlanetCountBand,
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
      pairEraGapBand: "mid",
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
  const twoWay = (
    planets: Array<{ planet: string; minoritySign: string; majoritySign: string }>
  ): CohortOverlayLike["faultLines"] =>
    planets.map((p) => ({
      planet: p.planet,
      groups: [
        { sign: p.majoritySign, names: ["Camila", "Emilio"] },
        { sign: p.minoritySign, names: ["Carmen"] },
      ],
    }));

  it("returns empty string when there are no fault lines", () => {
    expect(faultLinesInterpretation([])).toBe("");
  });
  it("names the minority, majority, and all three planets when the same 2-way split repeats", () => {
    const faultLines: CohortOverlayLike["faultLines"] = twoWay([
      { planet: "uranus", majoritySign: "Taurus", minoritySign: "Sagittarius" },
      { planet: "neptune", majoritySign: "Pisces", minoritySign: "Capricorn" },
      { planet: "pluto", majoritySign: "Capricorn", minoritySign: "Scorpio" },
    ]);
    const text = faultLinesInterpretation(faultLines);
    expect(text).toContain("two distinct generational cohorts");
    expect(text).toContain("Uranus, Neptune, and Pluto");
    expect(text).not.toContain("slow-moving");
    expect(text).toContain("Carmen's instincts were shaped by a different era than Camila and Emilio's");
    expect(text).toBe(
      FAULT_LINES_LEAD_TWO_WAY[3]("Uranus, Neptune, and Pluto", "Carmen", "Camila and Emilio")
    );
  });
  it("names the two planets when a 2-way split repeats on a pair of them", () => {
    const text = faultLinesInterpretation(
      twoWay([
        { planet: "uranus", majoritySign: "Taurus", minoritySign: "Sagittarius" },
        { planet: "neptune", majoritySign: "Pisces", minoritySign: "Capricorn" },
      ])
    );
    expect(text).toContain("Uranus and Neptune");
    expect(text).toContain("The same split runs through both planets");
    expect(text).not.toContain("Pluto");
    expect(text).not.toContain("slow-moving");
  });
  it("names the single planet that creates a 2-way split", () => {
    const text = faultLinesInterpretation(
      twoWay([{ planet: "pluto", majoritySign: "Capricorn", minoritySign: "Scorpio" }])
    );
    expect(text).toContain("Pluto is the one planet that splits them");
    expect(text).not.toContain("Uranus");
    expect(text).not.toContain("Neptune");
  });
  it("bands 1, 2, and 3 produce distinct 2-way leads, and same count with different planets differs", () => {
    const onePluto = faultLinesInterpretation(
      twoWay([{ planet: "pluto", majoritySign: "Capricorn", minoritySign: "Scorpio" }])
    );
    const oneUranus = faultLinesInterpretation(
      twoWay([{ planet: "uranus", majoritySign: "Taurus", minoritySign: "Sagittarius" }])
    );
    const twoUN = faultLinesInterpretation(
      twoWay([
        { planet: "uranus", majoritySign: "Taurus", minoritySign: "Sagittarius" },
        { planet: "neptune", majoritySign: "Pisces", minoritySign: "Capricorn" },
      ])
    );
    const twoUP = faultLinesInterpretation(
      twoWay([
        { planet: "uranus", majoritySign: "Taurus", minoritySign: "Sagittarius" },
        { planet: "pluto", majoritySign: "Capricorn", minoritySign: "Scorpio" },
      ])
    );
    const three = faultLinesInterpretation(
      twoWay([
        { planet: "uranus", majoritySign: "Taurus", minoritySign: "Sagittarius" },
        { planet: "neptune", majoritySign: "Pisces", minoritySign: "Capricorn" },
        { planet: "pluto", majoritySign: "Capricorn", minoritySign: "Scorpio" },
      ])
    );
    expect(new Set([onePluto, twoUN, three]).size).toBe(3);
    expect(onePluto).not.toBe(oneUranus);
    expect(onePluto).toContain("Pluto");
    expect(oneUranus).toContain("Uranus");
    expect(twoUN).not.toBe(twoUP);
    expect(twoUN).toContain("Neptune");
    expect(twoUN).not.toContain("Pluto");
    expect(twoUP).toContain("Pluto");
    expect(twoUP).not.toContain("Neptune");
  });
  it("names the planets when the partition differs per planet, without the slow-moving fallback", () => {
    const faultLines: CohortOverlayLike["faultLines"] = [
      { planet: "uranus", groups: [{ sign: "Taurus", names: ["Camila"] }, { sign: "Aquarius", names: ["Emilio", "Carmen"] }] },
      { planet: "pluto", groups: [{ sign: "Capricorn", names: ["Camila", "Carmen"] }, { sign: "Scorpio", names: ["Emilio"] }] },
    ];
    const text = faultLinesInterpretation(faultLines);
    expect(text).toContain("shift depending on the planet");
    expect(text).toContain("Uranus");
    expect(text).toContain("Pluto");
    expect(text).not.toContain("slow-moving");
    expect(text).toBe(FAULT_LINES_LEAD_SHIFTING[2]("Uranus and Pluto"));
  });
  it("shifting count-1 names the planet and does not claim the split moves by planet", () => {
    const text = faultLinesInterpretation([
      {
        planet: "neptune",
        groups: [
          { sign: "Pisces", names: ["Camila"] },
          { sign: "Capricorn", names: ["Emilio"] },
          { sign: "Aquarius", names: ["Carmen"] },
        ],
      },
    ]);
    expect(text).toContain("Neptune");
    expect(text).not.toContain("shift depending on the planet");
    expect(text).toBe(FAULT_LINES_LEAD_SHIFTING[1]("Neptune"));
  });
  it("shifting leads differ by planet set at the same count", () => {
    const uranusPluto = faultLinesInterpretation([
      { planet: "uranus", groups: [{ sign: "Taurus", names: ["Camila"] }, { sign: "Aquarius", names: ["Emilio"] }, { sign: "Leo", names: ["Carmen"] }] },
      { planet: "pluto", groups: [{ sign: "Capricorn", names: ["Camila", "Carmen"] }, { sign: "Scorpio", names: ["Emilio"] }] },
    ]);
    const neptunePluto = faultLinesInterpretation([
      { planet: "neptune", groups: [{ sign: "Pisces", names: ["Camila"] }, { sign: "Capricorn", names: ["Emilio"] }, { sign: "Leo", names: ["Carmen"] }] },
      { planet: "pluto", groups: [{ sign: "Capricorn", names: ["Camila", "Carmen"] }, { sign: "Scorpio", names: ["Emilio"] }] },
    ]);
    expect(uranusPluto).not.toBe(neptunePluto);
    expect(uranusPluto).toContain("Uranus");
    expect(uranusPluto).not.toContain("Neptune");
    expect(neptunePluto).toContain("Neptune");
    expect(neptunePluto).not.toContain("Uranus");
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
  it("leads with a plain-English sentence and badges a full fault line, naming all three planets", () => {
    const result = describePairHighlight(
      "Carmen",
      "Camila",
      "Fault line: uranus Taurus/Sagittarius · neptune Pisces/Capricorn · pluto Capricorn/Scorpio."
    );
    expect(result.badge).toBe("FAULT LINE");
    expect(result.sentence).toContain("Carmen and Camila diverge on Uranus, Neptune, and Pluto");
    expect(result.sentence).not.toContain("every generational planet");
    expect(result.detail).toBe("Uranus Taurus/Sagittarius · Neptune Pisces/Capricorn · Pluto Capricorn/Scorpio");
  });
  it("leads with a plain-English sentence and badges a same-generation pair, naming all three planets", () => {
    const result = describePairHighlight("Camila", "Emilio", "Same generation (uranus Taurus, neptune Pisces, pluto Capricorn).");
    expect(result.badge).toBe("SAME GENERATION");
    expect(result.sentence).toContain("Camila and Emilio share Uranus, Neptune, and Pluto");
    expect(result.sentence).not.toContain("every generational planet");
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

  it("Same Generation bands 1, 2, and 3 are structurally distinct and name the planets", () => {
    const one = describePairHighlight("Camila", "Emilio", "Same generation (uranus Taurus).");
    const two = describePairHighlight("Camila", "Emilio", "Same generation (uranus Taurus, neptune Pisces).");
    const three = describePairHighlight("Camila", "Emilio", "Same generation (uranus Taurus, neptune Pisces, pluto Capricorn).");
    expect(one.badge).toBe("SAME GENERATION");
    expect(two.badge).toBe("SAME GENERATION");
    expect(three.badge).toBe("SAME GENERATION");
    expect(one.sentence).toBe(SAME_GENERATION_LEAD[1]("Camila", "Emilio", "Uranus"));
    expect(two.sentence).toBe(SAME_GENERATION_LEAD[2]("Camila", "Emilio", "Uranus and Neptune"));
    expect(three.sentence).toBe(SAME_GENERATION_LEAD[3]("Camila", "Emilio", "Uranus, Neptune, and Pluto"));
    expect(one.sentence).toContain("That one planet");
    expect(two.sentence).toContain("Those two planets");
    expect(three.sentence).toContain("Uranus, Neptune, and Pluto");
    expect(new Set([one.sentence, two.sentence, three.sentence]).size).toBe(3);
  });

  it("Same Generation same-count pairs with different planets produce different sentences", () => {
    const uranusNeptune = describePairHighlight("Camila", "Emilio", "Same generation (uranus Taurus, neptune Pisces).");
    const uranusPluto = describePairHighlight("Camila", "Emilio", "Same generation (uranus Taurus, pluto Capricorn).");
    const neptunePluto = describePairHighlight("Camila", "Emilio", "Same generation (neptune Pisces, pluto Capricorn).");
    expect(uranusNeptune.sentence).not.toBe(uranusPluto.sentence);
    expect(uranusNeptune.sentence).not.toBe(neptunePluto.sentence);
    expect(uranusPluto.sentence).not.toBe(neptunePluto.sentence);
    expect(uranusNeptune.sentence).toContain("Uranus and Neptune");
    expect(uranusNeptune.sentence).not.toContain("Pluto");
    expect(uranusPluto.sentence).toContain("Uranus and Pluto");
    expect(uranusPluto.sentence).not.toContain("Neptune");
    expect(neptunePluto.sentence).toContain("Neptune and Pluto");
    expect(neptunePluto.sentence).not.toContain("Uranus");
    const oneUranus = describePairHighlight("Camila", "Emilio", "Same generation (uranus Taurus).");
    const onePluto = describePairHighlight("Camila", "Emilio", "Same generation (pluto Capricorn).");
    expect(oneUranus.sentence).not.toBe(onePluto.sentence);
    expect(oneUranus.sentence).toContain("Uranus");
    expect(onePluto.sentence).toContain("Pluto");
  });

  it("Fault Line bands 1, 2, and 3 are structurally distinct and name the planets", () => {
    const one = describePairHighlight("Carmen", "Camila", "Fault line: uranus Taurus/Sagittarius.");
    const two = describePairHighlight("Carmen", "Camila", "Fault line: uranus Taurus/Sagittarius · neptune Pisces/Capricorn.");
    const three = describePairHighlight(
      "Carmen",
      "Camila",
      "Fault line: uranus Taurus/Sagittarius · neptune Pisces/Capricorn · pluto Capricorn/Scorpio."
    );
    expect(one.badge).toBe("FAULT LINE");
    expect(two.badge).toBe("FAULT LINE");
    expect(three.badge).toBe("FAULT LINE");
    expect(one.sentence).toBe(FAULT_LINE_PAIR_LEAD[1]("Carmen", "Camila", "Uranus", "Neptune and Pluto"));
    expect(two.sentence).toBe(FAULT_LINE_PAIR_LEAD[2]("Carmen", "Camila", "Uranus and Neptune", "Pluto"));
    expect(three.sentence).toBe(FAULT_LINE_PAIR_LEAD[3]("Carmen", "Camila", "Uranus, Neptune, and Pluto", ""));
    expect(one.sentence).toContain("That one planet");
    expect(two.sentence).toContain("Those two planets");
    expect(three.sentence).toContain("Uranus, Neptune, and Pluto");
    expect(new Set([one.sentence, two.sentence, three.sentence]).size).toBe(3);
  });

  it("Fault Line same-count pairs with different planets produce different sentences", () => {
    const uranusNeptune = describePairHighlight("Carmen", "Camila", "Fault line: uranus Taurus/Sagittarius · neptune Pisces/Capricorn.");
    const uranusPluto = describePairHighlight("Carmen", "Camila", "Fault line: uranus Taurus/Sagittarius · pluto Capricorn/Scorpio.");
    expect(uranusNeptune.sentence).not.toBe(uranusPluto.sentence);
    expect(uranusNeptune.sentence).toContain("Uranus and Neptune");
    expect(uranusNeptune.sentence).toContain("share Pluto");
    expect(uranusNeptune.sentence).not.toContain("share Neptune");
    expect(uranusPluto.sentence).toContain("Uranus and Pluto");
    expect(uranusPluto.sentence).toContain("share Neptune");
    expect(uranusPluto.sentence).not.toContain("share Pluto");
    const oneUranus = describePairHighlight("Carmen", "Camila", "Fault line: uranus Taurus/Sagittarius.");
    const onePluto = describePairHighlight("Carmen", "Camila", "Fault line: pluto Capricorn/Scorpio.");
    expect(oneUranus.sentence).not.toBe(onePluto.sentence);
    expect(oneUranus.sentence).toContain("diverge on Uranus");
    expect(oneUranus.sentence).toContain("share Neptune and Pluto");
    expect(onePluto.sentence).toContain("diverge on Pluto");
    expect(onePluto.sentence).toContain("share Uranus and Neptune");
  });

  it("keeps the chip-row detail line as planet/sign facts, not as the lead", () => {
    const result = describePairHighlight("Camila", "Emilio", "Same generation (uranus Taurus, neptune Pisces).");
    expect(result.detail).toBe("Uranus Taurus · Neptune Pisces");
    expect(result.sentence).not.toBe(result.detail);
  });
});

describe("toPlanetCountBand", () => {
  it("maps 1, 2, and 3+ onto the enumerable axis", () => {
    expect(toPlanetCountBand(1)).toBe(1);
    expect(toPlanetCountBand(2)).toBe(2);
    expect(toPlanetCountBand(3)).toBe(3);
    expect(toPlanetCountBand(4)).toBe(3);
  });
});

describe("describePartialOverlap", () => {
  const pairUranus = {
    planet: "uranus",
    sign: "Taurus",
    names: ["Camila", "Emilio"],
    totalMembers: 4,
    pairEraGapBand: "adjacent" as const,
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
    expect(pair).toContain(SHARED_SKY_TAIL.pair.uranus.adjacent);
    expect(majority).toContain(SHARED_SKY_TAIL.majority.uranus);
    expect(SHARED_SKY_TAIL.pair.uranus.adjacent).not.toBe(SHARED_SKY_TAIL.majority.uranus);
    expect(pair).not.toBe(majority);
  });

  it("each planet produces a different tail, and each planet's pair tail changes by era-gap band", () => {
    const tails = (["uranus", "neptune", "pluto"] as const).map((planet) => {
      const sentence = describePartialOverlap({
        planet,
        sign: "Pisces",
        names: ["Camila", "Emilio"],
        totalMembers: 4,
        pairEraGapBand: "mid",
      });
      expect(sentence).toContain(GEN_PLANET_MEANING[planet]);
      expect(sentence).toContain(SHARED_SKY_TAIL.pair[planet].mid);
      return SHARED_SKY_TAIL.pair[planet].mid;
    });
    expect(new Set(tails).size).toBe(3);
    for (const planet of ["uranus", "neptune", "pluto"] as const) {
      const bandTails = Object.values(SHARED_SKY_TAIL.pair[planet]);
      expect(new Set(bandTails).size).toBe(bandTails.length);
    }
    const allPairTails = (["uranus", "neptune", "pluto"] as const).flatMap((planet) =>
      Object.values(SHARED_SKY_TAIL.pair[planet])
    );
    const majorityTails = (["uranus", "neptune", "pluto"] as const).map((planet) => SHARED_SKY_TAIL.majority[planet]);
    const wholeTails = (["uranus", "neptune", "pluto"] as const).map((planet) => SHARED_SKY_TAIL.whole[planet]);
    expect(new Set([...allPairTails, ...majorityTails, ...wholeTails]).size).toBe(15);
  });

  it("Uranus pair tails now resolve by era-gap band, not by sign label alone", () => {
    const near = describePartialOverlap({
      planet: "uranus",
      sign: "Taurus",
      names: ["Camila", "Emilio"],
      totalMembers: 4,
      pairEraGapBand: "adjacent",
    });
    const far = describePartialOverlap({
      planet: "uranus",
      sign: "Aries",
      names: ["Carmen Sofia", "Gabriel"],
      totalMembers: 4,
      pairEraGapBand: "distant",
    });
    expect(near).toContain(SHARED_SKY_TAIL.pair.uranus.adjacent);
    expect(far).toContain(SHARED_SKY_TAIL.pair.uranus.distant);
    expect(SHARED_SKY_TAIL.pair.uranus.adjacent).not.toBe(SHARED_SKY_TAIL.pair.uranus.distant);
  });

  it("carries GEN_PLANET_MEANING so the line says what the planet means", () => {
    const sentence = describePartialOverlap({
      planet: "neptune",
      sign: "Pisces",
      names: ["Camila", "Emilio"],
      totalMembers: 3,
      pairEraGapBand: "adjacent",
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

  it("pair tails use computed era-gap bands (same band matches, different band diverges)", () => {
    const camilaEmilio = sharedSkyLines(
      {
        sharedSky: [],
        faultLines: [
          {
            planet: "uranus",
            groups: [
              { sign: "Taurus", names: ["Camila", "Emilio"] },
              { sign: "Aries", names: ["Carmen"] },
            ],
          },
        ],
      },
      3
    )[0]!;
    const carmenGabrielAdjacent = sharedSkyLines(
      {
        sharedSky: [],
        faultLines: [
          {
            planet: "uranus",
            groups: [
              { sign: "Aries", names: ["Carmen Sofia", "Gabriel"] },
              { sign: "Taurus", names: ["Lucia"] },
            ],
          },
        ],
      },
      3
    )[0]!;
    const carmenGabrielDistant = sharedSkyLines(
      {
        sharedSky: [],
        faultLines: [
          {
            planet: "uranus",
            groups: [
              { sign: "Aries", names: ["Carmen Sofia", "Gabriel"] },
              { sign: "Libra", names: ["Lucia"] },
            ],
          },
        ],
      },
      3
    )[0]!;

    expect(camilaEmilio.tail).toContain(SHARED_SKY_TAIL.pair.uranus.adjacent);
    expect(carmenGabrielAdjacent.tail).toContain(SHARED_SKY_TAIL.pair.uranus.adjacent);
    expect(camilaEmilio.tail).toBe(carmenGabrielAdjacent.tail);
    expect(carmenGabrielDistant.tail).toContain(SHARED_SKY_TAIL.pair.uranus.distant);
    expect(camilaEmilio.tail).not.toBe(carmenGabrielDistant.tail);
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
      describePairHighlight("Camila", "Emilio", "Same generation (uranus Taurus).").sentence,
      describePairHighlight("Camila", "Emilio", "Same generation (uranus Taurus, neptune Pisces).").sentence,
      describePairHighlight("Carmen", "Camila", "Fault line: uranus Taurus/Sagittarius.").sentence,
      faultLinesInterpretation([
        { planet: "pluto", groups: [{ sign: "Capricorn", names: ["Camila", "Emilio"] }, { sign: "Scorpio", names: ["Carmen"] }] },
      ]),
      faultLinesInterpretation([
        { planet: "uranus", groups: [{ sign: "Taurus", names: ["Camila"] }, { sign: "Aquarius", names: ["Emilio"] }, { sign: "Leo", names: ["Carmen"] }] },
        { planet: "pluto", groups: [{ sign: "Capricorn", names: ["Camila", "Carmen"] }, { sign: "Scorpio", names: ["Emilio"] }] },
      ]),
    ];
    for (const sample of samples) {
      expect(sample).not.toContain("\u2014");
    }
  });
});
