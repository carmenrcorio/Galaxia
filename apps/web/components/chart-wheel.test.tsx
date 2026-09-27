// @vitest-environment jsdom
/**
 * Planet glyph hover / tap behaviour on the natal wheel. The card's own
 * content and placement are covered in wheel-planet-tooltip.test.tsx; this
 * file is about which glyph opens which card, and which wheels get cards at
 * all.
 */
import type { NatalChart } from "@galaxia/astro";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChartWheel } from "./chart-wheel";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function chartStub(overrides: Partial<NatalChart> = {}): NatalChart {
  return {
    placements: [
      { body: "sun", lon: 12.5, sign: "Aries", degree: 12.5, house: 1, retro: false, confident: true },
      { body: "venus", lon: 74.4, sign: "Gemini", degree: 14.4, house: 10, retro: true, confident: true },
      { body: "mars", lon: 200.2, sign: "Libra", degree: 20.2, house: 7, retro: false, confident: true },
    ],
    precision: "exact",
    asc: "Aries",
    mc: "Capricorn",
    cusps: Array.from({ length: 12 }, (_, i) => i * 30),
    generational: {
      pluto: { sign: "Capricorn", confident: true },
      neptune: { sign: "Aquarius", confident: true },
      uranus: { sign: "Capricorn", confident: true },
      cohortLabel: "stub cohort",
    },
    ...overrides,
  } as NatalChart;
}

function glyph(key: string): Element {
  const el = document.querySelector(`[data-planet="${key}"]`);
  if (!el) throw new Error(`no glyph for ${key}`);
  return el;
}

function tipText(): string | null {
  return document.querySelector(".wheel-tip")?.textContent ?? null;
}

describe("ChartWheel planet glyph card", () => {
  it("opens on hover with that glyph's placement, not another's", () => {
    render(
      <ChartWheel
        chart={chartStub()}
        aspects={[]}
        planetTooltips={{ minorSafe: false, onSeeFullReading: vi.fn() }}
      />,
    );
    expect(tipText()).toBeNull();

    fireEvent.pointerEnter(glyph("a-venus"), { pointerType: "mouse" });
    const text = tipText() ?? "";
    expect(text).toContain("Venus");
    expect(text).toContain("Gemini 14\u00B0");
    expect(text).toContain("10th House");
    expect(text).toContain("Rx");
    expect(text).toContain("How they love");
    expect(text).not.toContain("Libra");
  });

  it("swaps to the next glyph's card while sweeping the wheel", () => {
    render(
      <ChartWheel
        chart={chartStub()}
        aspects={[]}
        planetTooltips={{ minorSafe: false, onSeeFullReading: vi.fn() }}
      />,
    );
    fireEvent.pointerEnter(glyph("a-venus"), { pointerType: "mouse" });
    expect(tipText()).toContain("Venus");
    fireEvent.pointerEnter(glyph("a-mars"), { pointerType: "mouse" });
    expect(tipText()).toContain("Mars");
    expect(tipText()).toContain("Libra 20\u00B0");
  });

  it("holds the card for 300ms after the pointer leaves, then dismisses", () => {
    vi.useFakeTimers();
    render(
      <ChartWheel
        chart={chartStub()}
        aspects={[]}
        planetTooltips={{ minorSafe: false, onSeeFullReading: vi.fn() }}
      />,
    );
    fireEvent.pointerEnter(glyph("a-venus"), { pointerType: "mouse" });
    fireEvent.pointerLeave(glyph("a-venus"), { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(299));
    expect(tipText()).toContain("Venus");
    act(() => vi.advanceTimersByTime(2));
    expect(tipText()).toBeNull();
  });

  it("stays open when the pointer moves onto the card itself", () => {
    vi.useFakeTimers();
    render(
      <ChartWheel
        chart={chartStub()}
        aspects={[]}
        planetTooltips={{ minorSafe: false, onSeeFullReading: vi.fn() }}
      />,
    );
    fireEvent.pointerEnter(glyph("a-venus"), { pointerType: "mouse" });
    fireEvent.pointerLeave(glyph("a-venus"), { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(150));
    fireEvent.pointerEnter(document.querySelector(".wheel-tip")!);
    act(() => vi.advanceTimersByTime(400));
    expect(tipText()).toContain("Venus");
  });

  it("hands the body back to the page when the reading link is used", () => {
    const onSeeFullReading = vi.fn();
    render(
      <ChartWheel chart={chartStub()} aspects={[]} planetTooltips={{ minorSafe: false, onSeeFullReading }} />,
    );
    fireEvent.pointerEnter(glyph("a-venus"), { pointerType: "mouse" });
    fireEvent.click(screen.getByRole("button", { name: "See full reading below" }));
    expect(onSeeFullReading).toHaveBeenCalledWith("venus");
    expect(tipText()).toBeNull();
  });

  it("opens as a bottom sheet on a touch tap, and the same tap again closes it", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("coarse"), media: query }));
    render(
      <ChartWheel
        chart={chartStub()}
        aspects={[]}
        planetTooltips={{ minorSafe: false, onSeeFullReading: vi.fn() }}
      />,
    );
    fireEvent.pointerUp(glyph("a-venus"), { pointerType: "touch" });
    expect(document.querySelector(".wheel-tip--sheet")).toBeTruthy();
    expect(tipText()).toContain("Venus");

    fireEvent.pointerUp(glyph("a-venus"), { pointerType: "touch" });
    expect(tipText()).toBeNull();
  });

  it("reads the whole placement as the glyph's accessible name, and opens on keyboard focus", () => {
    render(
      <ChartWheel
        chart={chartStub()}
        aspects={[]}
        planetTooltips={{ minorSafe: false, onSeeFullReading: vi.fn() }}
      />,
    );
    const venus = glyph("a-venus");
    expect(venus.getAttribute("role")).toBe("button");
    expect(venus.getAttribute("aria-label")).toBe("Venus. Gemini 14°. 10th House. Retrograde. How they love.");
    expect(venus.getAttribute("tabindex")).toBe("0");

    fireEvent.focus(venus);
    expect(tipText()).toContain("Venus");
  });

  it("uses the minor-safe domain line for a child's chart", () => {
    render(
      <ChartWheel
        chart={chartStub()}
        aspects={[]}
        planetTooltips={{ minorSafe: true, onSeeFullReading: vi.fn() }}
      />,
    );
    fireEvent.pointerEnter(glyph("a-venus"), { pointerType: "mouse" });
    expect(tipText()).toContain("How they care");
    expect(tipText()).not.toContain("How they love");
  });

  it("omits the house line when the chart has no cusps", () => {
    render(
      <ChartWheel
        chart={chartStub({ cusps: undefined, asc: undefined, mc: undefined })}
        aspects={[]}
        planetTooltips={{ minorSafe: false, onSeeFullReading: vi.fn() }}
      />,
    );
    fireEvent.pointerEnter(glyph("a-venus"), { pointerType: "mouse" });
    expect(tipText()).toContain("Gemini 14\u00B0");
    expect(tipText()).not.toContain("House");
  });
});

describe("ChartWheel surfaces without glyph cards", () => {
  it("a wheel that did not opt in stays a plain hover highlight", () => {
    render(<ChartWheel chart={chartStub()} aspects={[]} />);
    const venus = glyph("a-venus");
    expect(venus.getAttribute("role")).toBeNull();
    expect(venus.getAttribute("tabindex")).toBeNull();
    fireEvent.pointerEnter(venus, { pointerType: "mouse" });
    expect(tipText()).toBeNull();
  });

  it("the Compare bi-wheel never opens a per-planet card, even if asked", () => {
    render(
      <ChartWheel
        chart={chartStub()}
        overlayChart={chartStub()}
        aspects={[{ from: "sun", to: "venus", type: "square", orb: 1, harmony: -1 }]}
        planetTooltips={{ minorSafe: false, onSeeFullReading: vi.fn() }}
      />,
    );
    fireEvent.pointerEnter(glyph("a-venus"), { pointerType: "mouse" });
    expect(tipText()).toBeNull();
    fireEvent.pointerUp(glyph("b-venus"), { pointerType: "touch" });
    expect(tipText()).toBeNull();
  });

  it("a non-interactive wheel (PDF / print) has no card and no tab stops", () => {
    render(
      <ChartWheel
        chart={chartStub()}
        aspects={[]}
        interactive={false}
        planetTooltips={{ minorSafe: false, onSeeFullReading: vi.fn() }}
      />,
    );
    const venus = glyph("a-venus");
    expect(venus.getAttribute("tabindex")).toBeNull();
    fireEvent.pointerEnter(venus, { pointerType: "mouse" });
    expect(tipText()).toBeNull();
  });
});
