"use client";

/**
 * The natal chart wheel. Extracted from apps/web/app/app/person/[id]/page.tsx
 * so it can be reused by the public Quick Chart (/chart) without duplicating
 * the SVG geometry. Reference: design/reference/galaxia.jsx Wheel().
 *
 * Geometry lives in `@galaxia/core` `layoutChartWheel`. This file is the DOM
 * SVG paint path. Mobile uses the same layout through react-native-svg.
 *
 * Optional `overlayChart` draws a synastry bi-wheel: `chart` is the inner ring
 * and owns the house frame; overlay planets sit on the outer ring. When
 * `aspects` are passed (Compare), those lines are used — never recomputed.
 * Overlay without `aspects` is a loud empty state (note + dev warning), never
 * a silent void. Single-chart call sites stay one-arg and keep the internal
 * natal fallback when `aspects` is omitted; when `aspects` is passed (person
 * page), that list is drawn exactly.
 *
 * Optional `planetTooltips` turns each natal glyph into a hover/tap target
 * that opens the placement detail card (components/wheel-planet-tooltip.tsx).
 * Opt-in, because the Compare bi-wheel is too dense for per-planet cards and
 * share snapshots are static images.
 *
 * Colours: CSS custom properties from globals.css. Verified to survive the PDF
 * print path — chart-pdf-export already paints with `var(--${element})` in the
 * same portal'd document, and print uses the live DOM (not a var-stripping
 * serializer). Planet glyph *text* uses `--cream` for contrast; A/natal ring
 * stroke uses element colour, B (overlay) uses `--teal` so the two charts stay
 * distinct.
 */

import { bodyDisplayName, bodyDomain, computeSynastry, type BodyKey, type NatalChart } from "@galaxia/astro";
import {
  COMPARE_WHEEL_NEEDS_HOUSES as CORE_COMPARE_WHEEL_NEEDS_HOUSES,
  OVERLAY_ASPECTS_MISSING_NOTE as CORE_OVERLAY_ASPECTS_MISSING_NOTE,
  PLANET_TOOLTIP_CLOSE_DELAY_MS,
  YEAR_ASPECTS_NEED_DATE_NOTE,
  layoutChartWheel,
  orientSynastryWheel as coreOrientSynastryWheel,
  planetTooltipContent,
  planetTooltipSummary,
  signElement,
  type WheelAspect as CoreWheelAspect,
  type WheelChartOwner,
  type WheelPlanetGlyph,
} from "@galaxia/core";
import React, { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  dismissWheelExploreHint,
  readWheelExploreHintDismissed,
} from "../lib/chart-affordance-hints";
import { designColor } from "../lib/design";
import { WheelPlanetTooltip, wheelTooltipMode, type WheelPlanetTooltipMode } from "./wheel-planet-tooltip";

export const COMPARE_WHEEL_NEEDS_HOUSES = CORE_COMPARE_WHEEL_NEEDS_HOUSES;
export const OVERLAY_ASPECTS_MISSING_NOTE = CORE_OVERLAY_ASPECTS_MISSING_NOTE;
export const YEAR_ASPECTS_NOTE = YEAR_ASPECTS_NEED_DATE_NOTE;

export type WheelAspect = CoreWheelAspect;

export type ChartWheelProps = {
  chart: NatalChart;
  /** Second chart for synastry bi-wheel. Natal call sites omit this. */
  overlayChart?: NatalChart;
  /**
   * Already-computed aspects. Required path for overlay (Compare): from → chart
   * (inner/A), to → overlayChart (outer/B). Single-chart falls back to internal
   * natal self-aspects when omitted; when passed, drawn exactly (person page).
   */
  aspects?: WheelAspect[];
  /**
   * Pointer highlight (tap/hover). PDF/print passes false so highlight degrades
   * to a static wheel — no handlers, no focus state.
   */
  interactive?: boolean;
  /**
   * Swaps every `var(--x)` SVG colour for its literal hex (see
   * EXPORT_COLOR_LITERALS in lib/design.ts). Pass true whenever this wheel
   * sits inside an html-to-image raster capture — its SVG clone never
   * re-resolves custom properties on descendants, so `fill="var(--x)"`
   * would otherwise paint black in the exported PNG. Default false: zero
   * change to the live, on-screen wheel.
   */
  exportSafe?: boolean;
  /**
   * Opt in to the planet glyph detail card (natal wheels only; the Compare
   * bi-wheel is too dense and share snapshots are static images). Both fields
   * are required rather than optional: `minorSafe` so the Venus domain line
   * can never render adult copy on a child's chart (ENGINEERING.md §9), and
   * `onSeeFullReading` so the card's link always has a real target to open and
   * scroll to (§12 — no link that goes nowhere).
   */
  planetTooltips?: {
    minorSafe: boolean;
    onSeeFullReading: (body: string) => void;
  };
};

export function orientSynastryWheel(
  personA: { relation?: string | null },
  personB: { relation?: string | null },
  chartA: NatalChart,
  chartB: NatalChart,
  aspects: WheelAspect[],
) {
  return coreOrientSynastryWheel(personA, personB, chartA, chartB, aspects);
}

export function ChartWheel({
  chart,
  overlayChart,
  aspects: aspectsProp,
  interactive = true,
  exportSafe = false,
  planetTooltips,
}: ChartWheelProps) {
  const isOverlay = overlayChart != null;
  const natalPrecisionOk = chart.precision === "exact" || chart.precision === "date";
  const overlayWarnOnce = useRef(false);

  let natalFallbackAspects: WheelAspect[] | undefined;
  if (isOverlay) {
    // Overlay: only draw when Compare passes already-computed aspects.
  } else if (!natalPrecisionOk) {
    natalFallbackAspects = undefined;
  } else if (aspectsProp == null) {
    natalFallbackAspects = computeSynastry(chart, chart).aspects;
  }

  const layout = layoutChartWheel({
    chart,
    overlayChart,
    aspects: aspectsProp,
    natalFallbackAspects,
  });

  if (layout.overlayMissingAspects && !overlayWarnOnce.current) {
    overlayWarnOnce.current = true;
    console.warn(
      "[ChartWheel] overlayChart was mounted without aspects: synastry lines will not draw. Pass the already-computed Compare aspects."
    );
  }

  const [focus, setFocus] = useState<{ owner: WheelChartOwner; body: string } | null>(null);
  const [exploreHint, setExploreHint] = useState(false);

  // Glyph detail card. Natal only: the bi-wheel packs two rings of glyphs into
  // the same space, where a card would sit on top of the other chart.
  const tooltipsOn = interactive && !layout.isOverlay && planetTooltips != null;

  useEffect(() => {
    if (!tooltipsOn) {
      setExploreHint(false);
      return;
    }
    setExploreHint(!readWheelExploreHintDismissed());
  }, [tooltipsOn]);

  function noteWheelExplored() {
    if (!exploreHint) return;
    dismissWheelExploreHint();
    setExploreHint(false);
  }
  const [tipKey, setTipKey] = useState<{ key: string; mode: WheelPlanetTooltipMode } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const glyphRefs = useRef<Record<string, SVGGElement | null>>({});
  const tipCloseTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (tipCloseTimer.current) window.clearTimeout(tipCloseTimer.current);
    };
  }, []);

  function cancelTipClose() {
    if (tipCloseTimer.current) {
      window.clearTimeout(tipCloseTimer.current);
      tipCloseTimer.current = null;
    }
  }

  function scheduleTipClose() {
    cancelTipClose();
    tipCloseTimer.current = window.setTimeout(() => setTipKey(null), PLANET_TOOLTIP_CLOSE_DELAY_MS);
  }

  function closeTip() {
    cancelTipClose();
    setTipKey(null);
  }

  function openTip(key: string, mode: WheelPlanetTooltipMode) {
    cancelTipClose();
    setTipKey({ key, mode });
  }

  function tooltipFor(planet: WheelPlanetGlyph) {
    if (!planetTooltips) return null;
    return planetTooltipContent({
      name: bodyDisplayName(planet.body),
      domain: bodyDomain(planet.body.toLowerCase() as BodyKey, { minorSafe: planetTooltips.minorSafe }),
      sign: planet.sign,
      degree: planet.degree,
      house: planet.house,
      retro: planet.retro,
      hasHouses: layout.hasHouses,
    });
  }

  const tipPlanet = tipKey ? layout.planets.find((p) => p.key === tipKey.key) ?? null : null;
  const tipContent = tipPlanet ? tooltipFor(tipPlanet) : null;

  function lineDimmed(from: string, to: string): boolean {
    if (!interactive || !focus) return false;
    if (layout.isOverlay) {
      // Synastry shape: from = A (inner), to = B (outer).
      if (focus.owner === "a") return focus.body !== from;
      return focus.body !== to;
    }
    return focus.body !== from && focus.body !== to;
  }

  function onPlanetPointerEnter(owner: WheelChartOwner, body: string, key: string, e: ReactPointerEvent) {
    if (!interactive) return;
    if (e.pointerType === "touch") return;
    noteWheelExplored();
    setFocus({ owner, body });
    if (tooltipsOn) openTip(key, wheelTooltipMode());
  }

  function onPlanetPointerLeave(e: ReactPointerEvent) {
    if (!interactive) return;
    if (e.pointerType === "touch") return;
    setFocus(null);
    if (tooltipsOn) scheduleTipClose();
  }

  function onPlanetPointerUp(owner: WheelChartOwner, body: string, key: string, e: ReactPointerEvent) {
    if (!interactive) return;
    if (e.pointerType !== "touch") return;
    noteWheelExplored();
    const sameGlyph = focus != null && focus.owner === owner && focus.body === body;
    setFocus(sameGlyph ? null : { owner, body });
    if (!tooltipsOn) return;
    if (sameGlyph) closeTip();
    else openTip(key, wheelTooltipMode());
  }

  const color = (name: string) => designColor(name, exportSafe);

  return (
    <div
      className={exploreHint ? "chart-wheel--hint-active" : undefined}
      style={{ width: "100%", maxWidth: 306, margin: "0 auto", paddingInline: 8 }}
    >
      {exploreHint ? (
        <p className="chart-wheel-explore-hint">
          {/* FOUNDER-REVIEW: Tap a star to explore */}
          Tap a star to explore
        </p>
      ) : null}
      <svg ref={svgRef} viewBox={`0 0 ${layout.size} ${layout.size}`} width="100%" style={{ display: "block", overflow: "visible" }}>
        <circle cx={layout.cx} cy={layout.cy} r={layout.rOut} fill="none" stroke={layout.lineColor} strokeWidth="1" />
        <circle cx={layout.cx} cy={layout.cy} r={layout.rSignIn} fill="none" stroke={layout.lineColor} strokeWidth="1" />
        <circle cx={layout.cx} cy={layout.cy} r={layout.rInner} fill={layout.innerFill} stroke={layout.lineColor} strokeWidth="1" />
        {layout.aspectLines.map((al, i) => {
          const dim = lineDimmed(al.from, al.to);
          return (
            <line
              key={`asp-${al.from}-${al.to}-${i}`}
              data-asp={`${al.from}-${al.to}`}
              x1={al.x0} y1={al.y0} x2={al.x1} y2={al.y1}
              stroke={color(al.strokeToken)}
              strokeWidth={dim ? 1 : 2}
              strokeOpacity={dim ? Math.min(0.1, al.alpha * 0.18) : al.alpha}
            />
          );
        })}
        {layout.signs.map((slice) => (
          <g key={slice.sign}>
            <path
              d={slice.pathD}
              fill={color(slice.fillToken)}
              fillOpacity={0.18}
            />
            <line x1={slice.x0} y1={slice.y0} x2={slice.xi0} y2={slice.yi0} stroke={layout.lineColor} strokeWidth="1" />
            <text x={slice.gx} y={slice.gy} fill={color("cream")} fontSize="13" textAnchor="middle" dominantBaseline="central">
              {slice.glyph}
            </text>
          </g>
        ))}
        {layout.hasHouses && layout.ascLabel ? (
          <>
            <text
              x={layout.ascLabel.x}
              y={layout.ascLabel.y}
              fill={color("gold")}
              fontSize="8"
              textAnchor={layout.ascLabel.anchor}
              dominantBaseline="central"
              fontWeight="700"
            >
              ASC
            </text>
            {layout.mcLabel ? (
              <text
                x={layout.mcLabel.x}
                y={layout.mcLabel.y}
                fill={color("gold")}
                fontSize="8"
                textAnchor={layout.mcLabel.anchor}
                dominantBaseline="central"
                fontWeight="700"
              >
                MC
              </text>
            ) : null}
          </>
        ) : null}
        {layout.houses.map((h) => (
          <g key={h.i}>
            <line x1={h.x0} y1={h.y0} x2={h.x1} y2={h.y1} stroke={layout.lineColor} strokeWidth="0.8" />
            <text x={h.hx} y={h.hy} fill={color("mist2")} fontSize="8" textAnchor="middle" dominantBaseline="central">
              {h.label}
            </text>
          </g>
        ))}
        {layout.planets.map((planet) => {
          const { key, owner, body, px, py, strokeToken, gly } = planet;
          const isFocus = interactive && focus?.owner === owner && focus.body === body;
          const dimPlanet = interactive && focus != null && !isFocus;
          const glyphContent = tooltipsOn ? tooltipFor(planet) : null;
          return (
            <g
              key={key}
              data-planet={key}
              ref={(el) => {
                glyphRefs.current[key] = el;
              }}
              // Keyboard reaches the glyphs only once they carry a card to open;
              // a plain wheel would otherwise add a dozen empty tab stops.
              tabIndex={tooltipsOn ? 0 : undefined}
              role={tooltipsOn ? "button" : undefined}
              aria-label={glyphContent ? planetTooltipSummary(glyphContent) : undefined}
              onPointerEnter={(e) => onPlanetPointerEnter(owner, body, key, e)}
              onPointerLeave={onPlanetPointerLeave}
              onPointerUp={(e) => onPlanetPointerUp(owner, body, key, e)}
              onFocus={() => {
                if (!tooltipsOn) return;
                noteWheelExplored();
                setFocus({ owner, body });
                openTip(key, wheelTooltipMode());
              }}
              onBlur={() => {
                if (!tooltipsOn) return;
                setFocus(null);
                scheduleTipClose();
              }}
              onKeyDown={(e) => {
                if (!tooltipsOn) return;
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                planetTooltips?.onSeeFullReading(body);
                closeTip();
              }}
              style={{
                cursor: interactive ? "pointer" : undefined,
                opacity: dimPlanet ? 0.35 : 1,
                // Own ring below instead: the browser default boxes a round
                // glyph. It tracks the open card, so focus stays visible.
                outline: tooltipsOn ? "none" : undefined,
              }}
            >
              {/* Keep a large invisible touch target on phone without crowding visuals. */}
              <circle cx={px} cy={py} r={layout.glyphR + 9} fill="transparent" />
              {tipKey?.key === key ? (
                <circle
                  cx={px} cy={py} r={layout.glyphR + 4}
                  fill="none" stroke={color("gold")} strokeWidth="1.5" strokeOpacity="0.85"
                />
              ) : null}
              <circle
                cx={px} cy={py} r={layout.glyphR}
                fill={layout.planetFill}
                stroke={color(strokeToken)}
                strokeWidth={isFocus ? 1.75 : 1.25}
                {...(exploreHint && tooltipsOn ? { "data-wheel-glyph-hint": true } : {})}
              />
              {/* Cream glyph fill: element-coloured air was unreadable at mobile width. */}
              <text x={px} y={py} fill={color("cream")} fontSize={layout.glyphFs} textAnchor="middle" dominantBaseline="central">
                {gly}
              </text>
            </g>
          );
        })}
      </svg>
      {tipKey && tipPlanet && tipContent && planetTooltips ? (
        <WheelPlanetTooltip
          key={tipKey.key}
          content={tipContent}
          mode={tipKey.mode}
          elementToken={signElement(tipPlanet.sign)}
          getAnchorRect={() => glyphRefs.current[tipKey.key]?.getBoundingClientRect() ?? null}
          getWheelRect={() => svgRef.current?.getBoundingClientRect() ?? null}
          onSeeFullReading={() => {
            closeTip();
            setFocus(null);
            planetTooltips.onSeeFullReading(tipPlanet.body);
          }}
          onRequestClose={closeTip}
          onPointerEnter={cancelTipClose}
          onPointerLeave={scheduleTipClose}
        />
      ) : null}
      {layout.showYearNote ? (
        <p
          className="helper-text"
          style={{ marginTop: 8, textAlign: "center", maxWidth: "36ch", marginLeft: "auto", marginRight: "auto" }}
        >
          {YEAR_ASPECTS_NEED_DATE_NOTE}
        </p>
      ) : null}
      {layout.overlayMissingAspects ? (
        <p
          className="helper-text"
          data-overlay-aspects-missing=""
          style={{ marginTop: 8, textAlign: "center", maxWidth: "36ch", marginLeft: "auto", marginRight: "auto" }}
        >
          {OVERLAY_ASPECTS_MISSING_NOTE}
        </p>
      ) : null}
    </div>
  );
}
