// @vitest-environment jsdom
import { planetTooltipContent } from "@galaxia/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WHEEL_TOOLTIP_WIDTH, WheelPlanetTooltip, wheelTooltipMode } from "./wheel-planet-tooltip";

afterEach(cleanup);

const VENUS = planetTooltipContent({
  name: "Venus",
  domain: "How they love",
  sign: "Gemini",
  degree: 14.4,
  house: 10,
  retro: true,
  hasHouses: true,
});

function rect(left: number, top: number, width = 26, height = 26): DOMRect {
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    x: left,
    y: top,
  } as DOMRect;
}

/** A 300px wheel centred at x=480, the shape ChartWheel renders. */
const WHEEL = rect(330, 200, 300, 300);

function renderTooltip(
  overrides: Partial<React.ComponentProps<typeof WheelPlanetTooltip>> = {},
) {
  const props: React.ComponentProps<typeof WheelPlanetTooltip> = {
    content: VENUS,
    mode: "hover",
    getAnchorRect: () => rect(500, 300),
    getWheelRect: () => WHEEL,
    elementToken: "air",
    onSeeFullReading: vi.fn(),
    onRequestClose: vi.fn(),
    ...overrides,
  };
  return { ...render(<WheelPlanetTooltip {...props} />), props };
}

function card(): HTMLElement {
  const el = document.querySelector<HTMLElement>(".wheel-tip");
  if (!el) throw new Error("tooltip card did not render");
  return el;
}

describe("WheelPlanetTooltip content", () => {
  it("shows the planet, sign and degree, house, retrograde badge, and domain line", () => {
    renderTooltip();
    const text = card().textContent ?? "";
    expect(text).toContain("Venus");
    expect(text).toContain("Gemini 14\u00B0");
    expect(text).toContain("10th House");
    expect(text).toContain("Rx");
    expect(text).toContain("How they love");
  });

  it("links into the placement list and hands the click back to the page", () => {
    const { props } = renderTooltip();
    fireEvent.click(screen.getByRole("button", { name: "See full reading below" }));
    expect(props.onSeeFullReading).toHaveBeenCalledTimes(1);
  });

  it("tints the sign line with the glyph's element", () => {
    renderTooltip({ elementToken: "air" });
    const sign = card().querySelector<HTMLElement>(".wheel-tip__sign");
    expect(sign?.style.color).toBe("var(--air)");
  });

  it("leaves out the house line on a chart with no cusps", () => {
    renderTooltip({
      content: planetTooltipContent({
        name: "Mars",
        domain: "Drive & conflict",
        sign: "Leo",
        degree: 3.2,
        house: 6,
        hasHouses: false,
      }),
    });
    expect(card().textContent).toContain("Leo 3\u00B0");
    expect(card().querySelector(".wheel-tip__house")).toBeNull();
  });
});

describe("WheelPlanetTooltip hover placement", () => {
  it("clears the wheel's right edge for a glyph on the right half", () => {
    renderTooltip({ getAnchorRect: () => rect(500, 300), getWheelRect: () => WHEEL });
    expect(card().style.left).toBe(`${WHEEL.right + 12}px`);
  });

  it("flips past the wheel's left edge for a glyph on the left half", () => {
    renderTooltip({ getAnchorRect: () => rect(360, 300), getWheelRect: () => WHEEL });
    expect(card().style.left).toBe(`${WHEEL.left - 12 - WHEEL_TOOLTIP_WIDTH}px`);
  });

  it("never covers the wheel", () => {
    for (const glyphX of [340, 400, 470, 520, 600]) {
      cleanup();
      renderTooltip({ getAnchorRect: () => rect(glyphX, 300), getWheelRect: () => WHEEL });
      const left = Number.parseInt(card().style.left, 10);
      const overlaps = left < WHEEL.right && left + WHEEL_TOOLTIP_WIDTH > WHEEL.left;
      expect(overlaps).toBe(false);
    }
  });

  it("is vertically centred on the glyph it belongs to", () => {
    renderTooltip({ getAnchorRect: () => rect(500, 300), getWheelRect: () => WHEEL });
    // jsdom reports offsetHeight 0, so the card's top lands on the glyph centre.
    expect(card().style.top).toBe("313px");
  });

  it("clamps into the viewport instead of running off-screen", () => {
    // jsdom's default window is 1024x768.
    renderTooltip({ getAnchorRect: () => rect(1010, 300), getWheelRect: () => rect(900, 200, 300, 300) });
    const left = Number.parseInt(card().style.left, 10);
    expect(left).toBeGreaterThanOrEqual(8);
    expect(left + WHEEL_TOOLTIP_WIDTH).toBeLessThanOrEqual(window.innerWidth - 8);
  });

  it("keeps the card inside the viewport vertically too", () => {
    renderTooltip({ getAnchorRect: () => rect(500, 760), getWheelRect: () => WHEEL });
    expect(Number.parseInt(card().style.top, 10)).toBeGreaterThanOrEqual(8);
    expect(Number.parseInt(card().style.top, 10)).toBeLessThanOrEqual(window.innerHeight - 8);
  });

  it("re-measures on scroll so the card follows its glyph", () => {
    let left = 500;
    renderTooltip({ getAnchorRect: () => rect(left, 300), getWheelRect: () => WHEEL });
    expect(card().style.left).toBe(`${WHEEL.right + 12}px`);
    left = 360;
    fireEvent.scroll(window);
    expect(card().style.left).toBe(`${WHEEL.left - 12 - WHEEL_TOOLTIP_WIDTH}px`);
  });

  it("holds the card open while the pointer is on it, and releases on leave", () => {
    const onPointerEnter = vi.fn();
    const onPointerLeave = vi.fn();
    renderTooltip({ onPointerEnter, onPointerLeave });
    fireEvent.pointerEnter(card());
    expect(onPointerEnter).toHaveBeenCalledTimes(1);
    fireEvent.pointerLeave(card());
    expect(onPointerLeave).toHaveBeenCalledTimes(1);
  });

  it("has no scrim in hover mode, so other glyphs stay clickable", () => {
    renderTooltip();
    expect(document.querySelector(".wheel-tip-backdrop")).toBeNull();
  });
});

describe("WheelPlanetTooltip touch sheet", () => {
  it("becomes a bottom sheet with a tap-outside dismiss", () => {
    const { props } = renderTooltip({ mode: "touch" });
    expect(card().className).toContain("wheel-tip--sheet");
    expect(card().getAttribute("style")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Close placement details" }));
    expect(props.onRequestClose).toHaveBeenCalledTimes(1);
  });

  it("dismisses on a downward swipe", () => {
    const { props } = renderTooltip({ mode: "touch" });
    fireEvent.pointerDown(card(), { clientY: 400 });
    fireEvent.pointerMove(card(), { clientY: 420 });
    expect(props.onRequestClose).not.toHaveBeenCalled();
    fireEvent.pointerMove(card(), { clientY: 480 });
    expect(props.onRequestClose).toHaveBeenCalledTimes(1);
  });
});

describe("WheelPlanetTooltip dismissal", () => {
  it("Escape closes the card", () => {
    const { props } = renderTooltip();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(props.onRequestClose).toHaveBeenCalledTimes(1);
  });

  it("portals to document.body so the wheel's overflow ancestors cannot clip it", () => {
    const { container } = renderTooltip();
    expect(container.querySelector(".wheel-tip")).toBeNull();
    expect(document.body.querySelector(".wheel-tip")).toBeTruthy();
  });
});

describe("wheelTooltipMode", () => {
  function withEnvironment(coarse: boolean, width: number) {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: coarse && query.includes("coarse"),
      media: query,
    }));
    vi.stubGlobal("innerWidth", width);
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("gives a wide fine-pointer desktop the hover card", () => {
    withEnvironment(false, 1280);
    expect(wheelTooltipMode()).toBe("hover");
  });

  it("gives a phone the bottom sheet however it was opened", () => {
    withEnvironment(true, 390);
    expect(wheelTooltipMode()).toBe("touch");
  });

  it("gives a coarse pointer the sheet even on a wide screen", () => {
    withEnvironment(true, 1280);
    expect(wheelTooltipMode()).toBe("touch");
  });

  it("gives a narrow window the sheet, since the card cannot fit beside the wheel", () => {
    withEnvironment(false, 500);
    expect(wheelTooltipMode()).toBe("touch");
  });
});
