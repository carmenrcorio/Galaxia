"use client";

import { useState, type RefObject } from "react";
import { toSvg } from "html-to-image";
import { Spinner } from "./spinner";

/**
 * Rasterizes `node` the same way html-to-image's `toPng` does internally
 * (`toSvg` → `<img>` → `<canvas>`), except it strips `backdrop-filter` /
 * `-webkit-backdrop-filter` from the baked SVG before decoding it to an
 * image. Chromium leaves everything below/around an element with an active
 * backdrop-filter unpainted when it rasterizes html-to-image's
 * foreignObject-based SVG onto a canvas, which clipped the bottom of the
 * export (the MC label and the watermark) even though the DOM itself was
 * complete. The filter blurs whatever sits *behind* the card, which a
 * static export has already flattened away, so dropping it here costs
 * nothing visually (same pattern already used by
 * `.quick-chart-entry-reveal.glass-card` in globals.css).
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
    img.onerror = () => reject(new Error("Could not create the image."));
    img.src = fixedDataUrl;
  });
  await img.decode().catch(() => {});

  const canvas = document.createElement("canvas");
  canvas.width = (img.naturalWidth || node.clientWidth) * options.pixelRatio;
  canvas.height = (img.naturalHeight || node.clientHeight) * options.pixelRatio;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = options.backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL();
}

/**
 * "Share" — captures the referenced DOM node as a PNG (client-side only,
 * nothing is uploaded or persisted) and hands it to the OS share sheet when
 * available, falling back to a direct download. Used directly by the
 * Memorial Timeline's "viral screenshot" share card, and via the shared
 * `ShareExportCard` wrapper by every biwheel/galaxy export call site — all
 * of them render a permanent `<ShareWatermark />` inside the captured node,
 * so the exported image always carries the "galaxiamea.com" mark.
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
}: {
  targetRef: RefObject<HTMLElement | null>;
  filename: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function share() {
    if (busy || !targetRef.current) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const dataUrl = await toPngWithoutBackdropFilterClip(targetRef.current, {
        pixelRatio: 2,
        backgroundColor: "#0a0717",
        cacheBust: true,
      });

      if (typeof navigator !== "undefined" && navigator.share && navigator.canShare) {
        try {
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], filename, { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file] });
            setStatus("Shared");
            return;
          }
        } catch (shareErr) {
          // A cancelled OS share sheet is not an error — just fall through
          // to the direct download below without surfacing anything red.
          if (shareErr instanceof DOMException && shareErr.name === "AbortError") return;
        }
      }

      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      link.click();
      setStatus("Image saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 6, justifyItems: "center" }}>
      <button type="button" className="pill-link" onClick={() => void share()} disabled={busy} style={{ gap: 8 }}>
        {busy && <Spinner size={12} />}
        {busy ? "Creating image…" : status ?? label}
      </button>
      {error ? <p className="error" style={{ fontSize: ".78rem", margin: 0 }}>{error}</p> : null}
    </div>
  );
}
