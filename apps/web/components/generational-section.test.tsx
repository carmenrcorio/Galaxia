// @vitest-environment jsdom

import { compareGenerational, genFrame, genHeadline, WORK_VIEW_HEADING, WORK_VIEW_LABELS, ERA_READING_HEADING, plutoSourceLine, type GenSignature } from "@galaxia/astro";
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

  it("leads with era reading and source for Pluto, and with the work view only when professional", () => {
    const generational = compareGenerational(parent, child);
    const { unmount } = render(<GenerationalSection generational={generational} />);
    expect(screen.getAllByText(ERA_READING_HEADING).length).toBe(2);
    expect(screen.getByText(plutoSourceLine("Virgo"))).toBeTruthy();
    expect(screen.getByText(plutoSourceLine("Scorpio"))).toBeTruthy();
    expect(screen.queryByText(WORK_VIEW_HEADING)).toBeNull();
    unmount();

    render(<GenerationalSection generational={generational} professional />);
    expect(screen.getAllByText(WORK_VIEW_HEADING).length).toBeGreaterThan(0);
    expect(screen.getAllByText(new RegExp(WORK_VIEW_LABELS.respect)).length).toBeGreaterThan(0);
    expect(screen.getByText("How Galaxia reads this at work")).toBeTruthy();
  });
});
