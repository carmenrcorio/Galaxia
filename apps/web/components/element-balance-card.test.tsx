// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ElementBalanceCard } from "./element-balance-card";

describe("ElementBalanceCard", () => {
  it("renders both ten-planet bars with labeled counts and co-dominant copy", () => {
    render(
      <ElementBalanceCard
        nameA="Alex"
        nameB="Sam"
        balance={{
          a: { fire: 4, earth: 3, air: 2, water: 1 },
          b: { fire: 2, earth: 3, air: 2, water: 3 },
          combined: { fire: 6, earth: 6, air: 4, water: 4 },
          dominantElements: ["fire", "earth"],
          missingElements: [],
          balanced: false,
        }}
      />,
    );

    expect(screen.getByRole("img", { name: "Alex element balance" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Sam element balance" })).toBeTruthy();
    expect(screen.getByLabelText("Fire 4 of 10")).toBeTruthy();
    expect(screen.getByLabelText("Water 3 of 10")).toBeTruthy();
    expect(screen.getByText(/You share Fire and Earth dominance/)).toBeTruthy();
  });

  it("renders balanced and missing interpretations from the computed model", () => {
    const { rerender } = render(
      <ElementBalanceCard
        nameA="A"
        nameB="B"
        balance={{
          a: { fire: 3, earth: 2, air: 3, water: 2 },
          b: { fire: 2, earth: 3, air: 2, water: 3 },
          combined: { fire: 5, earth: 5, air: 5, water: 5 },
          dominantElements: [],
          missingElements: [],
          balanced: true,
        }}
      />,
    );
    expect(screen.getByText("No element dominates. Versatility but no automatic gear.")).toBeTruthy();

    rerender(
      <ElementBalanceCard
        nameA="A"
        nameB="B"
        balance={{
          a: { fire: 5, earth: 3, air: 2, water: 0 },
          b: { fire: 4, earth: 3, air: 3, water: 0 },
          combined: { fire: 9, earth: 6, air: 5, water: 0 },
          dominantElements: ["fire"],
          missingElements: ["water"],
          balanced: false,
        }}
      />,
    );
    expect(screen.getByText(/Running hot/)).toBeTruthy();
    expect(screen.getByText(/Emotional check-ins do not happen naturally/)).toBeTruthy();
  });
});
