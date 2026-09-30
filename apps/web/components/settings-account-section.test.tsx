// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ACCOUNT_DELETE_MODAL_COPY, ACCOUNT_SECTION_COPY } from "../lib/account-data";
import { SettingsAccountSection } from "./settings-account-section";

const signOut = vi.fn(async () => ({ error: null }));

vi.mock("../lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ auth: { signOut } })
}));

const originalLocation = window.location;

beforeEach(() => {
  signOut.mockClear();
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { href: "/app/settings" }
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  Object.defineProperty(window, "location", { configurable: true, writable: true, value: originalLocation });
});

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    headers: new Headers()
  } as unknown as Response;
}

describe("Settings Account section", () => {
  it("offers both controls with the delete button styled as the destructive one", () => {
    render(<SettingsAccountSection subscriptionStatus={null} />);
    expect(screen.getByRole("heading", { name: ACCOUNT_SECTION_COPY.title })).toBeTruthy();
    expect(screen.getByRole("button", { name: ACCOUNT_SECTION_COPY.exportButton })).toBeTruthy();
    const destructive = screen.getByRole("button", { name: ACCOUNT_SECTION_COPY.deleteButton });
    expect(destructive.style.color).toBe("var(--rose)");
    expect(destructive.getAttribute("aria-haspopup")).toBe("dialog");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows the approved confirmation wording in a modal", () => {
    render(<SettingsAccountSection subscriptionStatus={null} />);
    fireEvent.click(screen.getByRole("button", { name: ACCOUNT_SECTION_COPY.deleteButton }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(
      screen.getByText(
        "This will permanently delete your account, your constellation, and everything in it. This cannot be undone."
      )
    ).toBeTruthy();
    expect(screen.getByText(ACCOUNT_DELETE_MODAL_COPY.typePrompt)).toBeTruthy();
  });

  it("keeps the confirm button disabled until DELETE and password are entered", () => {
    render(<SettingsAccountSection subscriptionStatus={null} />);
    fireEvent.click(screen.getByRole("button", { name: ACCOUNT_SECTION_COPY.deleteButton }));
    const confirm = screen.getByRole("button", {
      name: ACCOUNT_DELETE_MODAL_COPY.confirmButton
    }) as HTMLButtonElement;
    const input = screen.getByPlaceholderText("DELETE") as HTMLInputElement;
    const password = document.getElementById(`${input.id}-password`) as HTMLInputElement;

    expect(confirm.disabled).toBe(true);
    fireEvent.change(input, { target: { value: "DELET" } });
    expect(confirm.disabled).toBe(true);
    fireEvent.change(input, { target: { value: "DELETE" } });
    expect(confirm.disabled).toBe(true);
    fireEvent.change(password, { target: { value: "secret" } });
    expect(confirm.disabled).toBe(false);
  });

  it("signs out and lands on the homepage once the purge succeeds", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    render(<SettingsAccountSection subscriptionStatus={null} />);
    fireEvent.click(screen.getByRole("button", { name: ACCOUNT_SECTION_COPY.deleteButton }));
    fireEvent.change(screen.getByPlaceholderText("DELETE"), { target: { value: "DELETE" } });
    const deleteInput = screen.getByPlaceholderText("DELETE") as HTMLInputElement;
    fireEvent.change(document.getElementById(`${deleteInput.id}-password`)!, {
      target: { value: "secret" }
    });
    fireEvent.click(screen.getByRole("button", { name: ACCOUNT_DELETE_MODAL_COPY.confirmButton }));

    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/account/delete",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ confirmation: "DELETE", password: "secret" })
      })
    );
    expect(window.location.href).toBe("/");
  });

  it("shows the failure and keeps the session when the purge fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ error: "We could not delete your account." }, 500))
    );

    render(<SettingsAccountSection subscriptionStatus={null} />);
    fireEvent.click(screen.getByRole("button", { name: ACCOUNT_SECTION_COPY.deleteButton }));
    fireEvent.change(screen.getByPlaceholderText("DELETE"), { target: { value: "DELETE" } });
    const deleteInput = screen.getByPlaceholderText("DELETE") as HTMLInputElement;
    fireEvent.change(document.getElementById(`${deleteInput.id}-password`)!, {
      target: { value: "secret" }
    });
    fireEvent.click(screen.getByRole("button", { name: ACCOUNT_DELETE_MODAL_COPY.confirmButton }));

    await screen.findByText("We could not delete your account.");
    expect(signOut).not.toHaveBeenCalled();
    expect(window.location.href).toBe("/app/settings");
  });

  it("surfaces the hourly export limit instead of a silent no-op", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ error: "You can download one export an hour." }, 429))
    );

    render(<SettingsAccountSection subscriptionStatus={null} />);
    fireEvent.click(screen.getByRole("button", { name: ACCOUNT_SECTION_COPY.exportButton }));
    await screen.findByText("You can download one export an hour.");
  });

  it("warns a paying account to cancel billing first, without blocking the delete", () => {
    render(<SettingsAccountSection subscriptionStatus="active" />);
    expect(screen.getByText(/does not cancel billing/)).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: ACCOUNT_SECTION_COPY.deleteButton }) as HTMLButtonElement)
        .disabled
    ).toBe(false);
  });

  it("closes the modal on Escape", () => {
    render(<SettingsAccountSection subscriptionStatus={null} />);
    fireEvent.click(screen.getByRole("button", { name: ACCOUNT_SECTION_COPY.deleteButton }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
