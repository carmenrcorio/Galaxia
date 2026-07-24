/**
 * ChartWheel visibility + main biwheel API (#88) composition.
 * No React Testing Library — renderToStaticMarkup is enough for SVG structure.
 */
import { computeNatalChart, computeSynastry, type NatalChart } from "@galaxia/astro";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  ChartWheel,
  OVERLAY_ASPECTS_MISSING_NOTE,
  orientSynastryWheel,
  type WheelAspect,
} from "../components/chart-wheel";

const EXACT_A = {
  dateUTC: "1990-05-04T14:20:00.000Z",
  precision: "exact" as const,
  lat: 41.8781,
  lng: -87.6298,
  tzOffsetMin: -300,
};
const EXACT_B = {
  dateUTC: "1988-07-22T16:00:00.000Z",
  precision: "exact" as const,
  lat: 37.7749,
  lng: -122.4194,
  tzOffsetMin: -420,
};

/** Mirrors person page natalAspects (orb-sorted, slice 14, no orb < 5 cut). */
function personPageNatalAspects(chart: NatalChart): WheelAspect[] {
  if (!chart || chart.precision === "year") return [];
  const dedupe = new Set<string>();
  return computeSynastry(chart, chart).aspects
    .filter((a) => a.from !== a.to)
    .filter((a) => {
      const key = [a.from, a.to].sort().join(":") + ":" + a.type;
      if (dedupe.has(key)) return false;
      dedupe.add(key);
      return true;
    })
    .sort((a, b) => a.orb - b.orb)
    .slice(0, 14);
}

describe("ChartWheel aspects prop (natal)", () => {
  it("person-page list and historical wheel filter disagreed before the shared prop", () => {
    const chart = computeNatalChart(EXACT_A);
    const page = personPageNatalAspects(chart);
    const engine = computeSynastry(chart, chart).aspects
      .filter((a) => a.from !== a.to)
      .filter((a, idx, arr) => arr.findIndex((b) => [b.from, b.to].sort().join() === [a.from, a.to].sort().join() && b.type === a.type) === idx)
      .filter((a) => a.orb < 5)
      .slice(0, 12);
    const pageKeys = new Set(page.map((a) => [a.from, a.to].sort().join(":") + ":" + a.type));
    const wheelKeys = new Set(engine.map((a) => [a.from, a.to].sort().join(":") + ":" + a.type));
    expect(page.length).toBe(14);
    expect(engine.length).toBe(12);
    expect([...pageKeys].filter((k) => !wheelKeys.has(k)).length).toBeGreaterThan(0);
  });

  it("passing aspects renders exactly those lines (no internal recompute)", () => {
    const chart = computeNatalChart(EXACT_A);
    const only: WheelAspect[] = [
      { from: "sun", to: "moon", type: "square", orb: 1.1, harmony: -1 },
    ];
    const html = renderToStaticMarkup(createElement(ChartWheel, { chart, aspects: only, interactive: false }));
    expect(html).toContain('data-asp="sun-moon"');
    expect((html.match(/data-asp="/g) ?? []).length).toBe(1);
    expect(html).toContain('stroke="var(--rose)"');
  });
});

describe("ChartWheel biwheel (main API)", () => {
  it("renders overlay planets with a-/b- keys and lines from A ring to B ring", () => {
    const inner = computeNatalChart(EXACT_A);
    const outer = computeNatalChart(EXACT_B);
    const aspects = computeSynastry(inner, outer).aspects;

    const html = renderToStaticMarkup(
      createElement(ChartWheel, {
        chart: inner,
        overlayChart: outer,
        aspects,
        interactive: false,
      })
    );

    expect(html).toContain('data-planet="a-sun"');
    expect(html).toContain('data-planet="b-sun"');
    expect(html).toContain('data-planet="b-moon"');
    expect(html).not.toContain("inner-");
    expect(html).not.toContain("outer-");

    const houseLabels = html.match(/fill="var\(--mist2\)"[^>]*>\d+<\/text>/g) ?? [];
    expect(houseLabels.length).toBe(12);
    expect(html).toMatch(/data-asp="/);
  });

  it("overlay without aspects is loud — note + console.warn", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const inner = computeNatalChart(EXACT_A);
    const outer = computeNatalChart(EXACT_B);
    const html = renderToStaticMarkup(
      createElement(ChartWheel, { chart: inner, overlayChart: outer, interactive: false })
    );
    expect(html).toContain(OVERLAY_ASPECTS_MISSING_NOTE);
    expect(html).toContain("data-overlay-aspects-missing");
    expect(html).not.toContain("data-asp=");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("overlayChart was mounted without aspects"));
    warn.mockRestore();
  });

  it("orientSynastryWheel still exports and flips when B is self", () => {
    const chartA = computeNatalChart(EXACT_A);
    const chartB = computeNatalChart(EXACT_B);
    const aspects: WheelAspect[] = [{ from: "sun", to: "moon", type: "square", orb: 0.5, harmony: -1 }];
    const oriented = orientSynastryWheel(
      { relation: "parent" },
      { relation: "self" },
      chartA,
      chartB,
      aspects
    );
    expect(oriented.chart).toBe(chartB);
    expect(oriented.overlayChart).toBe(chartA);
    expect(oriented.aspects[0]?.from).toBe("moon");
  });
});

describe("ChartWheel year precision empty center", () => {
  it("shows the honest birth-date note instead of a silent void", () => {
    const chart = computeNatalChart({ dateUTC: "1995-01-01T00:00:00.000Z", precision: "year" });
    const html = renderToStaticMarkup(createElement(ChartWheel, { chart, interactive: false }));
    expect(html).toContain("Aspect lines need a birth date");
    expect(html).not.toContain("data-asp=");
  });
});

describe("ChartWheel PDF / non-interactive", () => {
  it("uses CSS vars (print path) and cream planet glyphs; no pointer cursor", () => {
    const chart = computeNatalChart(EXACT_A);
    const html = renderToStaticMarkup(createElement(ChartWheel, { chart, interactive: false }));
    expect(html).toContain("var(--cream)");
    expect(html).toContain("var(--teal)");
    expect(html).toContain("var(--rose)");
    expect(html).toContain("var(--fire)");
    expect(html).not.toContain("cursor:pointer");
  });
});
