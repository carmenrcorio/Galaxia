// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BlogNewsletterBox } from "./blog-newsletter-box";
import { GALAXIA_NOTES_TITLE, NEWSLETTER_SUCCESS } from "../../lib/newsletter-signup";

const track = vi.fn();

vi.mock("@vercel/analytics/react", () => ({
  track: (...args: unknown[]) => track(...args)
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: unknown }) => (
    <a href={href} {...rest}>
      {children as never}
    </a>
  )
}));

afterEach(() => {
  cleanup();
  track.mockClear();
  vi.unstubAllGlobals();
});

describe("BlogNewsletterBox", () => {
  it("tracks view and submits to the chart-lead newsletter route", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<BlogNewsletterBox slug="sun-sign-not-personality" />);

    expect(track).toHaveBeenCalledWith("newsletter_box_viewed", { source: "blog" });
    expect(screen.getByRole("heading", { name: GALAXIA_NOTES_TITLE })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Privacy" }).getAttribute("href")).toBe("/privacy");

    fireEvent.change(screen.getByLabelText("Email for Galaxia Notes"), {
      target: { value: "reader@example.com" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Get Galaxia Notes" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/chart-lead/newsletter-signup", expect.any(Object));
    });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      email: "reader@example.com"
    });

    await waitFor(() => {
      expect(screen.getByText(NEWSLETTER_SUCCESS)).toBeTruthy();
    });
    expect(track).toHaveBeenCalledWith("newsletter_submitted", { source: "blog" });
  });

  it("maps a 429 to the rate-limit copy, not raw server text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: "Too many requests. Try again in a minute." })
      })
    );

    render(<BlogNewsletterBox slug="synastry-chart-meaning" />);
    fireEvent.change(screen.getByLabelText("Email for Galaxia Notes"), {
      target: { value: "reader@example.com" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Get Galaxia Notes" }));

    await waitFor(() => {
      expect(screen.getByText("Too many tries. Wait a minute and try again.")).toBeTruthy();
    });
  });
});
