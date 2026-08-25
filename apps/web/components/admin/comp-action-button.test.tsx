// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CompActionButton } from "./comp-action-button";

/**
 * Regression coverage for the Phase 0 stuck-pending bug: `CompActionButton`
 * used to only clear its `pending` flag on the error path, so a SUCCESSFUL
 * grant/revoke left the button permanently disabled — `router.refresh()`
 * re-renders this component in place (never remounts it), so `pending`
 * survived the refresh while `comped` flipped underneath it, relabeling the
 * still-disabled button for the opposite action forever.
 *
 * No live database, no real network, no real router — `fetch` and
 * `next/navigation`'s `useRouter` are mocked. This proves the CLIENT
 * behavior only; the live-DB proof that the revoke write path itself is
 * correct is `lib/admin/comp-verify.test.ts`.
 */

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh })
}));

function renderButton(props: Partial<Parameters<typeof CompActionButton>[0]> = {}) {
  const defaultProps = {
    userId: "user-1",
    email: "person@example.com",
    comped: false,
    subscriptionStatus: null as string | null,
    trialEndsAt: null as string | null
  };
  return render(<CompActionButton {...defaultProps} {...props} />);
}

function getButton() {
  return screen.getByRole("button") as HTMLButtonElement;
}

beforeEach(() => {
  refresh.mockClear();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("CompActionButton — pending clears after the request settles (success path)", () => {
  it("re-enables with the CORRECT post-refresh label once router.refresh() delivers the new comped, never stuck disabled/mislabeled", async () => {
    let resolveFetch!: (value: { ok: boolean; json: () => Promise<unknown> }) => void;
    const fetchMock = vi.fn(
      () =>
        new Promise<{ ok: boolean; json: () => Promise<unknown> }>((resolve) => {
          resolveFetch = resolve;
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    const { rerender } = renderButton({ comped: false });

    // Not comped yet -> offers "Grant comp", enabled.
    expect(getButton().textContent).toBe("Grant comp");
    expect(getButton().disabled).toBe(false);

    fireEvent.click(getButton());

    // The POST is genuinely in flight: disabled + "Granting…".
    await waitFor(() => expect(getButton().disabled).toBe(true));
    expect(getButton().textContent).toBe("Granting…");
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/users/user-1/comp/grant", { method: "POST" });

    resolveFetch({ ok: true, json: async () => ({}) });

    // The fetch resolved; router.refresh() must have been triggered exactly
    // once (never fired again from some leftover pending state).
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));

    // Simulate the server delivering the row's fresh `comped` prop after
    // router.refresh() resolves. (A bare mock `refresh` resolves the
    // transition synchronously, unlike the real Next.js router — which is
    // why this test doesn't assert on the split-second in between; what
    // matters, and what the old code got wrong, is what happens next.)
    rerender(
      <CompActionButton
        userId="user-1"
        email="person@example.com"
        comped
        subscriptionStatus={null}
        trialEndsAt={null}
      />
    );

    // The button must end up ENABLED and offering the opposite action —
    // never left disabled, and never stuck saying "Granting…"/"Revoking…"
    // once the request has fully settled.
    await waitFor(() => {
      expect(getButton().disabled).toBe(false);
      expect(getButton().textContent).toBe("Revoke comp");
    });
  });

  it("the same holds in the other direction: a successful revoke re-enables to 'Grant comp'", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    );

    const { rerender } = renderButton({ comped: true });
    expect(getButton().textContent).toBe("Revoke comp");

    fireEvent.click(getButton());

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));

    rerender(
      <CompActionButton
        userId="user-1"
        email="person@example.com"
        comped={false}
        subscriptionStatus={null}
        trialEndsAt={null}
      />
    );

    await waitFor(() => {
      expect(getButton().disabled).toBe(false);
      expect(getButton().textContent).toBe("Grant comp");
    });
  });
});

describe("CompActionButton — pending clears after the request settles (error paths)", () => {
  it("a non-ok response clears pending, re-enables the SAME action, surfaces the error, and never calls router.refresh()", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "This account is not comped." })
      })
    );

    renderButton({ comped: false });
    fireEvent.click(getButton());

    await waitFor(() => {
      expect(getButton().disabled).toBe(false);
      expect(getButton().textContent).toBe("Grant comp");
    });
    expect(screen.getByText("This account is not comped.")).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("a rejected fetch (network error) clears pending and re-enables the button", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    renderButton({ comped: true });
    fireEvent.click(getButton());

    await waitFor(() => {
      expect(getButton().disabled).toBe(false);
      expect(getButton().textContent).toBe("Revoke comp");
    });
    expect(screen.getByText("Couldn't revoke comp access. Please try again.")).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });
});
