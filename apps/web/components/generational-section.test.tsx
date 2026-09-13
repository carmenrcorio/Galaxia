// @vitest-environment jsdom

import { compareGenerational, genFrame, genHeadline, type GenSignature } from "@galaxia/astro";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GenerationalSection } from "./generational-section";

afterEach(() => {
  cleanup();
});

const parent: GenSignature = {
  uranus: { sign: "Virgo", confident: true },
  neptune: { sign: "Scorpio", confident: true },
  pluto: { sign: "Virgo", confident: true },
  cohortLabel: "parent",
};

const child: GenSignature = {
  uranus: { sign: "Capricorn", confident: true },
  neptune: { sign: "Capricorn", confident: true },
  pluto: { sign: "Scorpio", confident: true },
  cohortLabel: "child",
};

describe("GenerationalSection with compareGenerational data (the /app/compare shape)", () => {
  it("renders per-planet domain, watch-for, and You:/Them: proof for diverged planets", () => {
    const generational = compareGenerational(parent, child);
    expect(generational.diverged.length).toBeGreaterThan(0);

    render(<GenerationalSection generational={generational} />);

    expect(screen.getByText("Generational call-out")).toBeTruthy();
    expect(screen.getByText(genHeadline(generational.shared.length, generational.diverged.length))).toBeTruthy();

    for (const entry of generational.diverged) {
      const frame = genFrame(entry.planet);
      expect(screen.getByText(frame.domain)).toBeTruthy();
      expect(screen.getByText(frame.diverged)).toBeTruthy();
    }

    const proofs = screen.getAllByText(/You: .* Them: /);
    expect(proofs.length).toBe(generational.diverged.length);
    expect(screen.queryByText(/This connection spans different eras/)).toBeNull();
    expect(screen.queryByText(/^Fault line:/)).toBeNull();
  });
});
