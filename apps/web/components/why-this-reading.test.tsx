// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WhyThisReading } from "./why-this-reading";

vi.mock("@vercel/analytics/react", () => ({
  track: vi.fn(),
}));

describe("WhyThisReading", () => {
  it("renders nothing when line is empty", () => {
    const { container } = render(<WhyThisReading insightType="flip_card" line="" />);
    expect(container.firstChild).toBeNull();
  });

  it("toggles derivation and exposes aria-expanded", () => {
    render(<WhyThisReading insightType="flip_card" line="Moon in Cancer." />);
    const toggle = screen.getByRole("button", { name: "Why this reading" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Moon in Cancer.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "How we compute this" }).getAttribute("href")).toBe("/methodology");
  });
});
