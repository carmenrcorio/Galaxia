"use client";

import { useEffect, useState, type RefObject } from "react";
import { toSvg } from "html-to-image";
import {
  SHARE_IMAGE_BG,
  SHARE_IMAGE_FAIL,
  SHARE_SUCCESS_REVERT_MS,
  assertCanvasHasContent,
  shareButtonLabel,
  shareImageOutputSize,
  shouldRevertShareStatus,
} from "../lib/share-image";
import { Spinner } from "./spinner";

/**
 * Rasterizes `node` the same way html-to-image's `toPng` does internally
 * (`toSvg` → `<img>` → `<canvas>`), except it strips `backdrop-filter` /
 * `-webkit-backdrop-filter` from the baked SVG before decoding it to an
 * image. Chromium leaves everything below/around an element with an active
 * backdrop-filter unpainted when it rasterizes html-to-image's
 * foreignObject-based SVG onto a canvas, which clips the bottom of any
 * export whose captured node includes a `.glass-card` (the MC label and
 * the watermark end up blank even though the DOM itself is complete). The
 * filter blurs whatever sits *behind* the card, which a static export has
 * already flattened away, so dropping it here costs nothing visually.
 */
async function toPngWithoutBackdropFilterClip(
  node: HTMLElement,
  options: { pixelRatio: number; backgroundColor: string; cacheBust: boolean },
): Promise<string> {
  const svgDataUrl = await toSvg(node, { backgroundColor: options.backgroundColor, cacheBust: options.cacheBust });
  const decoded = decodeURIComponent(svgDataUrl.slice(svgDataUrl.indexOf(",") + 1));
  const stripped = decoded.replace(/(?:-webkit-)?backdrop-filter:[^;"]*;?/gi, "");
  const fixedDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(stripped)}`;

  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(SHARE_IMAGE_FAIL));
    img.src = fixedDataUrl;
  });
  await img.decode().catch(() => {});

  const rawW = (img.naturalWidth || node.clientWidth) * options.pixelRatio;
  const rawH = (img.naturalHeight || node.clientHeight) * options.pixelRatio;
  const { width, height } = shareImageOutputSize(rawW, rawH);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error(SHARE_IMAGE_FAIL);
  ctx.fillStyle = options.backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  assertCanvasHasContent(canvas, "html-to-image");
  return canvas.toDataURL();
}

/**
 * "Share" — captures the referenced DOM node as a PNG (client-side only,
 * nothing is uploaded or persisted) and hands it to the OS share sheet when
 * available, falling back to a direct download. Used by the Memorial
 * Timeline and Family Chart Comparison "viral screenshot" share cards, and
 * by every biwheel export call site via ChartImageExport — all of
 * them render a permanent `<ShareWatermark />` inside the captured node, so
 * the exported image always carries the "galaxiamea.com" mark.
 *
 * Galaxy is the exception: /app redraws the signed-in account's settled
 * constellation onto offscreen canvases and passes `capture` (a PNG Blob).
 * It never uses this DOM path, never reads GPU-promoted on-screen
 * canvases, and never substitutes a fixture sky.
 *
 * Deliberately does NOT reuse the public /api/quick-share pipeline: that
 * stack mints an unauthenticated, anyone-with-the-link page for the public
 * Quick Chart funnel. A memorial milestone, a natal chart, or a private
 * compare result is owner-authored data — the right "share" here is an
 * image the owner controls, not a new public URL into the app's data.
 */
export function ShareImageButton({
  targetRef,
  filename,
  label = "Share",
  capture,
}: {
  targetRef?: RefObject<HTMLElement | null>;
  filename: string;
  label?: string;
  /** Galaxy: PNG Blob (or data URL) of the live sky. Other call sites omit this and capture `targetRef`. */
  capture?: () => Promise<string | Blob>;
}) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!status) return;
    const revert = () => setStatus(null);
    const timer = window.setTimeout(revert, SHARE_SUCCESS_REVERT_MS);
    const onVis = () => {
      if (shouldRevertShareStatus(document.hidden)) revert();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [status]);

  async function share() {
    if (busy) return;
    if (!capture && !targetRef?.current) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const captured = capture
        ? await capture()
        : await toPngWithoutBackdropFilterClip(targetRef!.current!, {
            pixelRatio: 2,
            backgroundColor: SHARE_IMAGE_BG,
            cacheBust: true,
          });
      const blob =
        captured instanceof Blob
          ? captured
          : await (await fetch(captured)).blob();
      if (blob.size < 64) throw new Error(SHARE_IMAGE_FAIL);

      if (typeof navigator !== "undefined" && navigator.share && navigator.canShare) {
        try {
          const file = new File([blob], filename, { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file] });
            setStatus("Shared");
            return;
          }
        } catch (shareErr) {
          // FOUNDER-REVIEW: rewritten (no U+2014).
          // A cancelled OS share sheet is not an error: just fall through
          // to the direct download below without surfacing anything red.
          if (shareErr instanceof DOMException && shareErr.name === "AbortError") return;
        }
      }

      // Object URL, not a data: URL — iOS Safari has saved empty files from
      // large data: hrefs even when the in-memory PNG was fine.
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = filename;
      link.href = url;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      setStatus("Image saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : SHARE_IMAGE_FAIL);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 6, justifyItems: "center" }}>
      <button type="button" className="pill-link" onClick={() => void share()} disabled={busy} style={{ gap: 8 }}>
        {busy && <Spinner size={12} />}
        {shareButtonLabel(label, busy, status)}
      </button>
      {error ? <p className="error" style={{ fontSize: ".78rem", margin: 0 }}>{error}</p> : null}
    </div>
  );
}
