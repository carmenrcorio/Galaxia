// @vitest-environment jsdom

/**
 * Step 4 minor gate: the image export control must be absent whenever
 * `pairHasMinor` is true, and present for an adult pair. Covers both the
 * convenience `ChartImageExport` wrapper and the lower-level
 * `ChartImageExportButton` primitive (the one the galaxy view uses with a
 * detached frame ref), so neither entry point can drift from the other.
 */
import { createRef } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ChartImageExport, ChartImageExportButton } from "./chart-image-export";

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
