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
  it("shows the short on the front and flips to the curated long", () => {
    render(<FlipSignCards chart={chart()} minorSafe={false} />);
    const expected = interpretPlacement("sun", "Cancer", { minorSafe: false });
    expect(screen.getByText(expected.short)).toBeTruthy();
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

  it("shows the Rx badge only on a retrograde placement", () => {
    render(
      <FlipSignCards
        chart={chart({
          placements: [
            { body: "sun", lon: 12, sign: "Cancer", degree: 12, retro: false, confident: true },
            { body: "moon", lon: 340, sign: "Pisces", degree: 20, retro: true, confident: true },
          ],
        })}
        minorSafe={false}
      />
    );
    const badges = screen.getAllByLabelText("Retrograde");
    expect(badges).toHaveLength(1);
    expect(badges[0]?.textContent).toBe("Rx");
    expect(screen.getByRole("button", { name: /Moon in Pisces Rx/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Sun in Cancer/i }).textContent).not.toContain("Rx");
  });
});
