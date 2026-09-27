// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSession } from "./use-session";

const authMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
}));

vi.mock("./supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: { getUser: authMocks.getUser },
    from: authMocks.from,
  }),
}));

beforeEach(() => {
  authMocks.getUser.mockReset();
  authMocks.from.mockReset();
});

describe("useSession", () => {
  it("keeps the anonymous default while loading, then exposes the authenticated user id", async () => {
    let resolveUser!: (value: { data: { user: { id: string } } }) => void;
    authMocks.getUser.mockReturnValue(
      new Promise((resolve) => {
        resolveUser = resolve;
      }),
    );

    const { result } = renderHook(() => useSession());

    expect(result.current).toEqual({ userId: null, loading: true });

    await act(async () => {
      resolveUser({ data: { user: { id: "user-1" } } });
    });

    expect(result.current).toEqual({ userId: "user-1", loading: false });
    expect(authMocks.getUser).toHaveBeenCalledTimes(1);
    expect(authMocks.from).not.toHaveBeenCalled();
  });

  it("settles to anonymous when there is no valid session", async () => {
    authMocks.getUser.mockResolvedValue({ data: { user: null } });

    const { result } = renderHook(() => useSession());

    await waitFor(() => {
      expect(result.current).toEqual({ userId: null, loading: false });
    });
    expect(authMocks.from).not.toHaveBeenCalled();
  });

  it("settles to anonymous when the auth request fails", async () => {
    authMocks.getUser.mockRejectedValue(new Error("network unavailable"));

    const { result } = renderHook(() => useSession());

    await waitFor(() => {
      expect(result.current).toEqual({ userId: null, loading: false });
    });
  });
});
