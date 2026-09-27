import { describe, expect, it } from "vitest";
import { pairElementBalanceInterpretation, summarizePairElementBalance } from "../src/index";

describe("pairElementBalanceInterpretation", () => {
  it("names every co-dominant element", () => {
    const balance = summarizePairElementBalance(
      { fire: 4, earth: 3, air: 2, water: 1 },
      { fire: 2, earth: 3, air: 2, water: 3 },
    );

    expect(pairElementBalanceInterpretation(balance)).toEqual([
      "You share Fire and Earth dominance.",
    ]);
  });

  it("uses balanced copy instead of inventing a dominant element", () => {
    const balance = summarizePairElementBalance(
      { fire: 3, earth: 2, air: 3, water: 2 },
      { fire: 2, earth: 3, air: 2, water: 3 },
    );

    expect(pairElementBalanceInterpretation(balance)).toEqual([
      "Your element mix is balanced. No single element sets the tone for this pair.",
    ]);
  });

  it("adds missing-element interpretation", () => {
    const balance = summarizePairElementBalance(
      { fire: 5, earth: 3, air: 2, water: 0 },
      { fire: 3, earth: 4, air: 2, water: 1 },
    );

    expect(pairElementBalanceInterpretation(balance)).toEqual([
      "You share Fire dominance.",
      "Water is lightly represented across both charts. You may need to make room for it deliberately.",
    ]);
  });
});
