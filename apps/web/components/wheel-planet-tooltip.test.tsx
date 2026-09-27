// @vitest-environment jsdom
import { planetTooltipContent } from "@galaxia/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WHEEL_TOOLTIP_WIDTH, WheelPlanetTooltip } from "./wheel-planet-tooltip";

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

function rect(left: number, top: number): DOMRect {
  return { left, top, right: left + 26, bottom: top + 26, width: 26, height: 26, x: left, y: top } as DOMRect;
}

function renderTooltip(
  overrides: Partial<React.ComponentProps<typeof WheelPlanetTooltip>> = {},
) {
  const props: React.ComponentProps<typeof WheelPlanetTooltip> = {
    content: VENUS,
    mode: "hover",
    getAnchorRect: () => rect(500, 300),
    getWheelCenterX: () => 400,
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
  it("sits beside the glyph, pushed away from the wheel centre", () => {
    // Glyph at x=500 on a wheel centred at x=400: the card goes to its right.
    renderTooltip({ getAnchorRect: () => rect(500, 300), getWheelCenterX: () => 400 });
    expect(card().style.left).toBe("538px");
  });

  it("flips to the other side for a glyph left of the wheel centre", () => {
    renderTooltip({ getAnchorRect: () => rect(300, 300), getWheelCenterX: () => 400 });
    expect(card().style.left).toBe(`${300 - 12 - WHEEL_TOOLTIP_WIDTH}px`);
  });

  it("clamps into the viewport instead of running off-screen", () => {
    // jsdom's default window is 1024x768.
    renderTooltip({ getAnchorRect: () => rect(1010, 300), getWheelCenterX: () => 400 });
    const left = Number.parseInt(card().style.left, 10);
    expect(left).toBeGreaterThanOrEqual(8);
    expect(left + WHEEL_TOOLTIP_WIDTH).toBeLessThanOrEqual(window.innerWidth - 8);
  });

  it("keeps the card inside the viewport vertically too", () => {
    renderTooltip({ getAnchorRect: () => rect(500, 760), getWheelCenterX: () => 400 });
    expect(Number.parseInt(card().style.top, 10)).toBeGreaterThanOrEqual(8);
    expect(Number.parseInt(card().style.top, 10)).toBeLessThanOrEqual(window.innerHeight - 8);
  });

  it("re-measures on scroll so the card follows its glyph", () => {
    let left = 500;
    renderTooltip({ getAnchorRect: () => rect(left, 300), getWheelCenterX: () => 400 });
    expect(card().style.left).toBe("538px");
    left = 300;
    fireEvent.scroll(window);
    expect(card().style.left).toBe(`${300 - 12 - WHEEL_TOOLTIP_WIDTH}px`);
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
