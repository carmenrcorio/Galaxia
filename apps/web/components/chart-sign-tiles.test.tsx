// @vitest-environment jsdom

import type { NatalChart } from "@galaxia/astro";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BODY_GLYPH, SIGN_GLYPH } from "../lib/design";
import { ChartSignTiles } from "./chart-sign-tiles";

afterEach(() => {
  cleanup();
});

function chart(overrides: Partial<NatalChart> = {}): NatalChart {
  return {
    placements: [
      { body: "sun", lon: 12, sign: "Cancer", degree: 12, retro: false, confident: true },
      { body: "moon", lon: 340, sign: "Pisces", degree: 20, retro: false, confident: true },
    ],
    precision: "exact",
    asc: "Cancer",
    generational: {
      uranus: { sign: "Capricorn", confident: true },
      neptune: { sign: "Capricorn", confident: true },
      pluto: { sign: "Scorpio", confident: true },
      cohortLabel: "test",
    },
    ...overrides,
  };
}

describe("ChartSignTiles", () => {
  it("renders Sun, Moon, and Rising from the chart, never hardcoded names", () => {
    render(<ChartSignTiles chart={chart()} />);
    expect(screen.getByText("Sun")).toBeTruthy();
    expect(screen.getByText("Moon")).toBeTruthy();
    expect(screen.getByText("Rising")).toBeTruthy();
    expect(screen.getAllByText("Cancer")).toHaveLength(2);
    expect(screen.getByText("Pisces")).toBeTruthy();
    expect(screen.getAllByText(SIGN_GLYPH.Cancer).length).toBeGreaterThan(0);
    expect(screen.getByText(BODY_GLYPH.moon)).toBeTruthy();
    expect(screen.queryByText(SIGN_GLYPH.Pisces)).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("omits Rising when the chart has no ascendant", () => {
    const { asc: _asc, ...withoutRising } = chart();
    render(<ChartSignTiles chart={withoutRising} />);
    expect(screen.getByText("Sun")).toBeTruthy();
    expect(screen.getByText("Moon")).toBeTruthy();
    expect(screen.queryByText("Rising")).toBeNull();
  });

  it("renders nothing when the chart has no sun, moon, or rising", () => {
    render(
      <ChartSignTiles
        chart={chart({
          placements: [],
          asc: undefined,
        })}
      />
    );
    expect(screen.queryByTestId("chart-sign-tiles")).toBeNull();
  });
});
