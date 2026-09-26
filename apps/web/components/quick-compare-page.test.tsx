// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { compareGenerational, computeNatalChart, computeSynastry, type BirthFormInput } from "@galaxia/astro";
import QuickComparePage from "../app/chart/compare/page";
import { COMPARE_PREFILL_NAME_KEY } from "../lib/quick-chart";
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

const SELF_INPUT: BirthFormInput = {
  precision: "date",
  month: 1,
  day: 1,
  year: 1980,
  hour: undefined,
  minute: undefined,
  yearOnly: undefined,
  birthPlace: "",
  lat: "",
  lng: "",
};

let viewer: Viewer = ANON;

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: unknown }) => (
    <a href={href}>{children as never}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/chart/compare",
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

vi.mock("./chart-image-export", () => ({
  ChartImageExport: ({ children }: { children: unknown }) => <div data-testid="chart-image-export">{children as never}</div>,
  chartExportFilename: () => "synastry-chart.png",
}));

vi.mock("./chart-wheel", () => ({
  ChartWheel: () => <div>wheel</div>,
  COMPARE_WHEEL_NEEDS_HOUSES: "needs houses",
}));

vi.mock("./save-to-galaxy-button", () => ({
  SaveToGalaxyButton: () => null,
}));

vi.mock("./share-link-button", () => ({
  ShareLinkButton: () => null,
}));

beforeEach(() => {
  window.history.replaceState(null, "", "/chart/compare");
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  viewer = ANON;
  vi.unstubAllGlobals();
});

describe("QuickComparePage /chart handoff", () => {
  it("prefills Person A from a_ params and the stashed name, without auto-comparing", async () => {
    sessionStorage.setItem(COMPARE_PREFILL_NAME_KEY, "Ada");
    window.history.replaceState(null, "", "/chart/compare?a_pr=date&a_m=6&a_d=15&a_y=1990");
    render(<QuickComparePage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Ada")).toBeTruthy();
    });
    const months = screen.getAllByLabelText("Birth month") as HTMLSelectElement[];
    const years = screen.getAllByLabelText("Birth year") as HTMLSelectElement[];
    expect(months[0]!.value).toBe("6");
    expect(years[0]!.value).toBe("1990");
    expect(months[1]!.value).toBe("");
    expect(screen.getByRole("button", { name: "Compare our charts" })).toBeTruthy();
    expect(screen.queryByText("A shared synastry reading")).toBeNull();
    expect(sessionStorage.getItem(COMPARE_PREFILL_NAME_KEY)).toBeNull();
  });

  it("does not let a signed-in self chart overwrite a /chart handoff", async () => {
    viewer = { ...ANON, userId: "user-1", selfInput: SELF_INPUT, selfName: "Carmen" };
    window.history.replaceState(null, "", "/chart/compare?a_pr=date&a_m=6&a_d=15&a_y=1990");
    render(<QuickComparePage />);

    await waitFor(() => {
      const years = screen.getAllByLabelText("Birth year") as HTMLSelectElement[];
      expect(years[0]!.value).toBe("1990");
    });
    expect(screen.queryByText("✓ Using your own chart")).toBeNull();
    expect(screen.queryByDisplayValue("Carmen")).toBeNull();
  });
});

function precedes(a: Element, b: Element): boolean {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe("QuickComparePage result order", () => {
  it("renders needs above the dynamic table inside the share-image capture", async () => {
    const chartA = computeNatalChart({ dateUTC: "1990-06-15T12:00:00.000Z", precision: "date" });
    const chartB = computeNatalChart({ dateUTC: "1987-12-29T12:00:00.000Z", precision: "date" });
    const synastry = computeSynastry(chartA, chartB);
    const generational = compareGenerational(chartA.generational, chartB.generational);

    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ chartA, chartB, synastry, generational, pairHasMinor: false }),
    })));

    window.history.replaceState(null, "", "/chart/compare?a_pr=date&a_m=6&a_d=15&a_y=1990&b_pr=date&b_m=12&b_d=29&b_y=1987");
    render(<QuickComparePage />);

    await waitFor(() => {
      expect(screen.getByText("Your dynamic")).toBeTruthy();
    });

    const needA = screen.getByText("→ What Person A needs from you");
    const needB = screen.getByText("→ What Person B needs from you");
    const tableHeading = screen.getByText("Your dynamic");
    const capture = screen.getByTestId("chart-image-export");

    expect(capture.contains(needA)).toBe(true);
    expect(capture.contains(needB)).toBe(true);
    expect(capture.contains(tableHeading)).toBe(true);
    expect(precedes(needA, needB)).toBe(true);
    expect(precedes(needB, tableHeading)).toBe(true);
    expect(screen.getByText("Where it flows and catches")).toBeTruthy();
    expect(screen.getByText("Generational call-out")).toBeTruthy();
  });
});
