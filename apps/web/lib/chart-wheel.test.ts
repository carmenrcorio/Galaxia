/**
 * ChartWheel seam + aspect-list consistency.
 * No React Testing Library — renderToStaticMarkup is enough for SVG structure.
 */
import { computeNatalChart, computeSynastry, type Aspect, type NatalChart } from "@galaxia/astro";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { ChartWheel, internalNatalAspects } from "../components/chart-wheel";

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
function personPageNatalAspects(chart: NatalChart): Aspect[] {
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

describe("ChartWheel aspect list vs person page", () => {
  it("internal wheel filter and person-page list disagreed on the same chart (pre-prop)", () => {
    const chart = computeNatalChart(EXACT_A);
    const wheel = internalNatalAspects(chart);
    const page = personPageNatalAspects(chart);

    expect(page.length).toBeGreaterThan(0);
    expect(wheel.length).toBeGreaterThan(0);

    const wheelKeys = new Set(wheel.map((a) => [a.from, a.to].sort().join(":") + ":" + a.type));
    const pageKeys = new Set(page.map((a) => [a.from, a.to].sort().join(":") + ":" + a.type));
    const onlyPage = [...pageKeys].filter((k) => !wheelKeys.has(k));
    const onlyWheel = [...wheelKeys].filter((k) => !pageKeys.has(k));

    // Divergence on this fixture: page = orb-sorted top 14; historical wheel =
    // orb < 5 then first 12 in engine order (not orb-sorted). Sets differ.
    expect(page.length).toBe(14);
    expect(wheel.length).toBe(12);
    expect(onlyPage.length).toBeGreaterThan(0);
    expect(onlyWheel.length).toBeGreaterThan(0);
  });

  it("passing aspects renders exactly those lines (no internal recompute)", () => {
    const chart = computeNatalChart(EXACT_A);
    const only: Aspect[] = [
      { from: "sun", to: "moon", type: "square", orb: 1.1, harmony: -1 },
    ];
    const html = renderToStaticMarkup(createElement(ChartWheel, { chart, aspects: only, interactive: false }));
    expect(html).toContain('data-asp="sun-moon"');
    // A single forced aspect — not the full internal set.
    expect((html.match(/data-asp="/g) ?? []).length).toBe(1);
    expect(html).toContain('stroke="var(--rose)"');
  });
});

describe("ChartWheel biwheel seam", () => {
  it("renders outer-chart planets with owner-prefixed keys and no second house ring", () => {
    const inner = computeNatalChart(EXACT_A);
    const outer = computeNatalChart(EXACT_B);
    expect(inner.cusps?.length).toBe(12);

    const html = renderToStaticMarkup(
      createElement(ChartWheel, { chart: inner, outerChart: outer, interactive: false })
    );

    expect(html).toContain('data-planet="inner-sun"');
    expect(html).toContain('data-planet="outer-sun"');
    expect(html).toContain('data-planet="outer-moon"');

    // House numbers 1–12 once (inner frame only).
    const houseLabels = html.match(/fill="var\(--mist2\)"[^>]*>\d+<\/text>/g) ?? [];
    expect(houseLabels.length).toBe(12);

    // Cross-aspect lines present when both charts are exact.
    expect(html).toMatch(/data-asp="/);
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
  it("uses CSS vars (print path) and cream planet glyphs", () => {
    const chart = computeNatalChart(EXACT_A);
    const html = renderToStaticMarkup(createElement(ChartWheel, { chart, interactive: false }));
    expect(html).toContain("var(--cream)");
    expect(html).toContain("var(--teal)");
    expect(html).toContain("var(--rose)");
    expect(html).toContain("var(--fire)");
    // No pointer cursor when interactive=false
    expect(html).not.toContain("cursor:pointer");
  });
});
