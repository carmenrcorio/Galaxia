// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  CHART_PRECISION_ADD_DATE,
  CHART_PRECISION_DOES_NOT_HEADING,
  CHART_PRECISION_FACT,
  CHART_PRECISION_SUPPORTS_HEADING,
  CHART_PRECISION_WHY_HEADING,
  CHART_PRECISION_YEAR_UNLOCKS,
} from "@galaxia/core";
import { ChartPrecisionIndicator } from "./chart-precision-indicator";

afterEach(() => {
  cleanup();
});

describe("ChartPrecisionIndicator", () => {
  it("states date-only as a fact, not a warning banner", () => {
    const { container } = render(<ChartPrecisionIndicator precision="date" />);
    expect(screen.getByRole("button", { name: CHART_PRECISION_FACT.date })).toBeTruthy();
    expect(container.textContent).not.toMatch(/warning/i);
    expect(container.querySelector("[role='alert']")).toBeNull();
  });

  it("opens supports / does not / why from the add-person ladder", () => {
    render(<ChartPrecisionIndicator precision="year" />);
    fireEvent.click(screen.getByRole("button", { name: CHART_PRECISION_FACT.year }));
    expect(screen.getByText(CHART_PRECISION_SUPPORTS_HEADING)).toBeTruthy();
    expect(screen.getByText(CHART_PRECISION_DOES_NOT_HEADING)).toBeTruthy();
    expect(screen.getByText(CHART_PRECISION_WHY_HEADING)).toBeTruthy();
    expect(screen.getByText(CHART_PRECISION_YEAR_UNLOCKS)).toBeTruthy();
  });

  it("offers one upgrade action when the parent can edit", () => {
    const onUpgrade = vi.fn();
    render(
      <ChartPrecisionIndicator precision="year" onUpgrade={onUpgrade} showUpgrade />
    );
    fireEvent.click(screen.getByRole("button", { name: CHART_PRECISION_ADD_DATE }));
    expect(onUpgrade).toHaveBeenCalledWith("date");
  });

  it("does not nag with an upgrade when showUpgrade is false", () => {
    render(
      <ChartPrecisionIndicator precision="year" onUpgrade={() => undefined} showUpgrade={false} />
    );
    expect(screen.queryByRole("button", { name: CHART_PRECISION_ADD_DATE })).toBeNull();
  });

  it("hides the upgrade when exact time already has a city", () => {
    render(
      <ChartPrecisionIndicator
        precision="exact"
        hasBirthPlace
        onUpgrade={() => undefined}
      />
    );
    expect(screen.getByRole("button", { name: CHART_PRECISION_FACT.exact })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Add a birth/ })).toBeNull();
  });
});
