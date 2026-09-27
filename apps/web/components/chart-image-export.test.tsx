// @vitest-environment jsdom

/**
 * Step 4 minor gate: the image export control must be absent whenever
 * `pairHasMinor` is true, and present for an adult pair. Covers both the
 * convenience `ChartImageExport` wrapper and the lower-level
 * `ChartImageExportButton` primitive (the one the galaxy view uses with a
 * detached frame ref), so neither entry point can drift from the other.
 */
import { interpretPlacement, type NatalChart } from "@galaxia/astro";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ChartImageExport, ChartImageExportButton } from "./chart-image-export";
import { FlipSignCards } from "./flip-sign-cards";

vi.mock("html-to-image", () => ({
  toSvg: vi.fn(),
}));

import { toSvg } from "html-to-image";

afterEach(() => {
  cleanup();
});

describe("ChartImageExport minor gate", () => {
  it("renders the share-image control for an adult pair", () => {
    render(
      <ChartImageExport filename="adult-pair.png" pairHasMinor={false}>
        <p>Adult pair chart content</p>
      </ChartImageExport>
    );
    expect(screen.getByText("Adult pair chart content")).toBeTruthy();
    expect(screen.getByRole("button")).toBeTruthy();
  });

  it("omits the share-image control for a minor pair, but still renders the underlying content", () => {
    render(
      <ChartImageExport filename="minor-pair.png" pairHasMinor={true}>
        <p>Minor pair chart content</p>
      </ChartImageExport>
    );
    expect(screen.getByText("Minor pair chart content")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("ChartImageExportButton minor gate (galaxy / detached-frame call sites)", () => {
  it("renders when pairHasMinor is false", () => {
    const ref = createRef<HTMLDivElement>();
    render(<ChartImageExportButton frameRef={ref} filename="adult.png" pairHasMinor={false} />);
    expect(screen.getByRole("button")).toBeTruthy();
  });

  it("renders nothing when pairHasMinor is true", () => {
    const ref = createRef<HTMLDivElement>();
    render(<ChartImageExportButton frameRef={ref} filename="minor.png" pairHasMinor={true} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

function chart(): NatalChart {
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
  };
}

describe("ChartImageExport flip-card capture", () => {
  it("clones only the front face and keeps the wheel and metadata in the frame", async () => {
    const expected = interpretPlacement("sun", "Cancer", { minorSafe: false });
    let during: { back: boolean; exportCount: number; flipped: boolean; text: string } | null = null;
    vi.mocked(toSvg).mockImplementation(async (node) => {
      const el = node as HTMLElement;
      during = {
        back: Boolean(el.querySelector(".flip-sign-card__back")),
        exportCount: el.querySelectorAll(".flip-sign-card.is-export").length,
        flipped: Boolean(el.querySelector(".flip-sign-card.is-flipped")),
        text: el.textContent ?? "",
      };
      throw new Error("inspect-only");
    });

    render(
      <ChartImageExport filename="natal-chart.png" label="Share chart image">
        <FlipSignCards chart={chart()} minorSafe={false} />
        <p>Zodiac wheel</p>
        <p>Sign reference</p>
      </ChartImageExport>,
    );

    expect(document.querySelector(".flip-sign-card__back")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Sun in Cancer\. Flip/i }));
    expect(screen.getByText(expected.long)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Share chart image" }));
    await waitFor(() => expect(during).toBeTruthy());

    expect(during?.back).toBe(false);
    expect(during?.exportCount).toBe(3);
    expect(during?.flipped).toBe(false);
    expect(during?.text).toContain(expected.short);
    expect(during?.text).not.toContain(expected.long);
    expect(during?.text).toContain("Zodiac wheel");
    expect(during?.text).toContain("Sign reference");

    await waitFor(() => expect(screen.getByText(expected.long)).toBeTruthy());
    expect(document.querySelector(".flip-sign-card__back")).toBeTruthy();
    expect(document.querySelector(".flip-sign-card.is-export")).toBeNull();
  });
});
