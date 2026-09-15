import { describe, expect, it } from "vitest";
import {
  ASPECTS_UNAVAILABLE_YEAR_BODY,
  CHART_PRECISION_ADD_CITY,
  CHART_PRECISION_ADD_DATA,
  CHART_PRECISION_ADD_DATE,
  CHART_PRECISION_ADD_TIME,
  CHART_PRECISION_DATE_UNLOCKS,
  CHART_PRECISION_EXACT_UNLOCKS,
  CHART_PRECISION_FACT,
  CHART_PRECISION_LADDER_INTRO,
  CHART_PRECISION_NONE_FACT,
  CHART_PRECISION_NONE_UNLOCKS,
  CHART_PRECISION_NONE_WAITING,
  CHART_SAVED_DETAILS_NO_CHART_BODY,
  CHART_PRECISION_TIERS,
  CHART_PRECISION_YEAR_UNLOCKS,
  CHART_PRECISIONS,
  chartPrecisionExplanation,
  chartPrecisionFact,
  chartPrecisionSupportsFeature,
  chartPrecisionUpgrade,
  knownBirthMonthDay,
  knownBirthYear,
  type ChartPrecisionFeature,
} from "../src/chart-precision";

describe("chart precision tiers", () => {
  it("names the four stored tiers: exact time, date only, year only, none", () => {
    expect([...CHART_PRECISIONS]).toEqual(["exact", "date", "year", "none"]);
    expect(CHART_PRECISION_FACT.exact).toBe("Exact time");
    expect(CHART_PRECISION_FACT.date).toBe("Date only");
    expect(CHART_PRECISION_FACT.year).toBe("Year only");
    expect(CHART_PRECISION_FACT.none).toBe("No birth data yet");
  });

  it("reuses the add-person ladder unlocks, and never calls a lower tier a non-chart", () => {
    expect(CHART_PRECISION_TIERS.map((t) => t.key)).toEqual(["exact", "date", "year"]);
    expect(CHART_PRECISION_TIERS[0]?.unlocks).toBe(CHART_PRECISION_EXACT_UNLOCKS);
    expect(CHART_PRECISION_TIERS[1]?.unlocks).toBe(CHART_PRECISION_DATE_UNLOCKS);
    expect(CHART_PRECISION_TIERS[2]?.unlocks).toBe(CHART_PRECISION_YEAR_UNLOCKS);
    expect(CHART_PRECISION_LADDER_INTRO).toMatch(/real chart/);
    expect(CHART_PRECISION_LADDER_INTRO).not.toMatch(/not a real/);
    expect(CHART_PRECISION_NONE_UNLOCKS).toMatch(/year, date, or exact time/);
    expect(CHART_PRECISION_NONE_UNLOCKS).toMatch(/send them a link from this screen/);
  });
});

describe("chartPrecisionSupportsFeature — what degrades at each tier", () => {
  const features: ChartPrecisionFeature[] = [
    "houses",
    "ascendant",
    "preciseMoon",
    "aspects",
    "planetarySigns",
    "generational",
    "dailySky",
    "synastry",
    "memorialTimeline",
    "memorialTransitsDated",
  ];

  it("exact time with a city supports the full natal surface", () => {
    for (const feature of features) {
      expect(chartPrecisionSupportsFeature(feature, "exact", { hasBirthPlace: true })).toBe(true);
    }
  });

  it("exact time without a city still has signs and aspects, not houses or rising", () => {
    expect(chartPrecisionSupportsFeature("houses", "exact", { hasBirthPlace: false })).toBe(false);
    expect(chartPrecisionSupportsFeature("ascendant", "exact")).toBe(false);
    expect(chartPrecisionSupportsFeature("preciseMoon", "exact")).toBe(false);
    expect(chartPrecisionSupportsFeature("aspects", "exact")).toBe(true);
    expect(chartPrecisionSupportsFeature("planetarySigns", "exact")).toBe(true);
    expect(chartPrecisionSupportsFeature("dailySky", "exact")).toBe(true);
    expect(chartPrecisionSupportsFeature("generational", "exact")).toBe(true);
  });

  it("date only has signs, aspects, daily sky, and dated memorial transits; not houses or rising", () => {
    expect(chartPrecisionSupportsFeature("houses", "date")).toBe(false);
    expect(chartPrecisionSupportsFeature("ascendant", "date")).toBe(false);
    expect(chartPrecisionSupportsFeature("preciseMoon", "date")).toBe(false);
    expect(chartPrecisionSupportsFeature("aspects", "date")).toBe(true);
    expect(chartPrecisionSupportsFeature("planetarySigns", "date")).toBe(true);
    expect(chartPrecisionSupportsFeature("dailySky", "date")).toBe(true);
    expect(chartPrecisionSupportsFeature("synastry", "date")).toBe(true);
    expect(chartPrecisionSupportsFeature("generational", "date")).toBe(true);
    expect(chartPrecisionSupportsFeature("memorialTransitsDated", "date")).toBe(true);
  });

  it("year only keeps the generational layer and the memorial timeline gate; everything personal is off", () => {
    expect(chartPrecisionSupportsFeature("generational", "year")).toBe(true);
    expect(chartPrecisionSupportsFeature("memorialTimeline", "year")).toBe(true);
    expect(chartPrecisionSupportsFeature("houses", "year")).toBe(false);
    expect(chartPrecisionSupportsFeature("ascendant", "year")).toBe(false);
    expect(chartPrecisionSupportsFeature("aspects", "year")).toBe(false);
    expect(chartPrecisionSupportsFeature("planetarySigns", "year")).toBe(false);
    expect(chartPrecisionSupportsFeature("dailySky", "year")).toBe(false);
    expect(chartPrecisionSupportsFeature("synastry", "year")).toBe(false);
    expect(chartPrecisionSupportsFeature("memorialTransitsDated", "year")).toBe(false);
  });

  it("none has no chart surfaces; the memorial timeline still qualifies as a remembrance gate", () => {
    expect(chartPrecisionSupportsFeature("generational", "none")).toBe(false);
    expect(chartPrecisionSupportsFeature("aspects", "none")).toBe(false);
    expect(chartPrecisionSupportsFeature("dailySky", "none")).toBe(false);
    expect(chartPrecisionSupportsFeature("memorialTimeline", "none")).toBe(true);
  });
});

describe("chartPrecisionExplanation", () => {
  it("states supports / does not / why as facts, reusing ladder unlocks", () => {
    const date = chartPrecisionExplanation("date");
    expect(date.label).toBe("Date only");
    expect(date.supports).toBe(CHART_PRECISION_DATE_UNLOCKS);
    expect(date.doesNot).toMatch(/Houses/);
    expect(date.why).toMatch(/date places the planets/);

    const year = chartPrecisionExplanation("year");
    expect(year.supports).toBe(CHART_PRECISION_YEAR_UNLOCKS);
    expect(year.doesNot).toMatch(/wait on a birth date/);
    expect(year.why).not.toMatch(/not a real chart/);

    const none = chartPrecisionExplanation("none");
    expect(none.label).toBe(CHART_PRECISION_NONE_FACT);
    expect(none.supports).toMatch(/place is real/);
    expect(none.doesNot).toMatch(/chart is waiting/);
  });

  it("does not treat exact-without-city as a complete exact chart", () => {
    const missingCity = chartPrecisionExplanation("exact", { hasBirthPlace: false });
    expect(missingCity.doesNot).toMatch(/birth city/);
    const complete = chartPrecisionExplanation("exact", { hasBirthPlace: true });
    expect(complete.supports).toBe(CHART_PRECISION_EXACT_UNLOCKS);
  });
});

describe("chartPrecisionUpgrade — one step, never a nag matrix", () => {
  it("offers one next rung, prefillable, and nothing when exact+city is already on file", () => {
    expect(chartPrecisionUpgrade("none")).toEqual({ target: "date", actionLabel: CHART_PRECISION_ADD_DATA });
    expect(chartPrecisionUpgrade("year")).toEqual({ target: "date", actionLabel: CHART_PRECISION_ADD_DATE });
    expect(chartPrecisionUpgrade("date")).toEqual({ target: "exact", actionLabel: CHART_PRECISION_ADD_TIME });
    expect(chartPrecisionUpgrade("exact", { hasBirthPlace: false })).toEqual({
      target: "exact",
      actionLabel: CHART_PRECISION_ADD_CITY,
    });
    expect(chartPrecisionUpgrade("exact", { hasBirthPlace: true })).toBeNull();
  });

  it("does not skip from year to exact", () => {
    expect(chartPrecisionUpgrade("year")?.target).toBe("date");
  });
});

describe("known birth fields — year-only January 1 is not a birthday", () => {
  it("keeps the year and drops month/day for year-only stored dates", () => {
    expect(knownBirthYear("year", "1952-01-01")).toBe(1952);
    expect(knownBirthMonthDay("year", "1952-01-01")).toBeNull();
    expect(knownBirthMonthDay("none", "1952-01-01")).toBeNull();
  });

  it("keeps month and day only when precision is date or exact", () => {
    expect(knownBirthMonthDay("date", "1990-07-16")).toEqual({ month: 7, day: 16 });
    expect(knownBirthMonthDay("exact", "1987-12-29")).toEqual({ month: 12, day: 29 });
    expect(knownBirthYear("date", "1990-07-16")).toBe(1990);
  });
});

describe("chartPrecisionFact", () => {
  it("falls back to no-birth-data for unknown values", () => {
    expect(chartPrecisionFact("date")).toBe("Date only");
    expect(chartPrecisionFact(null)).toBe("No birth data yet");
    expect(chartPrecisionFact("mystery")).toBe("No birth data yet");
  });
});

describe("in-place unavailable copy", () => {
  it("names a birth date for year-only aspects and does not call the chart incomplete", () => {
    expect(ASPECTS_UNAVAILABLE_YEAR_BODY).toMatch(/birth date/);
    expect(ASPECTS_UNAVAILABLE_YEAR_BODY).toMatch(/Nothing is missing from the reading/);
  });

  it("does not call a missing charts row missing birth data", () => {
    expect(CHART_SAVED_DETAILS_NO_CHART_BODY).toMatch(/already saved/);
    expect(CHART_SAVED_DETAILS_NO_CHART_BODY).not.toMatch(/No birth data/);
    expect(CHART_PRECISION_NONE_WAITING).toMatch(/No birth data yet/);
  });
});
