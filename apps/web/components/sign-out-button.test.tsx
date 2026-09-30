// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { THIS_WEEK_SEEN_KEY_PREFIX } from "../lib/this-week-seen";
import { SignOutButton } from "./sign-out-button";

const signOut = vi.fn(async () => ({ error: null }));
const push = vi.fn();
const refresh = vi.fn();

vi.mock("../lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ auth: { signOut } }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

const SEEN_KEY = `${THIS_WEEK_SEEN_KEY_PREFIX}owner-1`;

beforeEach(() => {
  signOut.mockClear();
  signOut.mockResolvedValue({ error: null });
  push.mockClear();
  refresh.mockClear();
  window.localStorage.clear();
  window.localStorage.setItem(SEEN_KEY, "[{\"id\":\"saturn-trine\"}]");
  window.localStorage.setItem("galaxia.other", "keep");
});

afterEach(() => {
  cleanup();
});

describe("SignOutButton", () => {
  it("clears the this-week-seen key after sign-out succeeds", async () => {
    render(<SignOutButton />);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(window.localStorage.getItem(SEEN_KEY)).toBeNull());
    expect(window.localStorage.getItem("galaxia.other")).toBe("keep");
    expect(push).toHaveBeenCalledWith("/login");
  });

  it("keeps the ledger when sign-out fails", async () => {
    signOut.mockResolvedValueOnce({ error: { message: "network" } });
    render(<SignOutButton />);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await screen.findByText("Sign-out failed. Try again.");
    expect(window.localStorage.getItem(SEEN_KEY)).not.toBeNull();
    expect(push).not.toHaveBeenCalled();
  });
});
