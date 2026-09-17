// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmailEditorForm } from "./email-editor-form";
import { DEFAULT_EMAIL_COPY } from "../../lib/email-copy";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() })
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("EmailEditorForm", () => {
  it("saves editable fields through PATCH and can send a test", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, to: "admin@example.com" }) });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <EmailEditorForm
        kind="trial.day1"
        category="automation"
        editableFields={["subject", "preview", "paragraphs", "cta_label", "cta_path_key"]}
        enabled
        copy={DEFAULT_EMAIL_COPY["trial.day1"]}
        canTest
      />
    );

    fireEvent.change(screen.getByDisplayValue("{{circleSubject}}"), {
      target: { value: "{{circleSubject}}" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/admin/emails/trial.day1");
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(expect.objectContaining({ method: "PATCH" }));

    fireEvent.click(screen.getByRole("button", { name: "Send to me" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/admin/emails/trial.day1/test");
  });

  it("does not offer Save on a system email", () => {
    render(
      <EmailEditorForm
        kind="auth.signup"
        category="system"
        editableFields={[]}
        enabled
        copy={{
          subject: "Confirm your Galaxia account",
          preview: "Confirm the address so you can sign in.",
          paragraphs: [],
          ctaLabel: null,
          ctaPathKey: null,
          firstEmailLine: null
        }}
        canTest={false}
      />
    );
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    expect(screen.getByText(/Supabase Auth/)).toBeTruthy();
  });
});
