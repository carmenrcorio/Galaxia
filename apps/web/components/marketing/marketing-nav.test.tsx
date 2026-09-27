// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MARKETING_NAV_LOGIN,
  MARKETING_NAV_SIGNUP,
} from "../../lib/nav-links";
import { MarketingNav } from "./marketing-nav";

const sessionMock = vi.hoisted(() => ({
  value: { userId: null as string | null, loading: true },
}));

vi.mock("../../lib/use-session", () => ({
  useSession: () => sessionMock.value,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: unknown }) => (
    <a href={href} {...props}>{children as never}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/pricing",
}));

beforeEach(() => {
  sessionMock.value = { userId: null, loading: true };
});

afterEach(() => {
  cleanup();
});

describe("MarketingNav auth-aware chrome", () => {
  it("renders anonymous actions while the client session is loading", () => {
    render(<MarketingNav />);

    expect(screen.getByRole("link", { name: MARKETING_NAV_LOGIN.label })).toBeTruthy();
    expect(screen.getByRole("link", { name: MARKETING_NAV_SIGNUP.label })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Home" })).toBeNull();
  });

  it("keeps anonymous actions when there is no valid session", () => {
    sessionMock.value = { userId: null, loading: false };
    render(<MarketingNav />);

    expect(screen.getByRole("link", { name: MARKETING_NAV_LOGIN.label })).toBeTruthy();
    expect(screen.getByRole("link", { name: MARKETING_NAV_SIGNUP.label })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Account" })).toBeNull();
  });

  it("renders the authenticated app nav when a valid session exists", () => {
    sessionMock.value = { userId: "user-1", loading: false };
    render(<MarketingNav />);

    expect(screen.getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/app");
    expect(screen.getByRole("link", { name: "Account" }).getAttribute("href")).toBe("/account");
    expect(screen.queryByRole("link", { name: MARKETING_NAV_LOGIN.label })).toBeNull();
    expect(screen.queryByRole("link", { name: MARKETING_NAV_SIGNUP.label })).toBeNull();
  });
});
