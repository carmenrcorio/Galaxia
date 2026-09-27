"use client";

/**
 * Hover / tap detail card for a planet glyph on the natal wheel.
 *
 * The wheel is an <svg>, so the card is plain HTML portaled to document.body,
 * the same pattern GlossaryTerm uses: an overflow:auto ancestor (the person
 * page scroller) cannot clip it, and it never enters the SVG raster capture
 * that ChartImageExport takes of the wheel section.
 *
 * Two shapes, one content model:
 *  - "hover" (fine pointer): vertically centred on the glyph and pushed out
 *    past the wheel's own edge, on whichever side the glyph sits. That keeps
 *    it beside the planet the reader is pointing at while leaving the centre,
 *    the sign band, and every other glyph uncovered. Re-measured on scroll
 *    and resize while open.
 *  - "touch" (coarse pointer, or a viewport too narrow for the card to fit
 *    beside the wheel): a bottom sheet, because a 240px card cannot sit beside
 *    a 300px wheel on a phone without landing on top of it.
 */

import {
  PLANET_TOOLTIP_DISMISS_LABEL,
  PLANET_TOOLTIP_FULL_READING_WEB,
  type PlanetTooltipContent,
} from "@galaxia/core";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

export const WHEEL_TOOLTIP_WIDTH = 236;
/** Breathing room between the glyph edge and the card. */
const GLYPH_GAP = 12;
const VIEWPORT_EDGE = 8;
/** Downward drag on the touch sheet that counts as a dismiss. */
const SWIPE_DISMISS_PX = 56;

export type WheelPlanetTooltipMode = "hover" | "touch";

/**
 * Narrowest viewport that can hold the card beside the wheel: the wheel's own
 * max width plus a card and its gaps on one side.
 */
const HOVER_CARD_MIN_VIEWPORT = 306 + WHEEL_TOOLTIP_WIDTH + GLYPH_GAP + VIEWPORT_EDGE * 2;

/**
 * Which shape the card takes, decided by the device rather than by whichever
 * event opened it: a tap both fires pointer events and focuses the glyph, so
 * per-event modes flip-flop.
 */
export function wheelTooltipMode(): WheelPlanetTooltipMode {
  if (typeof window === "undefined") return "hover";
  if (window.matchMedia?.("(pointer: coarse)").matches) return "touch";
  return window.innerWidth < HOVER_CARD_MIN_VIEWPORT ? "touch" : "hover";
}

export type WheelPlanetTooltipProps = {
  content: PlanetTooltipContent;
  mode: WheelPlanetTooltipMode;
  /** Live glyph rect. A function so scroll and resize can re-measure it. */
  getAnchorRect: () => DOMRect | null;
  /** Live wheel rect. Picks the side and the edge the card clears. */
  getWheelRect: () => DOMRect | null;
  /** Element colour token for the sign band this glyph sits in. */
  elementToken: string;
  onSeeFullReading: () => void;
  onRequestClose: () => void;
  /** Pointer entered the card: cancel the pending hover dismiss. */
  onPointerEnter?: () => void;
  /** Pointer left the card: start the hover dismiss. */
  onPointerLeave?: () => void;
};

function anchoredStyle(
  anchor: DOMRect,
  wheel: DOMRect | null,
  cardHeight: number,
): CSSProperties {
  const glyphCenterX = anchor.left + anchor.width / 2;
  const pushRight = wheel == null ? true : glyphCenterX >= wheel.left + wheel.width / 2;
  // Clear the wheel's own edge, not just the glyph's, so the card never lands
  // on the sign band or a neighbouring glyph.
  const rawLeft = pushRight
    ? Math.max(anchor.right, wheel?.right ?? anchor.right) + GLYPH_GAP
    : Math.min(anchor.left, wheel?.left ?? anchor.left) - GLYPH_GAP - WHEEL_TOOLTIP_WIDTH;
  const maxLeft = Math.max(VIEWPORT_EDGE, window.innerWidth - WHEEL_TOOLTIP_WIDTH - VIEWPORT_EDGE);
  const left = Math.max(VIEWPORT_EDGE, Math.min(rawLeft, maxLeft));

  const rawTop = anchor.top + anchor.height / 2 - cardHeight / 2;
  const maxTop = Math.max(VIEWPORT_EDGE, window.innerHeight - cardHeight - VIEWPORT_EDGE);
  const top = Math.max(VIEWPORT_EDGE, Math.min(rawTop, maxTop));

  return { left, top, width: WHEEL_TOOLTIP_WIDTH };
}

export function WheelPlanetTooltip({
  content,
  mode,
  getAnchorRect,
  getWheelRect,
  elementToken,
  onSeeFullReading,
  onRequestClose,
  onPointerEnter,
  onPointerLeave,
}: WheelPlanetTooltipProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<CSSProperties | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (mode !== "hover") {
      setCoords(null);
      return;
    }
    function place() {
      const anchor = getAnchorRect();
      if (!anchor) return;
      const height = cardRef.current?.offsetHeight ?? 0;
      setCoords(anchoredStyle(anchor, getWheelRect(), height));
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [mode, getAnchorRect, getWheelRect, content.name, mounted]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onRequestClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onRequestClose]);

  if (!mounted) return null;

  const card = (
    <div
      ref={cardRef}
      className={`wheel-tip${mode === "touch" ? " wheel-tip--sheet" : ""}`}
      data-wheel-tip={content.name}
      role="dialog"
      aria-label={content.name}
      style={mode === "hover" ? coords ?? { left: -9999, top: 0, width: WHEEL_TOOLTIP_WIDTH } : undefined}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onPointerDown={(event) => {
        if (mode !== "touch") return;
        dragStartY.current = event.clientY;
      }}
      onPointerMove={(event) => {
        if (mode !== "touch" || dragStartY.current == null) return;
        if (event.clientY - dragStartY.current > SWIPE_DISMISS_PX) {
          dragStartY.current = null;
          onRequestClose();
        }
      }}
      onPointerUp={() => {
        dragStartY.current = null;
      }}
    >
      {mode === "touch" ? <span className="wheel-tip__grabber" aria-hidden /> : null}
      <p className="wheel-tip__name">
        <span>{content.name}</span>
        {content.retroLabel ? (
          <span className="retrograde-badge" aria-label={content.retroAriaLabel}>
            {content.retroLabel}
          </span>
        ) : null}
      </p>
      <p className="wheel-tip__sign" style={{ color: `var(--${elementToken})` }}>
        {content.signLine}
        {content.houseLine ? <span className="wheel-tip__house">{content.houseLine}</span> : null}
      </p>
      <p className="wheel-tip__domain">{content.domain}</p>
      <button type="button" className="wheel-tip__more" onClick={onSeeFullReading}>
        {PLANET_TOOLTIP_FULL_READING_WEB}
      </button>
    </div>
  );

  if (mode === "touch") {
    return createPortal(
      <div className="wheel-tip-backdrop">
        <button
          type="button"
          className="wheel-tip-backdrop__dismiss"
          aria-label={PLANET_TOOLTIP_DISMISS_LABEL}
          onClick={onRequestClose}
        />
        {card}
      </div>,
      document.body,
    );
  }

  return createPortal(card, document.body);
}
