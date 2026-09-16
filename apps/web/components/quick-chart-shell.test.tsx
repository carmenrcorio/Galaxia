// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MARKETING_NAV_LOGIN, MARKETING_NAV_SIGNUP } from "../lib/nav-links";
import { QuickChartShell } from "./quick-chart-shell";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: unknown }) => (
    <a href={href}>{children as never}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/chart",
  useRouter: () => ({ push: () => undefined }),
}));

vi.mock("./cosmic-background-lazy", () => ({
  CosmicBackground: () => <div data-testid="cosmic-background" />,
}));

vi.mock("./timezone-sync", () => ({
  TimezoneSync: () => null,
}));

vi.mock("./trial-banner", () => ({
  TrialBanner: () => <div data-testid="trial-banner" />,
}));

afterEach(() => {
  cleanup();
});

describe("QuickChartShell logged-out funnel", () => {
  it("keeps the login pill and signup footer", () => {
    render(
      <QuickChartShell eyebrow="Quick Chart" title="See anyone's real chart, free.">
        <p>form</p>
      </QuickChartShell>,
    );
    expect(screen.getByRole("link", { name: MARKETING_NAV_LOGIN.label }).getAttribute("href")).toBe(
      MARKETING_NAV_LOGIN.href,
    );
    const signup = screen.getByRole("link", { name: "Sign up to build your galaxy →" });
    expect(signup.getAttribute("href")).toBe(MARKETING_NAV_SIGNUP.href);
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.queryByText("Home")).toBeNull();
  });
});

describe("QuickChartShell signed-in product chrome", () => {
  it("renders the app nav and drops signup CTAs", () => {
    render(
      <QuickChartShell eyebrow="Quick Chart" title="See anyone's real chart." authed>
        <p>form</p>
      </QuickChartShell>,
    );
    expect(screen.getByRole("navigation")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/app");
    expect(screen.getByRole("link", { name: "Free chart" }).getAttribute("href")).toBe("/chart");
    expect(screen.queryByRole("link", { name: MARKETING_NAV_LOGIN.label })).toBeNull();
    expect(screen.queryByRole("link", { name: "Sign up to build your galaxy →" })).toBeNull();
    expect(screen.queryByRole("link", { name: "← My constellation" })).toBeNull();
  });
});
