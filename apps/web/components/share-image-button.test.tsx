// @vitest-environment jsdom

import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SHARE_IMAGE_FAIL, SHARE_SUCCESS_REVERT_MS } from "../lib/share-image";
import { ShareImageButton } from "./share-image-button";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function pngDataUrl() {
  return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
}

function stubShare(shareImpl: () => Promise<void>) {
  const share = vi.fn(shareImpl);
  vi.stubGlobal("navigator", {
    canShare: () => true,
    share,
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      blob: async () => new Blob([new Uint8Array(128).fill(7)], { type: "image/png" }),
    })),
  );
  return share;
}

describe("ShareImageButton label state machine", () => {
  it("does not say Shared when image generation fails", async () => {
    render(
      <ShareImageButton
        filename="sky.png"
        label="Share"
        capture={async () => {
          throw new Error(SHARE_IMAGE_FAIL);
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(screen.getByText(SHARE_IMAGE_FAIL)).toBeTruthy());
    expect(screen.getByRole("button").textContent).toBe("Share");
    expect(screen.queryByText("Shared")).toBeNull();
  });

  it("says Shared only after a confirmed share, then reverts", async () => {
    const share = stubShare(async () => {});
    render(
      <ShareImageButton
        filename="sky.png"
        label="Share"
        capture={async () => pngDataUrl()}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button").textContent).toBe("Shared");
    await new Promise((resolve) => setTimeout(resolve, SHARE_SUCCESS_REVERT_MS + 50));
    await waitFor(() => expect(screen.getByRole("button").textContent).toBe("Share"));
  });

  it("reverts immediately when the document is hidden after a successful share", async () => {
    stubShare(async () => {});
    render(
      <ShareImageButton
        filename="sky.png"
        label="Share"
        capture={async () => pngDataUrl()}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(screen.getByRole("button").textContent).toBe("Shared"));
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
    await waitFor(() => expect(screen.getByRole("button").textContent).toBe("Share"));
  });

  it("does not say Shared when the OS share sheet is cancelled", async () => {
    const share = stubShare(async () => {
      throw new DOMException("Share canceled", "AbortError");
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(
      <ShareImageButton
        filename="sky.png"
        label="Share"
        capture={async () => pngDataUrl()}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button").textContent).toBe("Share");
    expect(click).not.toHaveBeenCalled();
  });

  it("still requires a target node when no custom capture is passed", () => {
    const ref = createRef<HTMLDivElement>();
    render(<ShareImageButton targetRef={ref} filename="x.png" label="Share" />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button").textContent).toBe("Share");
  });

  it("shares a Blob capture without fetching a data URL", async () => {
    const share = stubShare(async () => {});
    const blob = new Blob([new Uint8Array(128).fill(7)], { type: "image/png" });
    render(
      <ShareImageButton
        filename="sky.png"
        label="Share"
        capture={async () => blob}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(fetch).not.toHaveBeenCalled();
    const payload = share.mock.calls.at(0)?.at(0) as { files?: File[] } | undefined;
    expect(payload?.files?.[0]).toBeInstanceOf(File);
    expect(payload?.files?.[0]?.name).toBe("sky.png");
    expect(payload?.files?.[0]?.type).toBe("image/png");
  });

  it("does not say Shared when the capture blob is empty", async () => {
    stubShare(async () => {});
    render(
      <ShareImageButton
        filename="sky.png"
        label="Share"
        capture={async () => new Blob([], { type: "image/png" })}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(screen.getByText(SHARE_IMAGE_FAIL)).toBeTruthy());
    expect(screen.queryByText("Shared")).toBeNull();
  });
});
