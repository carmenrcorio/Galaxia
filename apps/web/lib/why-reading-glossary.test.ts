import { describe, expect, it } from "vitest";
import { whyReadingGlossaryHref } from "./why-reading-glossary";

describe("whyReadingGlossaryHref", () => {
  it("links natal placements to planet glossary entries", () => {
    expect(
      whyReadingGlossaryHref("Moon in Cancer, house 4, 12.3 degrees.", "natal_placement"),
    ).toBe("/glossary#moon");
  });

  it("links Chiron natal placements to the Chiron glossary entry", () => {
    expect(
      whyReadingGlossaryHref("Chiron in Gemini, house 5, 25.3 degrees.", "natal_placement"),
    ).toBe("/glossary#chiron");
  });

  it("links synastry aspects to aspect or pair glossary entries", () => {
    expect(
      whyReadingGlossaryHref("Moon square Saturn, orb 2.0 degrees.", "natal_aspect"),
    ).toBe("/glossary#moon-square-saturn");
    expect(
      whyReadingGlossaryHref(
        "Alex's Moon conjunction Sam's Moon, orb 1.2 degrees.",
        "quick_check_aspect",
      ),
    ).toBe("/glossary#moon-conjunct-moon");
  });

  it("links flows/catches rows to the relationship map glossary", () => {
    expect(
      whyReadingGlossaryHref("Venus trine Mars, orb 3.0 degrees.", "flows_catches_row"),
    ).toBe("/glossary#trine");
  });

  it("links flip cards to sun, moon, or rising glossary entries", () => {
    expect(whyReadingGlossaryHref("Sun in Leo.", "flip_card")).toBe("/glossary#sun");
    expect(whyReadingGlossaryHref("Rising in Scorpio.", "flip_card")).toBe("/glossary#rising-sign");
  });
});
