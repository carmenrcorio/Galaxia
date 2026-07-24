"use client";

import type { MemorialConstellation } from "@galaxia/core";

/**
 * Stroke-light SVG preview of a memorial constellation pattern.
 * Used in the edit-person picker — same topology as the galaxy canvas glyph.
 */
export function MemorialConstellationGlyph({
  pattern,
  size = 56,
  color = "var(--gold-soft, #E6AE6C)",
  strokeWidth = 1.1,
  starRadius = 1.6,
  title,
}: {
  pattern: MemorialConstellation;
  size?: number;
  color?: string;
  strokeWidth?: number;
  starRadius?: number;
  title?: string;
}) {
  const pad = 4;
  const r = (size - pad * 2) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const pts = pattern.stars.map(([x, y]) => ({
    x: cx + x * r,
    /* sky Dec increases north; SVG y increases down — flip for familiar sky map. */
    y: cy - y * r,
  }));

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={title ?? pattern.name}
      style={{ display: "block", flexShrink: 0 }}
    >
      {title ? <title>{title}</title> : null}
      {pattern.lines.map(([a, b]) => (
        <line
          key={`${a}-${b}`}
          x1={pts[a].x}
          y1={pts[a].y}
          x2={pts[b].x}
          y2={pts[b].y}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity={0.72}
        />
      ))}
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={starRadius}
          fill={color}
          opacity={0.92}
        />
      ))}
    </svg>
  );
}
