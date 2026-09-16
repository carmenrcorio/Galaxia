// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import QuickChartPage from "../app/chart/quick-chart-page";
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

afterEach(() => {
  cleanup();
  viewer = ANON;
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
