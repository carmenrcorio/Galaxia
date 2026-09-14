"use client";

/**
 * Placeholder constellation for /app while people + charts load.
 * Points use the same ring-band seats as the live canvas (`constellationSkeletonSeats`).
 * Pulse is CSS-only; reduced-motion renders them static.
 */

import { constellationSkeletonSeats } from "@galaxia/core";
import Link from "next/link";
import type { CSSProperties } from "react";
import { EMPTY_STATE_WELCOME_HREF } from "../lib/nav-links";

/** Matches the loaded constellation frame so the page below does not jump. */
export const CONSTELLATION_STAGE_STYLE: CSSProperties = {
  width: "100%",
  aspectRatio: "1 / 1.12",
  minHeight: 380,
  maxHeight: "min(72vh, 680px)",
};

export const CONSTELLATION_CROSSFADE_MS = 250;

// FOUNDER-REVIEW: empty constellation, zero people.
export const CONSTELLATION_EMPTY =
  "Your constellation is empty. Add the first person to begin.";
// FOUNDER-REVIEW: empty constellation primary action.
export const CONSTELLATION_EMPTY_ACTION = "Add the first person";
// FOUNDER-REVIEW: load failure, short line.
export const CONSTELLATION_LOAD_ERROR = "The constellation could not load.";
// FOUNDER-REVIEW: retry after load failure.
export const CONSTELLATION_RETRY = "Try again";

const SKELETON_SEATS = constellationSkeletonSeats();

export function ConstellationStarFieldSkeleton({ visible }: { visible: boolean }) {
  const seats = SKELETON_SEATS;
  return (
    <div
      className="constellation-skeleton"
      aria-hidden="true"
      style={{
        opacity: visible ? 1 : 0,
        transition: `opacity ${CONSTELLATION_CROSSFADE_MS}ms ease`,
      }}
    >
      {seats.map((seat) => {
        const px = (3 + seat.size * 3).toFixed(2);
        const rad = "min(50cqw - 44px, 50cqh - 48px)";
        const nx = seat.nx.toFixed(4);
        const ny = seat.ny.toFixed(4);
        return (
          <span
            key={seat.id}
            className={`constellation-skeleton-point constellation-skeleton-point--${seat.accent}`}
            style={{
              width: `${px}px`,
              height: `${px}px`,
              left: `calc(50% + (${nx}) * ${rad})`,
              top: `calc(50% + (${ny}) * ${rad})`,
              animationDelay: `${(seat.pulse * 2.4).toFixed(2)}s`,
            }}
          />
        );
      })}
    </div>
  );
}

export function ConstellationEmptyState() {
  return (
    <div className="constellation-outcome">
      {/* FOUNDER-REVIEW: CONSTELLATION_EMPTY */}
      <p className="muted" style={{ margin: 0, maxWidth: "36ch" }}>{CONSTELLATION_EMPTY}</p>
      <Link href={EMPTY_STATE_WELCOME_HREF as never} className="btn-primary">
        {/* FOUNDER-REVIEW: CONSTELLATION_EMPTY_ACTION */}
        {CONSTELLATION_EMPTY_ACTION}
      </Link>
    </div>
  );
}

export function ConstellationLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="constellation-outcome">
      {/* FOUNDER-REVIEW: CONSTELLATION_LOAD_ERROR */}
      <p className="muted" style={{ margin: 0 }}>{CONSTELLATION_LOAD_ERROR}</p>
      <button type="button" className="btn-primary" onClick={onRetry}>
        {/* FOUNDER-REVIEW: CONSTELLATION_RETRY */}
        {CONSTELLATION_RETRY}
      </button>
    </div>
  );
}
