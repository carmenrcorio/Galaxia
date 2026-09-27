// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "./login-form";

const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  resetPasswordForEmail: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() })
}));

vi.mock("../lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ auth })
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("LoginForm password recovery", () => {
  it("reveals a reset email form and sends a Supabase recovery email", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    render(<LoginForm nextPath="/start" />);

    expect(screen.queryByLabelText("Email for password reset")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));

    fireEvent.change(screen.getByLabelText("Email for password reset"), {
      target: { value: "reader@example.com" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    await waitFor(() =>
      expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(
        "reader@example.com",
        { redirectTo: "http://localhost:3000/auth/callback?next=/account" }
      )
    );
    expect(await screen.findByText("Check your email for a reset link.")).toBeTruthy();
  });

  it("links the free-trial signup copy to signup", () => {
    render(<LoginForm nextPath="/start" />);

    const signup = screen.getByRole("link", { name: "Start 14 days free" });
    expect(signup.getAttribute("href")).toBe("/signup");
    expect(signup.parentElement?.textContent).toBe("No account? Start 14 days free");
  });
});
