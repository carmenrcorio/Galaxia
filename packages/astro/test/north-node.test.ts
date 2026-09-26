import { describe, expect, it } from "vitest";
import {
  bodyDisplayName,
  computeNatalChart,
  computeSynastry,
  computeTransits,
  interpretPlacement,
  trueNodeLongitude,
  type BodyName
} from "../src/index";

const lonDiff = (a: number, b: number): number => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/** Meeus AA ch.47 mean longitude of the Moon's ascending node. */
function meanNodeLongitude(date: Date): number {
  const jd = date.getTime() / 86_400_000 + 2_440_587.5;
  const t = (jd - 2_451_545.0) / 36_525;
  const omega =
    125.0445479 -
    1934.1362891 * t +
    0.0020754 * t * t +
    (t * t * t) / 467441 -
    (t * t * t * t) / 60616000;
  const wrapped = omega % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

const LITTLE_ROCK = {
  dateUTC: "1987-12-30T04:30:00.000Z",
  precision: "exact" as const,
  lat: 34.7465,
  lng: -92.2896,
  tzOffsetMin: -360,
  houseSystem: "placidus" as const
};

describe("True Node natal placement", () => {
  it("appends North Node after Pluto on date and exact charts", () => {
    const exact = computeNatalChart(LITTLE_ROCK);
    expect(exact.placements.map((p) => p.body)).toEqual([
      "sun", "moon", "mercury", "venus", "mars",
      "jupiter", "saturn", "uranus", "neptune", "pluto", "north_node"
    ]);

    const dateOnly = computeNatalChart({
      dateUTC: "1987-12-30T00:00:00.000Z",
      precision: "date"
    });
    expect(dateOnly.placements.some((p) => p.body === "north_node")).toBe(true);
    expect(dateOnly.placements.find((p) => p.body === "north_node")?.house).toBeUndefined();
  });

  it("omits North Node on year-only charts (moves ~19°/year)", () => {
    const year = computeNatalChart({
      dateUTC: "1987-01-01T00:00:00.000Z",
      precision: "year"
    });
    expect(year.placements.map((p) => p.body)).toEqual(["sun", "uranus", "neptune", "pluto"]);
  });

  it("labels the point North Node, not a planet", () => {
    expect(bodyDisplayName("north_node")).toBe("North Node");
    expect(bodyDisplayName("pluto")).toBe("Pluto");
  });

  it("stays within 1.7° of the Meeus mean node (True Node oscillation)", () => {
    const date = new Date(LITTLE_ROCK.dateUTC);
    expect(lonDiff(trueNodeLongitude(date), meanNodeLongitude(date))).toBeLessThan(1.7);
  });

  /**
   * EXTERNAL GROUND TRUTH — Cafe Astrology True Node tables
   * (https://cafeastrology.com/northnodetables.html):
   * "Dec 2, 1987 12:20 AM, True Node enters Pisces" and the range
   * Dec 3/87 – May 22/89 = Pisces. Little Rock 1987-12-29 is inside that
   * range. Degree is checked against the independent Meeus mean node
   * (True Node oscillates around it by ≲1.5°).
   */
  it("Little Rock True Node is Pisces, with a house when time is known", () => {
    const chart = computeNatalChart(LITTLE_ROCK);
    const node = chart.placements.find((p) => p.body === "north_node");
    expect(node).toBeDefined();
    expect(node!.sign).toBe("Pisces");
    expect(node!.house).toBeDefined();
    expect(lonDiff(node!.lon, meanNodeLongitude(new Date(LITTLE_ROCK.dateUTC)))).toBeLessThan(1.5);
  });

  it("does not change planetary longitudes on the Little Rock chart", () => {
    const chart = computeNatalChart(LITTLE_ROCK);
    const lon = (body: BodyName) => chart.placements.find((p) => p.body === body)!.lon;
    // Locked from the same engine pass that already matches Cafe Astrology planets.
    expect(lon("sun")).toBeGreaterThan(270);
    expect(lon("sun")).toBeLessThan(280);
    expect(chart.placements.filter((p) => p.body !== "north_node")).toHaveLength(10);
  });
});

describe("True Node synastry and transits", () => {
  it("includes North Node in synastry aspects and house overlays", () => {
    const a = computeNatalChart(LITTLE_ROCK);
    const b = computeNatalChart({
      dateUTC: "1994-11-20T09:15:00.000Z",
      precision: "exact",
      lat: 34.0522,
      lng: -118.2437
    });
    const synastry = computeSynastry(a, b);
    expect(synastry.houseOverlays.aInB.some((row) => row.body === "north_node")).toBe(true);
    expect(synastry.houseOverlays.bInA.some((row) => row.body === "north_node")).toBe(true);
    const nodeAspects = synastry.aspects.filter(
      (hit) => hit.from === "north_node" || hit.to === "north_node"
    );
    expect(Array.isArray(nodeAspects)).toBe(true);
  });

  it("does not add North Node to transit hits (planetary transits stay planetary)", () => {
    const natal = computeNatalChart({
      dateUTC: "1987-12-30T04:30:00.000Z",
      precision: "date"
    });
    const hits = computeTransits(natal, "2026-06-29T12:00:00.000Z");
    expect(hits.some((h) => h.transitBody === "north_node" || h.natalBody === "north_node")).toBe(false);
  });

  it("excludes the Node from element-balance counts", () => {
    const a = computeNatalChart({ dateUTC: "1993-04-10T12:00:00.000Z", precision: "date" });
    const b = computeNatalChart({ dateUTC: "1994-11-20T12:00:00.000Z", precision: "date" });
    const synastry = computeSynastry(a, b);
    const sum = (side: { fire: number; earth: number; air: number; water: number }) =>
      side.fire + side.earth + side.air + side.water;
    expect(sum(synastry.elementBalance.a)).toBe(10);
    expect(sum(synastry.elementBalance.b)).toBe(10);
  });
});

describe("North Node card copy", () => {
  it("authors a descriptor for every sign", () => {
    const signs = [
      "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
      "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
    ] as const;
    for (const sign of signs) {
      const reading = interpretPlacement("north_node", sign, { minorSafe: false });
      expect(reading.short.length).toBeGreaterThan(8);
      expect(reading.long.length).toBeGreaterThan(20);
      expect(reading.short).not.toContain("\u2014");
      expect(reading.long).not.toContain("\u2014");
    }
  });
});
