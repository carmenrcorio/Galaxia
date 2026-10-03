// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WhyReadingGroup, WhyThisReading } from "./why-this-reading";

vi.mock("@vercel/analytics/react", () => ({
  track: vi.fn(),
}));

describe("WhyThisReading", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders nothing when line is empty", () => {
    const { container } = render(<WhyThisReading insightType="flip_card" line="" />);
    expect(container.firstChild).toBeNull();
  });

  it("toggles derivation with glossary popovers on planet and sign", () => {
    render(<WhyThisReading insightType="flip_card" line="Moon in Cancer." />);
    const toggle = screen.getByRole("button", { name: "Why this reading" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("button", { name: "Moon" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancer" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "How we compute this" })).toBeNull();
  });

  it("opens Chiron placements in the glossary popover without a methodology link", () => {
    render(<WhyThisReading insightType="natal_placement" line="Chiron in Gemini." />);
    const toggle = screen.getByRole("button", { name: "Why this reading" });
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Chiron" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Gemini" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "How we compute this" })).toBeNull();
  });

  it("shows plain derivation when no glossary match exists", () => {
    render(<WhyThisReading insightType="natal_placement" line="Lilith in Unknown." />);
    const toggle = screen.getByRole("button", { name: "Why this reading" });
    fireEvent.click(toggle);
    expect(screen.getByText("Lilith in Unknown.")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "How we compute this" })).toBeNull();
  });

  it("keeps only one panel open inside WhyReadingGroup", () => {
    render(
      <WhyReadingGroup>
        <WhyThisReading insightType="flip_card" line="Sun in Leo." />
        <WhyThisReading insightType="flip_card" line="Moon in Cancer." />
      </WhyReadingGroup>,
    );
    const toggles = screen.getAllByRole("button", { name: "Why this reading" });
    fireEvent.click(toggles[0]!);
    expect(toggles[0]!.getAttribute("aria-expanded")).toBe("true");
    expect(toggles[1]!.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggles[1]!);
    expect(toggles[0]!.getAttribute("aria-expanded")).toBe("false");
    expect(toggles[1]!.getAttribute("aria-expanded")).toBe("true");
  });
});
