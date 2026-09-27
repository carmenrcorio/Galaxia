// @vitest-environment jsdom

import { computeNatalChart } from "@galaxia/astro";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SingleChartGenerationalSummary } from "./single-chart-generational-summary";

afterEach(cleanup);

describe("SingleChartGenerationalSummary", () => {
  it("shows the Pluto generation label, cohort, and three outer planets", () => {
    const chart = computeNatalChart({
      dateUTC: "1987-06-17T12:00:00.000Z",
      precision: "date",
    });

    render(<SingleChartGenerationalSummary chart={chart} />);

    expect(screen.getByText("Generational signature")).toBeTruthy();
    expect(screen.getByText("Pluto in Scorpio generation")).toBeTruthy();
    expect(screen.getByText(chart.generational.cohortLabel)).toBeTruthy();
    expect(screen.getByText(/^Uranus in /)).toBeTruthy();
    expect(screen.getByText(/^Neptune in /)).toBeTruthy();
    expect(screen.getByText(`Pluto in ${chart.generational.pluto.sign}`)).toBeTruthy();
  });

  it("keeps a year-only signature visible without asserting an uncertain Pluto sign", () => {
    const chart = computeNatalChart({
      dateUTC: "1995-01-01T00:00:00.000Z",
      precision: "year",
    });

    render(<SingleChartGenerationalSummary chart={chart} />);

    expect(screen.getByText("Generational signature")).toBeTruthy();
    expect(screen.getByText(chart.generational.cohortLabel)).toBeTruthy();
    if (!chart.generational.pluto.confident) {
      expect(screen.queryByText(/^Pluto in .* generation$/)).toBeNull();
    }
  });
});
