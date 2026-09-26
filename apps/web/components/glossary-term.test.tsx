// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { glossaryPreview } from "../lib/glossary-terms";
import { GlossaryTerm } from "./glossary-term";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function stubPointerHover(hoverable: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: hoverable && query.includes("hover: hover") && query.includes("pointer: fine"),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

beforeEach(() => {
  stubPointerHover(false);
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

    fireEvent.focus(trigger);
    expect(document.querySelector(".glossary-term__floating")).toBeTruthy();
    expect(document.querySelector(".glossary-term__floating")!.textContent).toBe("Steady and built to last.");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(document.querySelector(".glossary-term__floating")).toBeNull();
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

  it("looks up a glossary slug, previews the first sentences, and links to the hash", () => {
    render(<GlossaryTerm glossarySlug="orb" />);
    const trigger = screen.getByRole("button", { name: "Orb" });
    fireEvent.focus(trigger);
    const floating = document.querySelector(".glossary-term__floating");
    expect(floating).toBeTruthy();
    expect(floating!.textContent).toContain(glossaryPreview(
      "The distance in degrees between an exact aspect. A tighter orb means a stronger connection. Galaxia uses fixed orb allowances per aspect type, listed on the methodology page.",
    ));
    expect(floating!.textContent).not.toContain("methodology page");
    const link = floating!.querySelector("a");
    expect(link).toBeTruthy();
    expect(link!.getAttribute("href")).toBe("/glossary#orb");
    expect(link!.textContent).toBe("See full definition");
  });

  it("renders unknown slugs as plain text", () => {
    render(<GlossaryTerm glossarySlug="not-a-term">plain</GlossaryTerm>);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("plain")).toBeTruthy();
    expect(document.querySelector(".glossary-term__trigger")).toBeNull();
  });

  it("opens on hover after 200ms when the pointer can hover", () => {
    stubPointerHover(true);
    vi.useFakeTimers();
    render(<GlossaryTerm term="Trine" meaning="Easy contact." />);
    const trigger = screen.getByRole("button", { name: "Trine" });

    fireEvent.mouseEnter(trigger);
    expect(document.querySelector(".glossary-term__floating")).toBeNull();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(document.querySelector(".glossary-term__floating")).toBeTruthy();

    fireEvent.mouseLeave(trigger);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(document.querySelector(".glossary-term__floating")).toBeNull();
  });

  it("stays open after a pointer click so focus plus click do not cancel each other", () => {
    render(<GlossaryTerm term="Sextile" meaning="A cooperative opening." />);
    const trigger = screen.getByRole("button", { name: "Sextile" });

    fireEvent.mouseDown(trigger);
    fireEvent.focus(trigger);
    fireEvent.click(trigger);

    expect(document.querySelector(".glossary-term__floating")).toBeTruthy();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("does not open on hover when the pointer cannot hover", () => {
    stubPointerHover(false);
    vi.useFakeTimers();
    render(<GlossaryTerm term="Square" meaning="Friction." />);
    const trigger = screen.getByRole("button", { name: "Square" });

    fireEvent.mouseEnter(trigger);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(document.querySelector(".glossary-term__floating")).toBeNull();
  });
});
