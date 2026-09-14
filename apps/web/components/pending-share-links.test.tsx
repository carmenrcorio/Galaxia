// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SHARE_PENDING_EMPTY,
  SHARE_PENDING_NATAL_FALLBACK,
  SHARE_PENDING_TITLE,
  SHARE_REVOKE_LABEL,
} from "../lib/quick-share";
import { PendingShareLinks } from "./pending-share-links";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("PendingShareLinks revoke", () => {
  it("lists live natal shares without putting the token in visible copy, then revokes", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/quick-share" && !init?.method) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            shares: [
              {
                token: "secret-token",
                kind: "single",
                created_at: "2026-09-14T00:00:00.000Z",
                expires_at: "2026-09-28T00:00:00.000Z",
                displayDate: "15 June 1990",
                birthPlace: "New York, NY",
              },
            ],
          }),
        };
      }
      if (url === "/api/quick-share/secret-token" && init?.method === "DELETE") {
        return { ok: true, status: 200, json: async () => ({ ok: true }) };
      }
      throw new Error(`unexpected fetch ${init?.method ?? "GET"} ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<PendingShareLinks />);
    expect(screen.getByText(SHARE_PENDING_TITLE)).toBeTruthy();
    await screen.findByText("15 June 1990");
    expect(screen.getByText(/New York, NY/)).toBeTruthy();
    expect(screen.queryByText("secret-token")).toBeNull();
    expect(screen.queryByText(SHARE_PENDING_EMPTY)).toBeNull();
    expect(screen.queryByText(SHARE_PENDING_NATAL_FALLBACK)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Revoke share link for 15 June 1990" }));
    await waitFor(() => expect(screen.getByText(SHARE_PENDING_EMPTY)).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledWith("/api/quick-share/secret-token", { method: "DELETE" });
  });
});
