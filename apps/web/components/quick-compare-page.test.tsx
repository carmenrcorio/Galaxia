// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BirthFormInput } from "@galaxia/astro";
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

beforeEach(() => {
  window.history.replaceState(null, "", "/chart/compare");
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  viewer = ANON;
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
