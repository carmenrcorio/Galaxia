"use client";

/**
 * Shared image-export wrapper for every biwheel/galaxy export call site
 * (single natal chart, compare, galaxy). One component owns the watermark,
 * the filename convention, and the minor gate so none of the three can
 * drift between /chart, /app/person/[id], /chart/compare, /app/compare,
 * /s/[token], and /app — see ShareImageButton and ShareWatermark for the
 * underlying raster/watermark mechanics, both unchanged by this wrapper.
 */

import { type CSSProperties, type ReactNode, useRef } from "react";
import { ShareImageButton } from "./share-image-button";
import { ShareWatermark } from "./share-watermark";

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

/**
 * Filename convention for every image export call site: the slugified
 * subject name, falling back to a stable per-surface default when there is
 * nothing to slugify (a nameless /s/[token] single share, or a surface that
 * never carries a name at all).
 */
export function exportFilename(name: string | null | undefined, fallback: string): string {
  const slug = name ? slugify(name) : "";
  return slug ? `${slug}.png` : fallback;
}

export type ShareExportCardProps = {
  children: ReactNode;
  /** Build with exportFilename() so the naming convention cannot drift. */
  filename: string;
  label?: string;
  /**
   * When true, withholds the whole watermark + export-button pair, not just
   * the button. ShareWatermark is deliberately WYSIWYG (always visible
   * on-screen, not injected only at export time) — a watermark left on
   * screen with no export control, or a control with no watermark, would
   * break that contract. Content itself keeps rendering normally; only the
   * export path is gated. Always pass a boolean already derived from
   * isMinorForSafety (@galaxia/core) — never a raw is_minor/pairHasMinor
   * column read directly by this component.
   */
  minorBlocked?: boolean;
  style?: CSSProperties;
  className?: string;
  contentStyle?: CSSProperties;
};

export function ShareExportCard({
  children,
  filename,
  label,
  minorBlocked = false,
  style,
  className,
  contentStyle,
}: ShareExportCardProps) {
  const shareRef = useRef<HTMLDivElement>(null);

  if (minorBlocked) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      <div ref={shareRef} style={{ position: "relative", ...contentStyle }}>
        {children}
        <ShareWatermark />
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
        <ShareImageButton targetRef={shareRef} filename={filename} label={label} />
      </div>
    </div>
  );
}
