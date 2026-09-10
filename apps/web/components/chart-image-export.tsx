"use client";

/**
 * Shared "export this chart as an image" wiring. This is the one place the
 * watermark, the filename convention, and the minor gate live, so the call
 * sites (single natal chart on /chart, /app/person/[id], /s; the synastry
 * bi-wheel on /chart/compare, /app/compare, /s; the galaxy constellation on
 * /app) cannot drift from each other.
 *
 * Built entirely on the existing ShareImageButton (html-to-image plus OS
 * share or download) and ShareWatermark. No new capture mechanism.
 *
 * Minor gate: `pairHasMinor` hides the control on compare surfaces only
 * (ENGINEERING.md section 9 / section 13: never let a romantic or attraction
 * artifact leave the app about a pairing that includes a child). Callers must
 * pass a value already derived from `isMinorForSafety` (or the stored,
 * already-computed `pairHasMinor` on a share snapshot). This component never
 * reads a raw `is_minor` column and never recomputes age itself. Link sharing
 * (ShareLinkButton, the /s token flow) is untouched by this gate; it only
 * hides the raster-image control.
 */

import { useRef, type CSSProperties, type ReactNode, type RefObject } from "react";
import { ShareImageButton } from "./share-image-button";
import { ShareWatermark } from "./share-watermark";

/**
 * One filename convention for every export: a slug of `base` (person name,
 * or both compare names) with a stable fallback when `base` is empty or
 * absent. Anonymous single shares and the galaxy view have no name to slug.
 */
export function chartExportFilename(base: string | null | undefined, fallback: string): string {
  const slug = (base ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `${slug}.png` : fallback;
}

/**
 * The captured region: `children` plus the always-on watermark, inside a
 * `position: relative` frame so the watermark's absolute placement lands
 * correctly. Exposes its own ref so a caller that needs the trigger button
 * placed elsewhere on the page (the galaxy header controls row) can still
 * target this exact frame. See ChartImageExportButton.
 */
export function ChartImageExportFrame({
  frameRef,
  style,
  className,
  children,
}: {
  frameRef: RefObject<HTMLDivElement | null>;
  style?: CSSProperties;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div ref={frameRef} className={className} style={{ position: "relative", ...style }}>
      {children}
      <ShareWatermark />
    </div>
  );
}

/**
 * The trigger, with the minor gate applied. Renders nothing when
 * `pairHasMinor` is true. The frame it points at still renders normally
 * (link sharing and the reading itself are unaffected); only this control
 * disappears.
 */
export function ChartImageExportButton({
  frameRef,
  filename,
  // FOUNDER-REVIEW: authored - default label; every call site overrides it
  // with a surface-specific label, so this default only fires if a future
  // caller forgets to.
  label = "Share image",
  pairHasMinor = false,
}: {
  frameRef: RefObject<HTMLElement | null>;
  filename: string;
  label?: string;
  pairHasMinor?: boolean;
}) {
  if (pairHasMinor) return null;
  return <ShareImageButton targetRef={frameRef} filename={filename} label={label} />;
}

/**
 * Convenience composition of the two pieces above for call sites that want
 * the trigger directly above or below the captured frame (the common case:
 * single chart and compare bi-wheel surfaces). The galaxy view places its
 * trigger in a header row instead, so it uses ChartImageExportFrame and
 * ChartImageExportButton directly.
 */
export function ChartImageExport({
  filename,
  label,
  pairHasMinor = false,
  buttonPosition = "below",
  frameStyle,
  children,
}: {
  filename: string;
  label?: string;
  pairHasMinor?: boolean;
  buttonPosition?: "above" | "below";
  frameStyle?: CSSProperties;
  children: ReactNode;
}) {
  const frameRef = useRef<HTMLDivElement>(null);

  // When gated, render the content untouched: no frame, no watermark, no
  // button. The chart or reading itself is not gated here; only the image
  // export control is.
  if (pairHasMinor) return <>{children}</>;

  const button = (
    <div style={{ display: "flex", justifyContent: "center", margin: "12px 0" }}>
      <ChartImageExportButton frameRef={frameRef} filename={filename} label={label} />
    </div>
  );

  return (
    <>
      {buttonPosition === "above" ? button : null}
      <ChartImageExportFrame frameRef={frameRef} style={frameStyle}>
        {children}
      </ChartImageExportFrame>
      {buttonPosition === "below" ? button : null}
    </>
  );
}
