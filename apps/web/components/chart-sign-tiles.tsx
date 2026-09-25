"use client";

/**
 * Compact Sun / Moon / Rising tiles that sit directly under a natal wheel.
 * Restored from the person-page snapshot row removed in #291 (the
 * `sign-chip` row that lived inside ChartImageExport with the wheel).
 *
 * Front: glyph, uppercase label, serif sign name.
 * Back: curated interpretPlacement / interpretRising summary for that
 * placement in this chart. Hover, focus, or tap flips the tile.
 * prefers-reduced-motion swaps faces without a 3D rotate.
 *
 * Sun and Rising use the shared purple `glyph-sq` badge + SIGN_GLYPH.
 * Moon uses the standalone crescent (`BODY_GLYPH.moon`) instead of a badge.
 * Signs come from the same chart object the wheel already has — never hardcoded.
 */

import {
  interpretPlacement,
  interpretRising,
  type BodyKey,
  type NatalChart,
  type SignKey,
} from "@galaxia/astro";
import { useState } from "react";
import { BODY_GLYPH, SIGN_GLYPH, signElement } from "../lib/design";

export function ChartSignTiles({
  chart,
  minorSafe = true,
}: {
  chart: NatalChart;
  /** Same fail-safe as NatalSignReveal when the caller has no birth date. */
  minorSafe?: boolean;
}) {
  const sun = chart.placements.find((p) => p.body === "sun");
  const moon = chart.placements.find((p) => p.body === "moon");

  const tiles: {
    key: "sun" | "moon" | "rising";
    label: string;
    sign: string;
    confident: boolean;
    short: string;
    long: string;
  }[] = [];

  if (sun?.sign) {
    const reading =
      sun.confident === false
        ? { short: "", long: "" }
        : interpretPlacement("sun" as BodyKey, sun.sign as SignKey, { minorSafe });
    tiles.push({
      key: "sun",
      label: "Sun",
      sign: sun.sign,
      confident: sun.confident !== false,
      short: reading.short,
      long: reading.long,
    });
  }
  if (moon?.sign) {
    const reading =
      moon.confident === false
        ? { short: "", long: "" }
        : interpretPlacement("moon" as BodyKey, moon.sign as SignKey, { minorSafe });
    tiles.push({
      key: "moon",
      label: "Moon",
      sign: moon.sign,
      confident: moon.confident !== false,
      short: reading.short,
      long: reading.long,
    });
  }
  if (chart.asc) {
    const reading = interpretRising(chart.asc as SignKey);
    tiles.push({
      key: "rising",
      label: "Rising",
      sign: chart.asc,
      confident: true,
      short: reading.short,
      long: reading.long,
    });
  }

  if (tiles.length === 0) return null;

  return (
    <div
      className="chart-sign-tiles"
      data-testid="chart-sign-tiles"
      style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }}
    >
      {tiles.map((tile) => (
        <SignTile key={tile.key} tile={tile} />
      ))}
    </div>
  );
}

function SignTile({
  tile,
}: {
  tile: {
    key: "sun" | "moon" | "rising";
    label: string;
    sign: string;
    confident: boolean;
    short: string;
    long: string;
  };
}) {
  const [flipped, setFlipped] = useState(false);
  const isMoon = tile.key === "moon";
  const summary = tile.long || tile.short;
  const canFlip = tile.confident && Boolean(summary);

  return (
    <button
      type="button"
      className={`sign-chip chart-sign-tile${flipped ? " is-flipped" : ""}${canFlip ? "" : " is-static"}`}
      aria-pressed={canFlip ? flipped : undefined}
      aria-label={
        canFlip
          ? flipped
            ? `${tile.label} in ${tile.sign}. ${summary}`
            : `${tile.label} in ${tile.sign}. Flip for what this means in the chart.`
          : `${tile.label} sign uncertain`
      }
      disabled={!canFlip}
      onClick={() => {
        if (canFlip) setFlipped((prev) => !prev);
      }}
    >
      <span className="chart-sign-tile__inner">
        <span className="chart-sign-tile__face chart-sign-tile__front">
          {isMoon ? (
            <span className="sign-chip__glyph chart-sign-tiles__moon" aria-hidden="true">
              {BODY_GLYPH.moon}
            </span>
          ) : (
            <span
              className="glyph-sq"
              style={{ color: `var(--${signElement(tile.sign)})` }}
              aria-hidden="true"
            >
              {SIGN_GLYPH[tile.sign]}
            </span>
          )}
          <span className="sign-chip__label">{tile.label}</span>
          <span className="sign-chip__value">{tile.confident ? tile.sign : "Uncertain"}</span>
        </span>
        {canFlip ? (
          <span className="chart-sign-tile__face chart-sign-tile__back">
            <span className="sign-chip__label">
              {tile.label} in {tile.sign}
            </span>
            <span className="chart-sign-tile__long">{summary}</span>
          </span>
        ) : null}
      </span>
    </button>
  );
}
