// @vitest-environment jsdom

import type { NatalChart } from "@galaxia/astro";
import { ELEMENT_NODE_COLORS } from "@galaxia/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SignMetadataCards } from "./sign-metadata-cards";

afterEach(cleanup);

function chart(sunConfident = true): NatalChart {
  return {
    placements: [
      { body: "sun", lon: 280, sign: "Capricorn", degree: 10, retro: false, confident: sunConfident },
      { body: "moon", lon: 10, sign: "Aries", degree: 10, retro: false, confident: true },
    ],
    precision: sunConfident ? "exact" : "year",
    generational: {
      uranus: { sign: "Capricorn", confident: true },
      neptune: { sign: "Capricorn", confident: true },
      pluto: { sign: "Scorpio", confident: true },
      cohortLabel: "test",
    },
  };
}

describe("SignMetadataCards", () => {
  it("shows the confident Sun sign reference with the approved element color", () => {
    render(<SignMetadataCards chart={chart()} />);

    const section = screen.getByTestId("sign-metadata-cards");
    expect(section.dataset.element).toBe("earth");
    expect(section.dataset.elementColor).toBe(ELEMENT_NODE_COLORS.earth);
    expect(screen.getByText("Cardinal")).toBeTruthy();
    expect(screen.getByText("Saturn")).toBeTruthy();
    expect(screen.getByText("Lead")).toBeTruthy();
    expect(screen.getByText("Garnet")).toBeTruthy();
    expect(screen.getByText("Element").closest(".glossary-term")).toBeTruthy();
    expect(screen.getByText("Modality").closest(".glossary-term")).toBeTruthy();
    expect(screen.getByText("Ruling planet").closest(".glossary-term")).toBeTruthy();
  });

  it("expands the complete approved symbol origin", () => {
    render(<SignMetadataCards chart={chart()} />);

    expect(screen.getByText("The sea-goat -- half goat, half fish -- is one of the oldest symbols in astrology.")).toBeTruthy();
    const button = screen.getByRole("button", { name: "Read why Capricorn uses the Sea-Goat" });
    fireEvent.click(button);

    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(/It climbs relentlessly but its tail remembers the depth it came from/)).toBeTruthy();
  });

  it("does not render for an uncertain Sun", () => {
    render(<SignMetadataCards chart={chart(false)} />);
    expect(screen.queryByTestId("sign-metadata-cards")).toBeNull();
  });
});
