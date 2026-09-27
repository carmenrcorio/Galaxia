// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EMAIL_CHANGE_COPY,
  PASSWORD_CHANGE_COPY,
  PASSWORD_MISMATCH_ERROR,
  PASSWORD_TOO_SHORT_ERROR
} from "@galaxia/core";

const getSession = vi.fn();
const updateUser = vi.fn();

vi.mock("../lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      getSession: (...args: unknown[]) => getSession(...args),
      updateUser: (...args: unknown[]) => updateUser(...args)
    }
  })
}));

import { SettingsAccountCredentials } from "./settings-account-credentials";

const ACCOUNT_EMAIL = "carmen@example.com";

function openPasswordSection() {
  fireEvent.click(screen.getByRole("button", { name: PASSWORD_CHANGE_COPY.sectionLabel }));
}

function openEmailSection() {
  fireEvent.click(screen.getByRole("button", { name: EMAIL_CHANGE_COPY.sectionLabel }));
}

function typePassword(next: string, confirm: string) {
  fireEvent.change(screen.getByLabelText(PASSWORD_CHANGE_COPY.newLabel), { target: { value: next } });
  fireEvent.change(screen.getByLabelText(PASSWORD_CHANGE_COPY.confirmLabel), { target: { value: confirm } });
}

beforeEach(() => {
  getSession.mockResolvedValue({ data: { session: { access_token: "live" } } });
  updateUser.mockResolvedValue({ data: {}, error: null });
});

afterEach(() => {
  cleanup();
  getSession.mockReset();
  updateUser.mockReset();
});

describe("SettingsAccountCredentials sections", () => {
  it("offers both sections collapsed, with no fields until one is opened", () => {
    render(<SettingsAccountCredentials accountEmail={ACCOUNT_EMAIL} />);

    const passwordToggle = screen.getByRole("button", { name: PASSWORD_CHANGE_COPY.sectionLabel });
    const emailToggle = screen.getByRole("button", { name: EMAIL_CHANGE_COPY.sectionLabel });
    expect(passwordToggle.getAttribute("aria-expanded")).toBe("false");
    expect(emailToggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByLabelText(PASSWORD_CHANGE_COPY.newLabel)).toBeNull();
    expect(screen.queryByLabelText(EMAIL_CHANGE_COPY.newLabel)).toBeNull();
  });

  it("expands and collapses each section independently", () => {
    render(<SettingsAccountCredentials accountEmail={ACCOUNT_EMAIL} />);

    openPasswordSection();
    expect(screen.getByLabelText(PASSWORD_CHANGE_COPY.newLabel)).toBeTruthy();
    expect(screen.queryByLabelText(EMAIL_CHANGE_COPY.newLabel)).toBeNull();

    openEmailSection();
    expect(screen.getByLabelText(EMAIL_CHANGE_COPY.newLabel)).toBeTruthy();

    openPasswordSection();
    expect(screen.queryByLabelText(PASSWORD_CHANGE_COPY.newLabel)).toBeNull();
    expect(screen.getByLabelText(EMAIL_CHANGE_COPY.newLabel)).toBeTruthy();
  });

  it("names the address the person signs in with", () => {
    render(<SettingsAccountCredentials accountEmail={ACCOUNT_EMAIL} />);
    expect(screen.getByText(new RegExp(ACCOUNT_EMAIL))).toBeTruthy();
  });
});

describe("password change", () => {
  it("updates the password, confirms it, and clears both fields", async () => {
    render(<SettingsAccountCredentials accountEmail={ACCOUNT_EMAIL} />);
    openPasswordSection();
    typePassword("a-quiet-galaxy", "a-quiet-galaxy");

    fireEvent.click(screen.getByRole("button", { name: PASSWORD_CHANGE_COPY.submit }));

    await waitFor(() => {
      expect(screen.getByText(PASSWORD_CHANGE_COPY.success)).toBeTruthy();
    });
    expect(updateUser).toHaveBeenCalledWith({ password: "a-quiet-galaxy" });
    expect((screen.getByLabelText(PASSWORD_CHANGE_COPY.newLabel) as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText(PASSWORD_CHANGE_COPY.confirmLabel) as HTMLInputElement).value).toBe("");
  });

  it("refuses a password under the minimum without calling the service", async () => {
    render(<SettingsAccountCredentials accountEmail={ACCOUNT_EMAIL} />);
    openPasswordSection();
    typePassword("short", "short");

    fireEvent.click(screen.getByRole("button", { name: PASSWORD_CHANGE_COPY.submit }));

    await waitFor(() => {
      expect(screen.getByText(PASSWORD_TOO_SHORT_ERROR)).toBeTruthy();
    });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("refuses a mismatched pair without calling the service", async () => {
    render(<SettingsAccountCredentials accountEmail={ACCOUNT_EMAIL} />);
    openPasswordSection();
    typePassword("a-quiet-galaxy", "a-quiet-galaxies");

    fireEvent.click(screen.getByRole("button", { name: PASSWORD_CHANGE_COPY.submit }));

    await waitFor(() => {
      expect(screen.getByText(PASSWORD_MISMATCH_ERROR)).toBeTruthy();
    });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("keeps the submit button disabled while either field is empty", () => {
    render(<SettingsAccountCredentials accountEmail={ACCOUNT_EMAIL} />);
    openPasswordSection();

    const submit = screen.getByRole("button", { name: PASSWORD_CHANGE_COPY.submit }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    typePassword("a-quiet-galaxy", "");
    expect(submit.disabled).toBe(true);
    typePassword("a-quiet-galaxy", "a-quiet-galaxy");
    expect(submit.disabled).toBe(false);
  });

  it("shows the service's own rejection verbatim and keeps what was typed", async () => {
    updateUser.mockResolvedValue({
      data: {},
      error: { message: "This password is known to be leaked. Choose a different one." }
    });
    render(<SettingsAccountCredentials accountEmail={ACCOUNT_EMAIL} />);
    openPasswordSection();
    typePassword("password1234", "password1234");

    fireEvent.click(screen.getByRole("button", { name: PASSWORD_CHANGE_COPY.submit }));

    await waitFor(() => {
      expect(
        screen.getByText("This password is known to be leaked. Choose a different one.")
      ).toBeTruthy();
    });
    expect((screen.getByLabelText(PASSWORD_CHANGE_COPY.newLabel) as HTMLInputElement).value).toBe(
      "password1234"
    );
  });

  it("says to sign in again when the session has gone, and does not write", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    render(<SettingsAccountCredentials accountEmail={ACCOUNT_EMAIL} />);
    openPasswordSection();
    typePassword("a-quiet-galaxy", "a-quiet-galaxy");

    fireEvent.click(screen.getByRole("button", { name: PASSWORD_CHANGE_COPY.submit }));

    await waitFor(() => {
      expect(screen.getByText(PASSWORD_CHANGE_COPY.sessionExpired)).toBeTruthy();
    });
    expect(updateUser).not.toHaveBeenCalled();
  });
});

describe("email change", () => {
  it("sends the confirmation, names both addresses, and clears the field", async () => {
    render(<SettingsAccountCredentials accountEmail={ACCOUNT_EMAIL} />);
    openEmailSection();
    fireEvent.change(screen.getByLabelText(EMAIL_CHANGE_COPY.newLabel), {
      target: { value: "  New.Address@Example.com " }
    });

    fireEvent.click(screen.getByRole("button", { name: EMAIL_CHANGE_COPY.submit }));

    await waitFor(() => {
      expect(screen.getByText(/Check your new email to confirm the change\./)).toBeTruthy();
    });
    expect(updateUser).toHaveBeenCalledWith({ email: "new.address@example.com" });
    const message = screen.getByText(/Check your new email to confirm the change\./).textContent ?? "";
    expect(message).toContain("new.address@example.com");
    expect(message).toContain(ACCOUNT_EMAIL);
    expect((screen.getByLabelText(EMAIL_CHANGE_COPY.newLabel) as HTMLInputElement).value).toBe("");
  });

  it("refuses a malformed address without calling the service", async () => {
    render(<SettingsAccountCredentials accountEmail={ACCOUNT_EMAIL} />);
    openEmailSection();
    fireEvent.change(screen.getByLabelText(EMAIL_CHANGE_COPY.newLabel), {
      target: { value: "not-an-address" }
    });

    fireEvent.click(screen.getByRole("button", { name: EMAIL_CHANGE_COPY.submit }));

    await waitFor(() => {
      expect(screen.getByText(EMAIL_CHANGE_COPY.invalidError)).toBeTruthy();
    });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("refuses the address already on the account", async () => {
    render(<SettingsAccountCredentials accountEmail={ACCOUNT_EMAIL} />);
    openEmailSection();
    fireEvent.change(screen.getByLabelText(EMAIL_CHANGE_COPY.newLabel), {
      target: { value: ACCOUNT_EMAIL.toUpperCase() }
    });

    fireEvent.click(screen.getByRole("button", { name: EMAIL_CHANGE_COPY.submit }));

    await waitFor(() => {
      expect(screen.getByText(EMAIL_CHANGE_COPY.sameEmailError)).toBeTruthy();
    });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("keeps the submit button disabled while the field is blank", () => {
    render(<SettingsAccountCredentials accountEmail={ACCOUNT_EMAIL} />);
    openEmailSection();

    const submit = screen.getByRole("button", { name: EMAIL_CHANGE_COPY.submit }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(EMAIL_CHANGE_COPY.newLabel), { target: { value: "   " } });
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(EMAIL_CHANGE_COPY.newLabel), {
      target: { value: "new@example.com" }
    });
    expect(submit.disabled).toBe(false);
  });

  it("shows the service's own rejection verbatim", async () => {
    updateUser.mockResolvedValue({
      data: {},
      error: { message: "A user with this email address has already been registered" }
    });
    render(<SettingsAccountCredentials accountEmail={ACCOUNT_EMAIL} />);
    openEmailSection();
    fireEvent.change(screen.getByLabelText(EMAIL_CHANGE_COPY.newLabel), {
      target: { value: "taken@example.com" }
    });

    fireEvent.click(screen.getByRole("button", { name: EMAIL_CHANGE_COPY.submit }));

    await waitFor(() => {
      expect(
        screen.getByText("A user with this email address has already been registered")
      ).toBeTruthy();
    });
  });

  it("says to sign in again when the session has gone, and does not write", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    render(<SettingsAccountCredentials accountEmail={ACCOUNT_EMAIL} />);
    openEmailSection();
    fireEvent.change(screen.getByLabelText(EMAIL_CHANGE_COPY.newLabel), {
      target: { value: "new@example.com" }
    });

    fireEvent.click(screen.getByRole("button", { name: EMAIL_CHANGE_COPY.submit }));

    await waitFor(() => {
      expect(screen.getByText(EMAIL_CHANGE_COPY.sessionExpired)).toBeTruthy();
    });
    expect(updateUser).not.toHaveBeenCalled();
  });
});
