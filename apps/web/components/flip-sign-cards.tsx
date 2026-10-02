"use client";

/**
 * Sun / Moon / Rising reading cards at the top of a chart surface.
 * Front is the original reveal chip: glyph, label, sign, and the
 * curated short. Hover, focus, or tap flips to the long.
 */

import {
  interpretPlacement,
  interpretRising,
  type BodyKey,
  type NatalChart,
  type SignKey,
} from "@galaxia/astro";
import { useState } from "react";
import {
  dismissFlipCardHint,
  readFlipCardHintDismissed,
} from "../lib/chart-affordance-hints";
import { SIGN_GLYPH, signElement } from "../lib/design";
import { useChartImageCapturing } from "./chart-image-capture";
import { RetrogradeBadge } from "./retrograde-badge";

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
    retro: boolean;
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
      retro: sun.retro,
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
      retro: moon.retro,
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
      retro: false,
      short: reading.short,
      long: reading.long,
    });
  }

  if (tiles.length === 0) return null;

  const [flipHintHidden, setFlipHintHidden] = useState(() => readFlipCardHintDismissed());

  function noteFlipInteraction() {
    if (flipHintHidden) return;
    dismissFlipCardHint();
    setFlipHintHidden(true);
  }

  return (
    <>
      {!flipHintHidden ? (
        <p className="flip-sign-hint">
          {/* FOUNDER-REVIEW: Tap to flip */}
          Tap to flip
        </p>
      ) : null}
      <div
        className="flip-sign-cards"
        data-testid="flip-sign-cards"
        style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }}
      >
        {tiles.map((tile) => (
          <FlipSignCard key={tile.key} tile={tile} onFlip={noteFlipInteraction} />
        ))}
      </div>
    </>
  );
}

function FlipSignCard({
  tile,
  onFlip,
}: {
  onFlip: () => void;
  tile: {
    key: "sun" | "moon" | "rising";
    label: string;
    sign: string;
    confident: boolean;
    retro: boolean;
    short: string;
    long: string;
  };
}) {
  const [flipped, setFlipped] = useState(false);
  const capturing = useChartImageCapturing();
  const summary = tile.long || tile.short;
  const canFlip = tile.confident && Boolean(summary);
  // Capture clones this DOM. 3D backface-visibility does not survive that
  // clone, so the export renders the front only and leaves flip state intact.
  const visuallyFlipped = flipped && !capturing;
  const showBack = canFlip && !capturing;

  return (
    <button
      type="button"
      className={`sign-chip flip-sign-card${visuallyFlipped ? " is-flipped" : ""}${canFlip ? "" : " is-static"}${capturing ? " is-export" : ""}`}
      aria-pressed={canFlip ? visuallyFlipped : undefined}
      aria-label={
        // FOUNDER-REVIEW: "Rx" is included when the natal planet is retrograde.
        canFlip
          ? visuallyFlipped
            ? `${tile.label} in ${tile.sign}${tile.retro ? " Rx" : ""}. ${summary}`
            : `${tile.label} in ${tile.sign}${tile.retro ? " Rx" : ""}. Flip for what this means in the chart.`
          : `${tile.label} sign uncertain`
      }
      disabled={!canFlip}
      onClick={() => {
        if (canFlip && !capturing) {
          setFlipped((prev) => {
            if (!prev) onFlip();
            return !prev;
          });
        }
      }}
    >
      <span className="flip-sign-card__inner">
        <span className="flip-sign-card__face flip-sign-card__front">
          <span
            className="sign-chip__glyph"
            style={{ position: "relative", color: `var(--${signElement(tile.sign)})` }}
          >
            <span aria-hidden="true">{SIGN_GLYPH[tile.sign]}</span>
            <RetrogradeBadge retro={tile.retro} corner />
          </span>
          <span className="sign-chip__label">{tile.label}</span>
          <span className="sign-chip__value">{tile.confident ? tile.sign : "Uncertain"}</span>
          {tile.short ? (
            <span className="sign-chip__vibe">{tile.short}</span>
          ) : null}
        </span>
        {showBack ? (
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
