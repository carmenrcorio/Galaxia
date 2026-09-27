// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ElementBalanceSection } from "./element-balance-section";

afterEach(cleanup);

describe("ElementBalanceSection", () => {
  it("renders labeled proportional bars and co-dominant interpretation", () => {
    const { container } = render(
      <ElementBalanceSection
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
      />
    );

    expect(screen.getByRole("img", { name: "Alex element balance: Fire 4, Earth 3, Air 2, Water 1" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Sam element balance: Fire 2, Earth 3, Air 2, Water 3" })).toBeTruthy();
    expect(screen.getByText("You share Fire and Earth dominance.")).toBeTruthy();
    expect(container.querySelector('[data-element="fire"]')).toHaveStyle({ width: "40%" });
  });

  it("keeps zero counts visible and uses balanced copy", () => {
    render(
      <ElementBalanceSection
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
      />
    );

    expect(screen.getByText("Your element mix is balanced. No single element sets the tone for this pair.")).toBeTruthy();
    expect(screen.getAllByText("Water 2")).toHaveLength(2);
  });
});
