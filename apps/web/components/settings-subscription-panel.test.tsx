// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GALAXIA_HELP_EMAIL } from "@galaxia/core";
import { SETTINGS_SUBSCRIPTION_COPY } from "../lib/settings-subscription";

const loadSettingsSubscription = vi.fn();

vi.mock("../lib/settings-subscription", async () => {
  const actual = await vi.importActual<typeof import("../lib/settings-subscription")>(
    "../lib/settings-subscription"
  );
  return {
    ...actual,
    loadSettingsSubscription: (...args: unknown[]) => loadSettingsSubscription(...args)
  };
});

vi.mock("../lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: { getUser: vi.fn() },
    from: vi.fn()
  })
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: string }) => (
    <a href={href}>{children}</a>
  )
}));

import { SettingsSubscriptionPanel } from "./settings-subscription-panel";

afterEach(() => {
  cleanup();
  loadSettingsSubscription.mockReset();
});

describe("SettingsSubscriptionPanel", () => {
  it("resolves a trialing profile within the load, with days remaining and a manage link", async () => {
    loadSettingsSubscription.mockResolvedValue({
      kind: "ready",
      snapshot: {
        status: "trialing",
        trialEndsAt: "2099-09-20T12:00:00.000Z",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        comped: false,
        plan: null
      }
    });

    render(<SettingsSubscriptionPanel />);
    expect(screen.getByText(SETTINGS_SUBSCRIPTION_COPY.checking)).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText("Trial")).toBeTruthy();
    });
    expect(screen.getByText(/days remaining/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Manage billing" }).getAttribute("href")).toContain(
      GALAXIA_HELP_EMAIL
    );
    expect(screen.queryByText(/loading subscription/i)).toBeNull();
  });

  it("resolves a paid profile with plan name, renewal date, cancel, and manage billing", async () => {
    loadSettingsSubscription.mockResolvedValue({
      kind: "ready",
      snapshot: {
        status: "active",
        trialEndsAt: null,
        currentPeriodEnd: "2099-10-14T12:00:00.000Z",
        cancelAtPeriodEnd: false,
        comped: false,
        plan: "monthly"
      }
    });

    render(<SettingsSubscriptionPanel />);
    await waitFor(() => {
      expect(screen.getByText("Monthly")).toBeTruthy();
    });
    expect(screen.getByText(/^Active\. Renews /)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Cancel subscription" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Manage billing" })).toBeTruthy();
  });

  it("renders a readable message when the fetch fails, never a spinner", async () => {
    loadSettingsSubscription.mockResolvedValue({ kind: "error", reason: "error" });

    render(<SettingsSubscriptionPanel />);
    await waitFor(() => {
      expect(screen.getByText(SETTINGS_SUBSCRIPTION_COPY.error)).toBeTruthy();
    });
    expect(screen.getByText(SETTINGS_SUBSCRIPTION_COPY.error).className).toContain("error");
    expect(screen.queryByText(SETTINGS_SUBSCRIPTION_COPY.checking)).toBeNull();
    expect(screen.getByRole("link", { name: "Manage billing" })).toBeTruthy();
  });

  it("renders a readable message when the fetch times out", async () => {
    loadSettingsSubscription.mockResolvedValue({ kind: "error", reason: "timeout" });

    render(<SettingsSubscriptionPanel />);
    await waitFor(() => {
      expect(screen.getByText(SETTINGS_SUBSCRIPTION_COPY.timeout)).toBeTruthy();
    });
    expect(screen.getByText(new RegExp(GALAXIA_HELP_EMAIL.replaceAll(".", "\\.")))).toBeTruthy();
  });
});
