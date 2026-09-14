// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShareLinkButton } from "./share-link-button";
import { SHARE_COMPARE_DISCLOSURE, SHARE_GIFT_DISCLOSURE } from "../lib/quick-share";

vi.mock("../lib/use-viewer", () => ({
  useViewer: () => ({ userId: null, isSubscriber: false }),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ShareLinkButton gift disclosure and expiry", () => {
  it("states what a gifted-chart recipient will see and hides no-expiry when signed out", () => {
    render(
      <ShareLinkButton
        variant="gift"
        createShareUrl={async () => "https://example.test/s/tok"}
      />,
    );
    expect(screen.getByText(SHARE_GIFT_DISCLOSURE)).toBeTruthy();
    expect(screen.getByText("7 days")).toBeTruthy();
    expect(screen.getByText("14 days")).toBeTruthy();
    expect(screen.getByText("30 days")).toBeTruthy();
    expect(screen.queryByText("No expiry")).toBeNull();
  });

  it("compare variant uses the compare disclosure", () => {
    render(
      <ShareLinkButton createShareUrl={async () => "https://example.test/s/tok"} />,
    );
    expect(screen.getByText(SHARE_COMPARE_DISCLOSURE)).toBeTruthy();
  });

  it("passes the selected expiry into createShareUrl and copies a token URL", async () => {
    const createShareUrl = vi.fn(async ({ expiresInDays }: { expiresInDays: number | null }) => {
      expect(expiresInDays).toBe(7);
      return "https://example.test/s/tok";
    });
    const writeText = vi.fn(async () => {});
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    render(<ShareLinkButton variant="gift" createShareUrl={createShareUrl} />);
    fireEvent.click(screen.getByText("7 days"));
    fireEvent.click(screen.getByRole("button", { name: "Copy share link" }));
    await waitFor(() => expect(createShareUrl).toHaveBeenCalledTimes(1));
    expect(writeText).toHaveBeenCalledWith("https://example.test/s/tok");
  });
});
