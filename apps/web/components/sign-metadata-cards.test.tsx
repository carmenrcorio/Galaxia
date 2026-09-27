// @vitest-environment jsdom

import { getSignMetadata, type NatalChart, type Sign } from "@galaxia/astro";
import { BIRTHSTONE_COLORS, ELEMENT_NODE_COLORS } from "@galaxia/core";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SignMetadataCards } from "./sign-metadata-cards";

afterEach(cleanup);

function chart(sunConfident = true, sign: Sign = "Capricorn"): NatalChart {
  return {
    placements: [
      { body: "sun", lon: 280, sign, degree: 10, retro: false, confident: sunConfident },
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
    expect(section.classList.contains("glass-card")).toBe(true);
    expect(section.dataset.element).toBe("earth");
    expect(section.dataset.elementColor).toBe(ELEMENT_NODE_COLORS.earth);
    expect(section.dataset.birthstoneColor).toBe(BIRTHSTONE_COLORS.Capricorn);
    expect(screen.getByText("Cardinal")).toBeTruthy();
    expect(screen.getByText("Saturn")).toBeTruthy();
    expect(screen.getByText("♄")).toBeTruthy();
    expect(screen.getByText("♑")).toBeTruthy();
    expect(screen.getByText("The Sea-Goat")).toBeTruthy();
    expect(screen.getByText("Lead")).toBeTruthy();
    expect(screen.getByText("Garnet")).toBeTruthy();
    expect(screen.getByText("Element").closest(".glossary-term")).toBeTruthy();
    expect(screen.getByText("Modality").closest(".glossary-term")).toBeTruthy();
    expect(screen.getByText("Ruling planet").closest(".glossary-term")).toBeTruthy();
  });

  it("explains the element, metal, and birthstone without a tap", () => {
    render(<SignMetadataCards chart={chart()} />);

    expect(screen.getByTestId("element-significance").textContent).toBe(
      "Earth here is the mountain -- not the soil that grows things but the structure that endures them. Capricorn's element is permanence, built one decision at a time.",
    );
    expect(screen.getByTestId("metal-significance").textContent).toBe(
      "Heavy, dense, and foundational. Lead is the base metal that alchemists believed could become gold -- but only through sustained transformation. The work is the point.",
    );
    expect(screen.getByTestId("birthstone-significance").textContent).toBe(
      "Deep red, dense, and durable. Garnet is not flashy. It does not need to be. It is the stone you find in estate jewelry that outlasted the person who wore it.",
    );
  });

  it("separates the identity, symbol, and materials bands into their own rows", () => {
    render(<SignMetadataCards chart={chart()} />);

    const rows = screen.getByTestId("sign-metadata-cards").querySelectorAll(".sign-metadata-card__row");
    expect(rows.length).toBe(3);
    expect(rows[0].classList.contains("sign-metadata-card__row--identity")).toBe(true);
    expect(rows[1].classList.contains("sign-metadata-card__row--symbol")).toBe(true);
    expect(rows[2].classList.contains("sign-metadata-card__row--materials")).toBe(true);
  });

  it("shows the complete approved symbol origin without expanding", () => {
    for (const sign of ["Aries", "Scorpio", "Pisces", "Capricorn"] as const) {
      cleanup();
      render(<SignMetadataCards chart={chart(true, sign)} />);

      const origin = getSignMetadata(sign).symbolOrigin;
      expect(screen.getByText(origin)).toBeTruthy();
      expect(origin.split(".").filter((sentence) => sentence.trim()).length).toBeGreaterThan(1);
      expect(screen.queryByRole("button", { name: new RegExp(`why ${sign} uses`) })).toBeNull();
      expect(screen.queryByText("▼")).toBeNull();
      expect(screen.queryByText("▲")).toBeNull();
    }
  });

  it("does not render for an uncertain Sun", () => {
    render(<SignMetadataCards chart={chart(false)} />);
    expect(screen.queryByTestId("sign-metadata-cards")).toBeNull();
  });
});
