// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ASK_BIRTH_DATA_REUSED, ASK_BIRTH_DATA_SHARE, askBirthDataAskCopy, askBirthDataSendCopy } from "@galaxia/core";
import { AskBirthData } from "./ask-birth-data";

let pending: { token: string; expires_at: string | null } | null = null;
const inserted: Record<string, unknown>[] = [];

vi.mock("../lib/env", () => ({
  publicEnv: { siteUrl: "https://galaxiamea.com", supabaseUrl: "", supabaseAnonKey: "" }
}));

vi.mock("../lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    from: (table: string) => {
      if (table !== "invites") throw new Error(table);
      const chain: Record<string, unknown> = {
        select() { return chain; },
        eq() { return chain; },
        order() { return chain; },
        limit() { return chain; },
        maybeSingle: async () => ({ data: pending, error: null }),
        insert: async (row: Record<string, unknown>) => {
          inserted.push(row);
          pending = { token: String(row.token), expires_at: (row.expires_at as string) ?? null };
          return { error: null };
        }
      };
      return chain;
    }
  })
}));

afterEach(() => {
  cleanup();
  pending = null;
  inserted.length = 0;
});

describe("AskBirthData", () => {
  it("shows the existing ask label, then send-this-to after creating a link", async () => {
    render(<AskBirthData personId="p1" personName="Maya" userId="u1" />);
    fireEvent.click(await screen.findByRole("button", { name: askBirthDataAskCopy("Maya") }));
    await waitFor(() => {
      expect(screen.getByText(askBirthDataSendCopy("Maya"))).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: ASK_BIRTH_DATA_SHARE })).toBeTruthy();
    expect(inserted).toHaveLength(1);
    expect(inserted[0]?.kind).toBe("birth_data");
    expect(inserted[0]?.expires_at).toBeTruthy();
  });

  it("reuses a pending invite instead of inserting again", async () => {
    pending = { token: "alreadythere", expires_at: null };
    render(<AskBirthData personId="p1" personName="Maya" userId="u1" />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("https://galaxiamea.com/invite/alreadythere")).toBeTruthy();
    });
    expect(screen.getByText(ASK_BIRTH_DATA_REUSED)).toBeTruthy();
    expect(inserted).toEqual([]);
  });

  it("renders nothing for a minor", () => {
    const { container } = render(
      <AskBirthData personId="p1" personName="Kai" userId="u1" isMinor />
    );
    expect(container.textContent).toBe("");
  });
});
