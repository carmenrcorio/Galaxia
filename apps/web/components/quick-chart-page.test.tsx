// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NatalChart } from "@galaxia/astro";
import QuickChartPage from "../app/chart/quick-chart-page";
import {
  CHART_COMPARE_CTA_LABEL,
  chartCompareCtaHeadline,
  COMPARE_PREFILL_NAME_KEY,
} from "../lib/quick-chart";
import type { Viewer } from "../lib/use-viewer";

const ANON: Viewer = {
  loading: false,
  userId: null,
  subscriptionStatus: null,
  trialEndsAt: null,
  comped: false,
  isSubscriber: false,
  selfInput: null,
  selfChart: null,
  selfName: null,
};

let viewer: Viewer = ANON;

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: unknown }) => (
    <a href={href}>{children as never}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/chart",
  useRouter: () => ({ push: () => undefined }),
}));

vi.mock("../lib/use-viewer", () => ({
  useViewer: () => viewer,
}));

vi.mock("./cosmic-background-lazy", () => ({
  CosmicBackground: () => <div data-testid="cosmic-background" />,
}));

vi.mock("./timezone-sync", () => ({
  TimezoneSync: () => null,
}));

vi.mock("./trial-banner", () => ({
  TrialBanner: () => null,
}));

vi.mock("./save-to-galaxy-button", () => ({
  SaveToGalaxyButton: () => <a href="/signup">Save to your galaxy</a>,
}));

vi.mock("./share-link-button", () => ({
  ShareLinkButton: () => <button type="button">Copy share link</button>,
}));

vi.mock("./chart-pdf-export", () => ({
  ChartPdfExport: () => null,
}));

const RESULT_CHART = {
  placements: [
    { body: "sun", lon: 12, sign: "Aries", degree: 12, retro: false, confident: true },
    { body: "moon", lon: 200, sign: "Scorpio", degree: 20, retro: false, confident: true },
  ],
  precision: "date",
  generational: {
    uranus: { sign: "Capricorn", confident: true },
    neptune: { sign: "Capricorn", confident: true },
    pluto: { sign: "Scorpio", confident: true },
    cohortLabel: "test",
  },
} satisfies NatalChart;

beforeEach(() => {
  window.history.replaceState(null, "", "/chart");
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  viewer = ANON;
  vi.unstubAllGlobals();
});

describe("QuickChartPage session chrome", () => {
  it("logged-out render is still the public funnel", () => {
    viewer = ANON;
    render(<QuickChartPage />);
    expect(screen.getByRole("heading", { name: "See anyone's real chart, free." })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Log in" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Sign up to build your galaxy →" })).toBeTruthy();
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("crawler and session-loading HTML stay on the logged-out funnel", () => {
    viewer = { ...ANON, loading: true, userId: null };
    render(<QuickChartPage />);
    expect(screen.getByRole("heading", { name: "See anyone's real chart, free." })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Log in" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Sign up to build your galaxy →" })).toBeTruthy();
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("signed-in render keeps the app nav and drops signup copy", () => {
    viewer = { ...ANON, userId: "user-1" };
    render(<QuickChartPage />);
    expect(screen.getByRole("heading", { name: "See anyone's real chart." })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "See anyone's real chart, free." })).toBeNull();
    expect(screen.getByRole("navigation")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Home" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Log in" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Sign up to build your galaxy →" })).toBeNull();
  });
});

describe("QuickChartPage post-generation compare CTA", () => {
  function mockChartOk() {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          chart: RESULT_CHART,
          displayDate: "June 15, 1990",
          birthPlace: null,
          birthDate: "1990-06-15",
        }),
      }),
    );
  }

  it("does not show the compare CTA on the empty form", () => {
    render(<QuickChartPage />);
    expect(screen.queryByRole("link", { name: CHART_COMPARE_CTA_LABEL })).toBeNull();
    expect(screen.queryByText(chartCompareCtaHeadline("Ada"))).toBeNull();
    expect(screen.getByRole("link", { name: "Compare two charts" })).toBeTruthy();
  });

  it("shows a named compare CTA after a chart is generated from the URL", async () => {
    mockChartOk();
    window.history.replaceState(null, "", "/chart?pr=date&m=6&d=15&y=1990&name=Ada");
    render(<QuickChartPage />);

    await waitFor(() => {
      expect(screen.getByText(chartCompareCtaHeadline("Ada"))).toBeTruthy();
    });
    const compareLinks = screen.getAllByRole("link", { name: CHART_COMPARE_CTA_LABEL });
    expect(compareLinks).toHaveLength(1);
    const compare = compareLinks[0]!;
    expect(compare.getAttribute("href")).toMatch(/^\/chart\/compare\?/);
    expect(compare.getAttribute("href")).toContain("a_pr=date");
    expect(compare.getAttribute("href")).toContain("a_m=6");
    expect(compare.getAttribute("href")).not.toMatch(/name/i);
    expect(sessionStorage.getItem(COMPARE_PREFILL_NAME_KEY)).toBe("Ada");
    expect(screen.getByRole("link", { name: "Save to your galaxy" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try another chart" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Compare two charts" })).toBeNull();
  });

  it("uses the nameless headline when no name was entered", async () => {
    mockChartOk();
    window.history.replaceState(null, "", "/chart?pr=date&m=6&d=15&y=1990");
    render(<QuickChartPage />);

    await waitFor(() => {
      expect(screen.getByText(chartCompareCtaHeadline())).toBeTruthy();
    });
    expect(screen.getByRole("link", { name: CHART_COMPARE_CTA_LABEL })).toBeTruthy();
  });
});
