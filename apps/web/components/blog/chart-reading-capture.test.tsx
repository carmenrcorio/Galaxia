// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ChartReadingCapture } from "./chart-reading-capture";
import {
  CHART_READING_CONFIRMATION,
  CHART_READING_FRAMING,
  CHART_READING_SUBMIT
} from "../../lib/chart-reading-copy";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: unknown }) => (
    <a href={href} {...rest}>{children as never}</a>
  )
}));

afterEach(() => {
  cleanup();
});

describe("ChartReadingCapture", () => {
  it("renders framing, email, optional fields, submit, and privacy without required labels", () => {
    const { container } = render(<ChartReadingCapture />);
    expect(screen.getByText(CHART_READING_FRAMING)).toBeTruthy();
    expect(screen.getByRole("button", { name: CHART_READING_SUBMIT })).toBeTruthy();
    const privacy = screen.getByRole("link", { name: "Privacy" });
    expect(privacy.getAttribute("href")).toBe("/privacy");
    expect(container.textContent).not.toMatch(/\*/);
    expect(container.textContent).not.toMatch(/required/i);
    expect(container.textContent).not.toContain("\u2014");
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByLabelText("Name")).toBeTruthy();
    expect(screen.getByLabelText("Birthplace")).toBeTruthy();
  });

  it("posts to the capture route and shows the confirmation line", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, message: CHART_READING_CONFIRMATION })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ChartReadingCapture />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "maya@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: CHART_READING_SUBMIT }));

    await waitFor(() => {
      expect(screen.getByText(CHART_READING_CONFIRMATION)).toBeTruthy();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/blog/chart-reading-capture");
    expect(JSON.parse(init.body as string).email).toBe("maya@example.com");

    vi.unstubAllGlobals();
  });
});
