// @vitest-environment jsdom

import type { NatalChart } from "@galaxia/astro";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BODY_GLYPH, SIGN_GLYPH } from "../lib/design";
import { SignGlanceTiles, signGlanceRows } from "./sign-glance-tiles";

afterEach(() => {
  cleanup();
});

function chart(overrides: Partial<NatalChart> = {}): NatalChart {
  return {
    placements: [
      { body: "sun", lon: 115, sign: "Cancer", degree: 25, retro: false, confident: true },
      { body: "moon", lon: 350, sign: "Pisces", degree: 20, retro: false, confident: true },
    ],
    asc: "Cancer",
    precision: "exact",
    generational: {
      uranus: { sign: "Capricorn", confident: true },
      neptune: { sign: "Capricorn", confident: true },
      pluto: { sign: "Scorpio", confident: true },
      cohortLabel: "test",
    },
    ...overrides,
  };
}

describe("signGlanceRows", () => {
  it("reads confident sun/moon and chart.asc rising from the same chart object", () => {
    expect(signGlanceRows(chart())).toEqual([
      { key: "sun", label: "SUN", sign: "Cancer" },
      { key: "moon", label: "MOON", sign: "Pisces" },
      { key: "rising", label: "RISING", sign: "Cancer" },
    ]);
  });

  it("omits an unconfident sun instead of fabricating a sign", () => {
    const rows = signGlanceRows(
      chart({
        placements: [
          { body: "sun", lon: 12, sign: "Aries", degree: 12, retro: false, confident: false, possibleSigns: ["Aries", "Pisces"] },
          { body: "moon", lon: 350, sign: "Pisces", degree: 20, retro: false, confident: true },
        ],
      })
    );
    expect(rows.map((r) => r.key)).toEqual(["moon", "rising"]);
  });

  it("omits rising when chart.asc is absent", () => {
    expect(signGlanceRows(chart({ asc: undefined })).map((r) => r.key)).toEqual(["sun", "moon"]);
  });
});

describe("SignGlanceTiles", () => {
  it("renders SUN / MOON / RISING labels and live sign names", () => {
    render(<SignGlanceTiles chart={chart()} />);
    expect(screen.getByTestId("sign-glance-tiles")).toBeTruthy();
    expect(screen.getByLabelText("SUN Cancer")).toBeTruthy();
    expect(screen.getByLabelText("MOON Pisces")).toBeTruthy();
    expect(screen.getByLabelText("RISING Cancer")).toBeTruthy();
    expect(screen.getByText("SUN")).toBeTruthy();
    expect(screen.getByText("MOON")).toBeTruthy();
    expect(screen.getByText("RISING")).toBeTruthy();
    expect(screen.getAllByText("Cancer")).toHaveLength(2);
    expect(screen.getByText("Pisces")).toBeTruthy();
  });

  it("uses a crescent for the Moon tile and a zodiac glyph for Sun and Rising", () => {
    render(<SignGlanceTiles chart={chart()} />);
    const moon = screen.getByTestId("sign-glance-tile-moon");
    const sun = screen.getByTestId("sign-glance-tile-sun");
    const rising = screen.getByTestId("sign-glance-tile-rising");
    expect(moon.textContent).toContain(BODY_GLYPH.moon);
    expect(sun.textContent).toContain(SIGN_GLYPH.Cancer);
    expect(rising.textContent).toContain(SIGN_GLYPH.Cancer);
    expect(sun.textContent).not.toContain(BODY_GLYPH.moon);
  });

  it("renders nothing when the chart has no confident Big Three", () => {
    const { container } = render(
      <SignGlanceTiles
        chart={chart({
          placements: [],
          asc: undefined,
        })}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
