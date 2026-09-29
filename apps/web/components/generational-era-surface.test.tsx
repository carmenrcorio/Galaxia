// @vitest-environment jsdom

import {
  ERA_READING_HEADING,
  WORK_VIEW_HEADING,
  plutoSourceLine,
  type SignKey,
} from "@galaxia/astro";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  GenerationalCohortSections,
  GenerationalEraSections,
  GenerationalEraSurface,
} from "./generational-era-surface";

afterEach(() => {
  cleanup();
});

function follows(before: HTMLElement, after: HTMLElement) {
  return Boolean(before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe("GenerationalEraSurface", () => {
  it("keeps the compare order: work view, then era reading, then source", () => {
    render(<GenerationalEraSurface sign="Virgo" showWorkView showSource />);
    const work = screen.getByText(WORK_VIEW_HEADING);
    const era = screen.getByText(ERA_READING_HEADING);
    const source = screen.getByText(plutoSourceLine("Virgo"));
    expect(era.className).not.toContain("eyebrow");
    expect(follows(work, era)).toBe(true);
    expect(follows(era, source)).toBe(true);
  });

  it("person order leads with an always-visible eyebrow, then the source, then work", () => {
    render(
      <GenerationalEraSurface
        sign="Scorpio"
        showWorkView
        showSource
        headingVariant="eyebrow"
        order="era-first"
      />
    );
    const era = screen.getByText(ERA_READING_HEADING);
    const source = screen.getByText(plutoSourceLine("Scorpio"));
    const work = screen.getByText(WORK_VIEW_HEADING);
    expect(era.className).toContain("eyebrow");
    expect(era.closest("button")).toBeNull();
    expect(follows(era, source)).toBe(true);
    expect(follows(source, work)).toBe(true);
  });
});

describe("GenerationalEraSections", () => {
  function renderSign(sign: SignKey, showWorkView = false) {
    return render(<GenerationalEraSections sign={sign} showWorkView={showWorkView} />);
  }

  it("shows the era section with every star-level control absent", () => {
    renderSign("Virgo");
    const era = screen.getByText(ERA_READING_HEADING);
    expect(era.className).toContain("eyebrow");
    expect(era.closest("button")).toBeNull();
    expect(screen.getByText(plutoSourceLine("Virgo"))).toBeTruthy();
    expect(screen.getByText("The corruption signature")).toBeTruthy();
    expect(screen.getByText("Others who carried this")).toBeTruthy();
    expect(screen.getByText("Princess Diana")).toBeTruthy();
    expect(screen.getByText("What they lived through")).toBeTruthy();
    expect(screen.queryByText(WORK_VIEW_HEADING)).toBeNull();

    const source = screen.getByText(plutoSourceLine("Virgo"));
    const corruption = screen.getByText("The corruption signature");
    const figures = screen.getByText("Others who carried this");
    const lived = screen.getByText("What they lived through");
    expect(follows(era, source)).toBe(true);
    expect(follows(source, corruption)).toBe(true);
    expect(follows(corruption, figures)).toBe(true);
    expect(follows(figures, lived)).toBe(true);
  });

  it("uses the same section order for a different Pluto sign", () => {
    renderSign("Scorpio");
    const era = screen.getByText(ERA_READING_HEADING);
    const source = screen.getByText(plutoSourceLine("Scorpio"));
    const corruption = screen.getByText("The corruption signature");
    const figures = screen.getByText("Others who carried this");
    const lived = screen.getByText("What they lived through");
    expect(screen.getByText("Taylor Swift")).toBeTruthy();
    expect(screen.queryByText("Princess Diana")).toBeNull();
    expect(follows(era, source)).toBe(true);
    expect(follows(source, corruption)).toBe(true);
    expect(follows(corruption, figures)).toBe(true);
    expect(follows(figures, lived)).toBe(true);
  });

  it("omits the figures block when that sign has none, and still shows the era", () => {
    renderSign("Capricorn");
    expect(screen.getByText(ERA_READING_HEADING).className).toContain("eyebrow");
    expect(screen.getByText(plutoSourceLine("Capricorn"))).toBeTruthy();
    expect(screen.getByText("The corruption signature")).toBeTruthy();
    expect(screen.getByText("What they lived through")).toBeTruthy();
    expect(screen.queryByText("Others who carried this")).toBeNull();
  });

  it("places the work view after the source line on a professional profile", () => {
    renderSign("Libra", true);
    const source = screen.getByText(plutoSourceLine("Libra"));
    const work = screen.getByText(WORK_VIEW_HEADING);
    const corruption = screen.getByText("The corruption signature");
    expect(follows(source, work)).toBe(true);
    expect(follows(work, corruption)).toBe(true);
  });

  it("renders nothing for a Pluto sign with no authored cohort copy", () => {
    const { container } = renderSign("Aries");
    expect(container.textContent).toBe("");
  });

  it("toggles an era event without hiding the era heading", () => {
    render(<GenerationalCohortSections sign="Virgo" />);
    expect(screen.queryByText(/curtain came down on the idea that government was trustworthy/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Watergate" }));
    expect(screen.getByText(/curtain came down on the idea that government was trustworthy/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Watergate" }));
    expect(screen.queryByText(/curtain came down on the idea that government was trustworthy/)).toBeNull();
  });
});
