// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ShareExportCard, exportFilename } from "./share-export-card";

/**
 * STEP 4 (image export minor gate): the export control must be entirely
 * absent for a minor pair, and present for an otherwise-identical adult
 * pair. ShareWatermark is WYSIWYG (always visible on-screen, never
 * export-time-only) — so when minorBlocked is true, the watermark must be
 * withheld too, not just the button; a lone watermark with no export path,
 * or a lone button with no watermark, would both break that contract.
 */

afterEach(() => {
  cleanup();
});

describe("ShareExportCard minor gate", () => {
  it("renders the export control and watermark for an adult pair (minorBlocked: false)", () => {
    render(
      <ShareExportCard filename="jane-and-john.png" label="Share compatibility" minorBlocked={false}>
        <p>Jane &amp; John</p>
      </ShareExportCard>
    );
    expect(screen.getByRole("button", { name: "Share compatibility" })).toBeTruthy();
    expect(screen.getByText("galaxiamea.com")).toBeTruthy();
    expect(screen.getByText("Jane & John")).toBeTruthy();
  });

  it("withholds the export control AND the watermark for a minor pair (minorBlocked: true)", () => {
    render(
      <ShareExportCard filename="jane-and-jr.png" label="Share compatibility" minorBlocked={true}>
        <p>Jane &amp; Jr</p>
      </ShareExportCard>
    );
    expect(screen.queryByRole("button", { name: "Share compatibility" })).toBeNull();
    expect(screen.queryByText("galaxiamea.com")).toBeNull();
    // Content itself still renders — only the export path is gated.
    expect(screen.getByText("Jane & Jr")).toBeTruthy();
  });

  it("defaults minorBlocked to false when omitted", () => {
    render(
      <ShareExportCard filename="natal-chart.png">
        <p>A chart</p>
      </ShareExportCard>
    );
    expect(screen.getByRole("button")).toBeTruthy();
  });
});

describe("exportFilename", () => {
  it("slugifies a real name into <slug>.png", () => {
    expect(exportFilename("Jane Doe", "natal-chart.png")).toBe("jane-doe.png");
  });

  it("falls back when there is no name", () => {
    expect(exportFilename(undefined, "natal-chart.png")).toBe("natal-chart.png");
    expect(exportFilename(null, "natal-chart.png")).toBe("natal-chart.png");
    expect(exportFilename("", "natal-chart.png")).toBe("natal-chart.png");
  });

  it("falls back when the name has no slug-able characters", () => {
    expect(exportFilename("   ", "natal-chart.png")).toBe("natal-chart.png");
  });

  it("strips punctuation and collapses whitespace/casing", () => {
    expect(exportFilename("O'Brien & Núñez", "compatibility.png")).toBe("o-brien-n-ez.png");
  });
});
