// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConnectAcceptView } from "./connect-accept-view";
import {
  CONNECT_CTA_SIGNUP,
  CONNECT_SHARING,
  CONNECT_WHAT_GALAXIA_IS,
} from "../lib/connect-invite";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: unknown }) => (
    <a href={href}>{children as never}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined }),
}));

vi.mock("../lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
    rpc: () => Promise.resolve({ data: null, error: null }),
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) }),
  }),
}));

afterEach(() => {
  cleanup();
});

describe("ConnectAcceptView logged-out pending landing", () => {
  it("shows layer-one framing, the locked disclosure, and the signup CTA", async () => {
    render(
      <ConnectAcceptView
        token={"ab".repeat(16)}
        landing={{
          inviterName: "Alex",
          relation: "partner",
          status: "pending",
          expiresAt: "2099-01-01T00:00:00Z",
        }}
      />,
    );
    expect(await screen.findByText("Alex invited you to connect as their partner.")).toBeTruthy();
    expect(screen.getByText(CONNECT_WHAT_GALAXIA_IS)).toBeTruthy();
    expect(screen.getByText(CONNECT_SHARING)).toBeTruthy();
    const cta = screen.getByRole("link", { name: CONNECT_CTA_SIGNUP });
    expect(cta.getAttribute("href")).toContain("/signup?next=");
    expect(cta.getAttribute("href")).toContain("connect");
    expect(screen.queryByText(/astrology app/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /Accept/i })).toBeNull();
  });
});
