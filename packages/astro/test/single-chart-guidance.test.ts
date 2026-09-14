/**
 * singleChartNeed() — the first-run orientation statement.
 *
 * These tests run real charts through `computeNatalChart` rather than hand-built
 * fixtures, because the property under test is "the statement matches what the
 * engine actually computed at this precision". A fixture would let the selector
 * and the assertion agree with each other while both disagreed with the engine,
 * which is the self-consistency trap ENGINEERING.md §8 names by name.
 */
import { describe, expect, it } from "vitest";
import {
  computeNatalChart,
  interpretPlacement,
  singleChartNeed,
  type Birth,
  type NatalChart,
} from "../src/index";

/** 1990-07-16, 14:30 local in Rome. Exact precision, so every sign is settled. */
const EXACT: Birth = {
  dateUTC: "1990-07-16T12:30:00.000Z",
  precision: "exact",
  lat: 41.9028,
  lng: 12.4964,
  tzOffsetMin: 120,
};

const DATE_ONLY: Birth = { dateUTC: "1990-07-16T00:00:00.000Z", precision: "date" };
const YEAR_ONLY: Birth = { dateUTC: "1990-01-01T00:00:00.000Z", precision: "year" };

const OPTS = { name: "Maya", minorSafe: false };

function placement(chart: NatalChart, body: string) {
  return chart.placements.find((p) => p.body === body) ?? null;
}

describe("singleChartNeed — the statement is the engine's own data", () => {
  it("reads the Moon at exact precision, verbatim from the curated library", () => {
    const chart = computeNatalChart(EXACT);
    const moon = placement(chart, "moon");
    expect(moon?.confident).toBe(true);

    const need = singleChartNeed(chart, OPTS);
    expect(need).not.toBeNull();
    expect(need?.body).toBe("moon");
    expect(need?.sign).toBe(moon?.sign);
    expect(need?.generational).toBe(false);
    expect(need?.precision).toBe("exact");
    expect(need?.domain).toBe("Emotional needs");
    expect(need?.lead).toBe(`Maya's ${moon?.sign} Moon`);
    // Verbatim: the statement is library copy, never composed prose.
    expect(need?.statement).toBe(
      interpretPlacement("moon", moon!.sign as never, { minorSafe: false }).long
    );
  });

  it("never speaks from a placement the engine flagged as uncertain", () => {
    for (const birth of [EXACT, DATE_ONLY, YEAR_ONLY]) {
      const chart = computeNatalChart(birth);
      const need = singleChartNeed(chart, OPTS);
      if (!need) continue;
      const source = placement(chart, need.body);
      expect(source, `${need.body} must exist on a ${birth.precision} chart`).not.toBeNull();
      expect(source?.confident, `${need.body} was not confident at ${birth.precision}`).toBe(true);
      expect(source?.possibleSigns).toBeUndefined();
      expect(need.sign).toBe(source?.sign);
    }
  });

  it("falls to the Sun when the Moon is ambiguous, never to a guessed Moon", () => {
    // Scan a year of date-only births for a day the Moon changes sign. Those
    // days genuinely exist (the Moon changes sign every ~2.5 days), so this
    // finds a real ambiguity rather than constructing one.
    let ambiguous: NatalChart | null = null;
    for (let day = 0; day < 40 && !ambiguous; day += 1) {
      const d = new Date(Date.UTC(1990, 0, 1 + day));
      const chart = computeNatalChart({ dateUTC: d.toISOString(), precision: "date" });
      if (placement(chart, "moon")?.confident === false) ambiguous = chart;
    }
    expect(ambiguous, "expected at least one Moon-cusp day in 40 days").not.toBeNull();

    const need = singleChartNeed(ambiguous!, OPTS);
    expect(need?.body).not.toBe("moon");
    expect(need?.body).toBe("sun");
    expect(need?.sign).toBe(placement(ambiguous!, "sun")?.sign);
  });

  it("year-only births speak from a generational planet, flagged as generational", () => {
    const chart = computeNatalChart(YEAR_ONLY);
    // The engine computes only sun + the three outer planets at year precision,
    // and a year-only Sun can be any of the twelve signs, so it is never
    // confident. Anything the statement says must therefore be generational.
    expect(placement(chart, "moon")).toBeNull();
    expect(placement(chart, "sun")?.confident).toBe(false);

    const need = singleChartNeed(chart, OPTS);
    expect(need).not.toBeNull();
    expect(need?.generational).toBe(true);
    expect(["pluto", "neptune", "uranus"]).toContain(need?.body);
    expect(need?.precision).toBe("year");
  });

  it("returns null rather than inventing a line when there is no chart", () => {
    expect(singleChartNeed(null, OPTS)).toBeNull();
    expect(singleChartNeed(undefined, OPTS)).toBeNull();
  });

  it("returns null when no placement is confident", () => {
    const chart = computeNatalChart(YEAR_ONLY);
    const allUncertain: NatalChart = {
      ...chart,
      placements: chart.placements.map((p) => ({ ...p, confident: false, possibleSigns: ["Aries", "Taurus"] })),
    };
    expect(singleChartNeed(allUncertain, OPTS)).toBeNull();
  });

  it("requires a real name and never substitutes one", () => {
    const chart = computeNatalChart(EXACT);
    expect(singleChartNeed(chart, { name: "   ", minorSafe: false })).toBeNull();
    expect(singleChartNeed(chart, { name: "", minorSafe: false })).toBeNull();
  });
});

describe("singleChartNeed — minor safety", () => {
  it("never speaks from Venus or Mars, on any precision", () => {
    for (const birth of [EXACT, DATE_ONLY, YEAR_ONLY]) {
      const need = singleChartNeed(computeNatalChart(birth), { name: "Sam", minorSafe: true });
      expect(need?.body).not.toBe("venus");
      expect(need?.body).not.toBe("mars");
    }
  });

  it("produces identical copy with and without minorSafe, because no gated body is reachable", () => {
    const chart = computeNatalChart(EXACT);
    const open = singleChartNeed(chart, { name: "Sam", minorSafe: false });
    const safe = singleChartNeed(chart, { name: "Sam", minorSafe: true });
    expect(safe?.statement).toBe(open?.statement);
    expect(safe?.domain).toBe(open?.domain);
  });

  it("carries no romantic or attraction register in any statement it can produce", () => {
    // Every sign the ladder can land on, across the whole zodiac, for each body.
    const banned = /\b(romantic|romance|attraction|attracted|lover|seduc|sexual|dating|flirt)\b/i;
    for (let day = 0; day < 366; day += 7) {
      const d = new Date(Date.UTC(1988, 0, 1 + day));
      const need = singleChartNeed(
        computeNatalChart({ dateUTC: d.toISOString(), precision: "date" }),
        { name: "Sam", minorSafe: true }
      );
      if (!need) continue;
      expect(need.statement, `${need.body} in ${need.sign}`).not.toMatch(banned);
    }
  });
});
