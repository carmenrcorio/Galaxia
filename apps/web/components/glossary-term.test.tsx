// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GlossaryTerm } from "./glossary-term";

afterEach(() => {
  cleanup();
});

describe("GlossaryTerm", () => {
  it("is keyboard focusable and wires aria-describedby to the meaning", () => {
    render(<GlossaryTerm term="Uranus" meaning="How someone breaks the mold." />);
    const trigger = screen.getByRole("button", { name: "Uranus" });
    expect(trigger.tabIndex).toBe(0);
    const describedBy = trigger.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const tooltip = document.getElementById(describedBy!);
    expect(tooltip).toBeTruthy();
    expect(tooltip!.textContent).toBe("How someone breaks the mold.");
    expect(tooltip!.getAttribute("role")).toBe("tooltip");
  });

  it("opens on focus and Escape dismisses the visible popover", () => {
    render(<GlossaryTerm term="Taurus" meaning="Steady and built to last." />);
    const trigger = screen.getByRole("button", { name: "Taurus" });
    const describedBy = trigger.getAttribute("aria-describedby")!;
    const tooltip = document.getElementById(describedBy)!;

    fireEvent.focus(trigger);
    expect(tooltip.className).toContain("is-open");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(tooltip.className).not.toContain("is-open");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("keeps the meaning in the accessibility tree while closed so screen readers can announce it", () => {
    render(<GlossaryTerm term="Pluto" meaning="Where someone meets power." />);
    const trigger = screen.getByRole("button", { name: "Pluto" });
    const tooltip = document.getElementById(trigger.getAttribute("aria-describedby")!);
    expect(tooltip).toBeTruthy();
    expect(tooltip!.hidden).toBe(false);
    expect(tooltip!.textContent).toBe("Where someone meets power.");
  });
});
