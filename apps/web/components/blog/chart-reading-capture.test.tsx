// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ChartReadingCapture } from "./chart-reading-capture";
import {
  CHART_READING_BIRTH_DATA_NOTE,
  CHART_READING_CONFIRMATION,
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
  it("renders honest helper copy and an optional place, with no birth-time promises", () => {
    const { container } = render(<ChartReadingCapture />);
    expect(screen.getByText(CHART_READING_BIRTH_DATA_NOTE)).toBeTruthy();
    expect(container.textContent).not.toMatch(/rising sign/i);
    expect(container.textContent).not.toMatch(/\bhouses\b/i);
    expect(container.textContent).not.toMatch(/birth time/i);
    expect(container.textContent).not.toMatch(/more accurate/i);
    expect(container.textContent).not.toMatch(/published chart/i);
    expect(screen.getByRole("button", { name: CHART_READING_SUBMIT })).toBeTruthy();
    const privacy = screen.getByRole("link", { name: "Privacy" });
    expect(privacy.getAttribute("href")).toBe("/privacy");
    expect(container.textContent).not.toMatch(/\*/);
    expect(container.textContent).not.toMatch(/required/i);
    expect(container.textContent).not.toContain("\u2014");
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByLabelText("Name")).toBeTruthy();
    const place = screen.getByLabelText("Birth place (optional)");
    expect(place).toBeTruthy();
    const helper = container.querySelector("#chart-reading-helper");
    const button = screen.getByRole("button", { name: CHART_READING_SUBMIT });
    expect(helper).toBeTruthy();
    expect(place.compareDocumentPosition(helper!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(helper!.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelector('input[type="time"]')).toBeNull();
  });

  it("posts to the capture route and shows the confirmation line", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, message: CHART_READING_CONFIRMATION })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ChartReadingCapture />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "maya@example.com" } });
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Maya" } });
    fireEvent.change(screen.getByLabelText("Birth month"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Birth day"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Birth year"), { target: { value: "1993" } });
    fireEvent.change(screen.getByLabelText("Birth place (optional)"), { target: { value: "Austin" } });
    fireEvent.click(screen.getByRole("button", { name: CHART_READING_SUBMIT }));

    await waitFor(() => {
      expect(screen.getByText(CHART_READING_CONFIRMATION)).toBeTruthy();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/blog/chart-reading-capture");
    expect(JSON.parse(init.body as string)).toEqual({
      email: "maya@example.com",
      name: "Maya",
      month: 4,
      day: 10,
      year: 1993,
      birthPlace: "Austin"
    });

    vi.unstubAllGlobals();
  });
});
