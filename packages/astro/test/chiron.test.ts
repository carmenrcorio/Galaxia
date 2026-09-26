import { describe, expect, it } from "vitest";
import {
  BODY_DOMAIN,
  bodyDisplayName,
  chironLongitude,
  computeNatalChart,
  computeSynastry,
  computeTransits,
  interpretAspect,
  interpretPlacement,
  isChartPoint,
  julianDayUTC,
  type BodyName
} from "../src/index";

const lonDiff = (a: number, b: number): number => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

const LITTLE_ROCK = {
  dateUTC: "1987-12-30T04:30:00.000Z",
  precision: "exact" as const,
  lat: 34.7465,
  lng: -92.2896,
  tzOffsetMin: -360,
  houseSystem: "placidus" as const
};

describe("Chiron natal placement", () => {
  it("appends Chiron after North Node on date and exact charts", () => {
    const exact = computeNatalChart(LITTLE_ROCK);
    expect(exact.placements.map((p) => p.body)).toEqual([
      "sun", "moon", "mercury", "venus", "mars",
      "jupiter", "saturn", "uranus", "neptune", "pluto", "north_node", "chiron"
    ]);

    const dateOnly = computeNatalChart({
      dateUTC: "1987-12-30T00:00:00.000Z",
      precision: "date"
    });
    expect(dateOnly.placements.some((p) => p.body === "chiron")).toBe(true);
    expect(dateOnly.placements.find((p) => p.body === "chiron")?.house).toBeUndefined();
  });

  it("includes Chiron on year-only charts (sign, no house)", () => {
    const year = computeNatalChart({
      dateUTC: "1987-01-01T00:00:00.000Z",
      precision: "year"
    });
    const chiron = year.placements.find((p) => p.body === "chiron");
    expect(chiron).toBeDefined();
    expect(chiron!.house).toBeUndefined();
    expect(chiron!.sign).toBe("Gemini");
  });

  it("labels the point Chiron and treats it as a chart point", () => {
    expect(bodyDisplayName("chiron")).toBe("Chiron");
    expect(isChartPoint("chiron")).toBe(true);
    expect(isChartPoint("pluto")).toBe(false);
  });

  /**
   * EXTERNAL GROUND TRUTH
   * Cafe Astrology Chiron sign tables
   * (https://cafeastrology.com/chironsignstables.html):
   * "Apr 10, 1984 Chiron enters Gemini" through
   * "June 21, 1988 5:40 AM Chiron enters Cancer".
   * Little Rock 1987-12-29 22:30 CST is inside that Gemini span.
   *
   * Degree: JPL Horizons ObsEcLon (ecliptic of date) at
   * 1987-12-30 04:30 UT is 85.26° = 25° Gemini. Astro-Seek's
   * December 1987 midnight ephemeris lists 25°19' on the Chiron column
   * for Dec 29.
   */
  it("Little Rock Chiron is Gemini, retrograde, with a house when time is known", () => {
    const chart = computeNatalChart(LITTLE_ROCK);
    const chiron = chart.placements.find((p) => p.body === "chiron");
    expect(chiron).toBeDefined();
    expect(chiron!.sign).toBe("Gemini");
    expect(chiron!.degree).toBeGreaterThan(24);
    expect(chiron!.degree).toBeLessThan(27);
    expect(chiron!.house).toBeDefined();
    expect(chiron!.house).toBeGreaterThanOrEqual(1);
    expect(chiron!.house).toBeLessThanOrEqual(12);
    expect(chiron!.retro).toBe(true);
    expect(lonDiff(chiron!.lon, 85.26)).toBeLessThan(0.15);
  });

  it("does not change planetary or Node longitudes on the Little Rock chart", () => {
    const chart = computeNatalChart(LITTLE_ROCK);
    const lon = (body: BodyName) => chart.placements.find((p) => p.body === body)!.lon;
    // Locked from the same engine pass as the Cafe Astrology planet check.
    // Chiron is table-lookup only; these must stay byte-identical.
    expect(lon("sun")).toBeCloseTo(277.9281367968497, 10);
    expect(lon("moon")).toBeCloseTo(41.891764011738616, 10);
    expect(lon("mercury")).toBeCloseTo(281.91405755300934, 10);
    expect(lon("venus")).toBeCloseTo(309.77662657903784, 10);
    expect(lon("mars")).toBeCloseTo(233.72370796469932, 10);
    expect(lon("jupiter")).toBeCloseTo(20.13867075667774, 10);
    expect(lon("saturn")).toBeCloseTo(265.25511437349473, 10);
    expect(lon("uranus")).toBeCloseTo(267.55274626583, 10);
    expect(lon("neptune")).toBeCloseTo(277.71571603334246, 10);
    expect(lon("pluto")).toBeCloseTo(221.95214184612976, 10);
    expect(lon("north_node")).toBeCloseTo(356.9537530426238, 10);
    expect(chart.placements.filter((p) => !isChartPoint(p.body))).toHaveLength(10);
  });

  it("omits Chiron outside the 1900-2100 table instead of guessing", () => {
    const early = computeNatalChart({
      dateUTC: "1890-06-01T12:00:00.000Z",
      precision: "date"
    });
    expect(early.placements.some((p) => p.body === "chiron")).toBe(false);
    expect(() => chironLongitude(julianDayUTC(new Date("1890-06-01T12:00:00.000Z")))).toThrow(/outside that range/);
  });
});

describe("Chiron synastry and transits", () => {
  it("includes Chiron in synastry aspects and house overlays", () => {
    const a = computeNatalChart(LITTLE_ROCK);
    const b = computeNatalChart({
      dateUTC: "1994-11-20T09:15:00.000Z",
      precision: "exact",
      lat: 34.0522,
      lng: -118.2437
    });
    const synastry = computeSynastry(a, b);
    expect(synastry.houseOverlays.aInB.some((row) => row.body === "chiron")).toBe(true);
    expect(synastry.houseOverlays.bInA.some((row) => row.body === "chiron")).toBe(true);
    const chironAspects = synastry.aspects.filter(
      (hit) => hit.from === "chiron" || hit.to === "chiron"
    );
    expect(chironAspects.length).toBeGreaterThan(0);
  });

  it("does not add Chiron to transit hits", () => {
    const natal = computeNatalChart({
      dateUTC: "1987-12-30T04:30:00.000Z",
      precision: "date"
    });
    const hits = computeTransits(natal, "2026-06-29T12:00:00.000Z");
    expect(hits.some((h) => h.transitBody === "chiron" || h.natalBody === "chiron")).toBe(false);
  });

  it("excludes Chiron from element-balance counts", () => {
    const a = computeNatalChart({ dateUTC: "1993-04-10T12:00:00.000Z", precision: "date" });
    const b = computeNatalChart({ dateUTC: "1994-11-20T12:00:00.000Z", precision: "date" });
    const synastry = computeSynastry(a, b);
    const sum = (side: { fire: number; earth: number; air: number; water: number }) =>
      side.fire + side.earth + side.air + side.water;
    expect(sum(synastry.elementBalance.a)).toBe(10);
    expect(sum(synastry.elementBalance.b)).toBe(10);
  });
});

describe("Chiron card copy", () => {
  it("authors a domain line and no fabricated sign readings", () => {
    const reading = interpretPlacement("chiron", "Gemini", { minorSafe: false });
    expect(BODY_DOMAIN.chiron).toBe("Where healing and vulnerability meet");
    expect(BODY_DOMAIN.chiron).not.toContain("\u2014");
    expect(reading.short).toBe("");
    expect(reading.long).toBe("");
    expect(reading.short).not.toContain("\u2014");
    expect(reading.long).not.toContain("\u2014");
    expect(interpretAspect("chiron", "sun", "conjunction")).toBeNull();
    expect(interpretAspect("moon", "chiron", "trine")).toBeNull();
  });
});
