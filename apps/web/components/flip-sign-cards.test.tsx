// @vitest-environment jsdom

import { interpretPlacement, interpretRising, type NatalChart } from "@galaxia/astro";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FlipSignCards } from "./flip-sign-cards";

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

describe("FlipSignCards", () => {
  it("flips a top card and shows the curated placement summary", () => {
    render(<FlipSignCards chart={chart()} minorSafe={false} />);
    const expected = interpretPlacement("sun", "Cancer", { minorSafe: false });
    const sun = screen.getByRole("button", { name: /Sun in Cancer\. Flip/i });
    expect(sun.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(sun);
    expect(sun.getAttribute("aria-pressed")).toBe("true");
    expect(sun.getAttribute("aria-label")).toContain(expected.long);
    expect(screen.getByText(expected.long)).toBeTruthy();
    const rising = interpretRising("Cancer");
    fireEvent.click(screen.getByRole("button", { name: /Rising in Cancer\. Flip/i }));
    expect(screen.getByText(rising.long)).toBeTruthy();
  });
});
