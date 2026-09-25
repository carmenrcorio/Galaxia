"use client";

/**
 * Sun / Moon / Rising cards that sit at the top of a chart surface.
 * Front is the placement. Hover, focus, or tap flips to the curated
 * interpretPlacement / interpretRising summary. The tiles under the
 * wheel stay a static graphic (`ChartSignTiles`).
 */

import {
  interpretPlacement,
  interpretRising,
  type BodyKey,
  type NatalChart,
  type SignKey,
} from "@galaxia/astro";
import { useState } from "react";
import { SIGN_GLYPH, signElement } from "../lib/design";

export function FlipSignCards({
  chart,
  minorSafe = true,
}: {
  chart: NatalChart;
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
        : interpretPlacement(sun.body as BodyKey, sun.sign as SignKey, { minorSafe });
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
        : interpretPlacement(moon.body as BodyKey, moon.sign as SignKey, { minorSafe });
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
      className="flip-sign-cards"
      data-testid="flip-sign-cards"
      style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }}
    >
      {tiles.map((tile) => (
        <FlipSignCard key={tile.key} tile={tile} />
      ))}
    </div>
  );
}

function FlipSignCard({
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
  const summary = tile.long || tile.short;
  const canFlip = tile.confident && Boolean(summary);

  return (
    <button
      type="button"
      className={`sign-chip flip-sign-card${flipped ? " is-flipped" : ""}${canFlip ? "" : " is-static"}`}
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
      <span className="flip-sign-card__inner">
        <span className="flip-sign-card__face flip-sign-card__front">
          <span
            className="sign-chip__glyph"
            style={{ color: `var(--${signElement(tile.sign)})` }}
            aria-hidden="true"
          >
            {SIGN_GLYPH[tile.sign]}
          </span>
          <span className="sign-chip__label">{tile.label}</span>
          <span className="sign-chip__value">{tile.confident ? tile.sign : "Uncertain"}</span>
        </span>
        {canFlip ? (
          <span className="flip-sign-card__face flip-sign-card__back">
            <span className="sign-chip__label">
              {tile.label} in {tile.sign}
            </span>
            <span className="flip-sign-card__long">{summary}</span>
          </span>
        ) : null}
      </span>
    </button>
  );
}
