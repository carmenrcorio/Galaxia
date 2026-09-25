"use client";

/**
 * Compact Sun / Moon / Rising tiles that sit directly under a natal wheel.
 * Restored from the person-page snapshot row removed in #291 (the
 * `sign-chip` row that lived inside ChartImageExport with the wheel).
 *
 * Visual: three equal cards, glyph on top, uppercase label, serif sign name.
 * Sun and Rising use the shared purple `glyph-sq` badge + SIGN_GLYPH.
 * Moon uses the standalone crescent (`BODY_GLYPH.moon`) instead of a badge.
 * Signs come from the same chart object the wheel already has — never hardcoded.
 * These tiles do not flip. The header cards (`FlipSignCards`) carry the reading.
 */

import type { NatalChart } from "@galaxia/astro";
import { BODY_GLYPH, SIGN_GLYPH, signElement } from "../lib/design";

export function ChartSignTiles({ chart }: { chart: NatalChart }) {
  const sun = chart.placements.find((p) => p.body === "sun");
  const moon = chart.placements.find((p) => p.body === "moon");

  const sunSign = sun?.sign;
  const moonSign = moon?.sign;
  const risingSign = chart.asc;

  const tiles: { key: "sun" | "moon" | "rising"; label: string; sign: string }[] = [];
  if (sunSign) tiles.push({ key: "sun", label: "Sun", sign: sunSign });
  if (moonSign) tiles.push({ key: "moon", label: "Moon", sign: moonSign });
  if (risingSign) tiles.push({ key: "rising", label: "Rising", sign: risingSign });

  if (tiles.length === 0) return null;

  return (
    <div
      className="chart-sign-tiles"
      data-testid="chart-sign-tiles"
      style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }}
    >
      {tiles.map((tile) => {
        const isMoon = tile.key === "moon";
        return (
          <div key={tile.key} className="sign-chip">
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
            <span className="sign-chip__value">{tile.sign}</span>
          </div>
        );
      })}
    </div>
  );
}
