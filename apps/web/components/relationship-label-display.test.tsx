// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SettingsPage from "../app/app/settings/page";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: unknown }) => (
    <a href={href}>{children as never}</a>
  ),
}));

const PEOPLE = [
  { id: "1", display_name: "Ada", relation: "partner" },
  { id: "2", display_name: "Bea", relation: "friend" },
  { id: "3", display_name: "Cara", relation: "Daughter" },
  { id: "4", display_name: "Dee", relation: "Cousin" },
];

const INVITES = [
  {
    token: "ab".repeat(16),
    relationship_type: "Daughter",
    expires_at: "2099-01-01T00:00:00.000Z",
    person_id: null,
  },
];

function payload(table: string): { data: unknown; error: null } {
  if (table === "people") return { data: PEOPLE, error: null };
  if (table === "invites") return { data: INVITES, error: null };
  if (table === "profiles") {
    return {
      data: {
        house_system: "placidus",
        daily_nudge_emails_enabled: true,
        weekly_constellation_letter_enabled: true,
        relational_transit_alerts: "all",
        subscription_status: "none",
        trial_ends_at: null,
        current_period_end: null,
        cancel_at_period_end: false,
        comped: false,
        plan: null,
      },
      error: null,
    };
  }
  return { data: [], error: null };
}

function chainFor(table: string) {
  const chain: {
    select: () => typeof chain;
    eq: () => typeof chain;
    order: () => typeof chain;
    in: () => typeof chain;
    maybeSingle: () => Promise<{ data: unknown; error: null }>;
    then: (
      onFulfilled: (value: { data: unknown; error: null }) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise<unknown>;
  } = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    in: () => chain,
    maybeSingle: () => Promise.resolve(payload(table)),
    then: (onFulfilled, onRejected) => Promise.resolve(payload(table)).then(onFulfilled, onRejected),
  };
  return chain;
}

vi.mock("../lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "user-1", email: "ada@example.com" } } }),
    },
    from: (table: string) => chainFor(table),
  }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Settings relationship labels", () => {
  it("shows Your people and pending invite labels in lowercase", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        status: 401,
        ok: false,
        json: async () => ({}),
      }))
    );

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Your people (4)" })).toBeTruthy();
    });

    expect(screen.getByText("partner")).toBeTruthy();
    expect(screen.getByText("friend")).toBeTruthy();
    expect(screen.getAllByText("daughter").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("cousin")).toBeTruthy();
    expect(screen.queryByText("Daughter")).toBeNull();
    expect(screen.queryByText("Cousin")).toBeNull();
    expect(screen.queryByText("Partner")).toBeNull();
    expect(screen.queryByText("Friend")).toBeNull();
  });
});
