// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { COMPARE_PREFILL_NAME_KEY } from "../../lib/quick-chart";
import { QuickChartResultActions } from "./quick-chart-result-actions";

let viewer = { loading: false, userId: null as string | null };

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    onClick,
  }: {
    href: string;
    children: unknown;
    onClick?: () => void;
  }) => (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onClick?.();
      }}
    >
      {children as never}
    </a>
  ),
}));

vi.mock("../../lib/use-viewer", () => ({
  useViewer: () => viewer,
}));

vi.mock("../chart-lead-capture", () => ({
  ChartLeadCapture: ({
    chartData,
  }: {
    chartData: { precision: string; month?: number; day?: number; year?: number };
  }) => (
    <section aria-label="chart lead capture" data-chart={JSON.stringify(chartData)}>
      Get transit alerts for this chart
    </section>
  ),
}));

const chartData = {
  precision: "date" as const,
  month: 6,
  day: 15,
  year: 1990,
};

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  viewer = { loading: false, userId: null };
});

describe("QuickChartResultActions", () => {
  it("shows compact chart links and anonymous email capture with the submitted birth data", () => {
    render(
      <QuickChartResultActions
        chartData={chartData}
        name="Ada"
        fullChartHref="/chart?pr=date&m=6&d=15&y=1990&name=Ada"
      />,
    );

    const compare = screen.getByRole("link", {
      name: "Now compare with someone in your life",
    });
    expect(compare.getAttribute("href")).toBe(
      "/chart/compare?a_pr=date&a_m=6&a_d=15&a_y=1990",
    );
    expect(compare.getAttribute("href")).not.toContain("Ada");

    expect(
      screen.getByRole("link", { name: "See the full chart" }).getAttribute("href"),
    ).toBe("/chart?pr=date&m=6&d=15&y=1990&name=Ada");

    const capture = screen.getByRole("region", { name: "chart lead capture" });
    expect(JSON.parse(capture.getAttribute("data-chart") ?? "")).toEqual(chartData);
    expect(sessionStorage.getItem(COMPARE_PREFILL_NAME_KEY)).toBe("Ada");

    sessionStorage.clear();
    fireEvent.click(compare);
    expect(sessionStorage.getItem(COMPARE_PREFILL_NAME_KEY)).toBe("Ada");
  });

  it("does not show email capture while viewer state loads or for a signed-in viewer", () => {
    viewer = { loading: true, userId: null };
    const { rerender } = render(
      <QuickChartResultActions
        chartData={chartData}
        fullChartHref="/chart?pr=date&m=6&d=15&y=1990"
      />,
    );
    expect(screen.queryByRole("region", { name: "chart lead capture" })).toBeNull();

    viewer = { loading: false, userId: "user-1" };
    rerender(
      <QuickChartResultActions
        chartData={chartData}
        fullChartHref="/chart?pr=date&m=6&d=15&y=1990"
      />,
    );
    expect(screen.queryByRole("region", { name: "chart lead capture" })).toBeNull();
    expect(
      screen.getByRole("link", { name: "Now compare with someone in your life" }),
    ).toBeTruthy();
  });
});
