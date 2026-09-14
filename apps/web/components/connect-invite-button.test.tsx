// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONNECT_INVITE_ACTION } from "../lib/connect-invite";
import { ConnectInviteButton } from "./connect-invite-button";

vi.mock("../lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    rpc: () => Promise.resolve({ data: null, error: null }),
  }),
}));

afterEach(() => {
  cleanup();
});

const livingFriend = {
  id: "p-living",
  display_name: "Sam",
  is_self: false,
  relation: "friend",
  is_minor: false,
  birth_date: "1987-12-29",
  birth_precision: "date" as const,
  linked_user_id: null,
  passed_at: null,
};

describe("ConnectInviteButton memorial and ancient guard", () => {
  it("renders Invite to connect for a living adult", () => {
    render(<ConnectInviteButton person={livingFriend} />);
    expect(screen.getByRole("button", { name: CONNECT_INVITE_ACTION })).toBeTruthy();
  });

  it("does not put the invite action in the DOM for a remembered person", () => {
    const { container } = render(
      <ConnectInviteButton
        person={{ ...livingFriend, id: "p-calita", display_name: "Calita", passed_at: "2024-11-02T00:00:00.000Z" }}
      />,
    );
    expect(screen.queryByRole("button", { name: CONNECT_INVITE_ACTION })).toBeNull();
    expect(container.textContent).toBe("");
  });

  it("does not put the invite action in the DOM for an ancestor ancient-light tag", () => {
    const { container } = render(
      <ConnectInviteButton
        person={{ ...livingFriend, id: "p-ancestor", display_name: "Rosa", relation: "ancestor", passed_at: null }}
      />,
    );
    expect(screen.queryByRole("button", { name: CONNECT_INVITE_ACTION })).toBeNull();
    expect(container.textContent).toBe("");
  });
});
