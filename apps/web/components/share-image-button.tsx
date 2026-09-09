"use client";

import { useState, type RefObject } from "react";
import { toPng } from "html-to-image";
import { Spinner } from "./spinner";

/**
 * "Share" — captures the referenced DOM node as a PNG (client-side only,
 * nothing is uploaded or persisted) and hands it to the OS share sheet when
 * available, falling back to a direct download. Used by the Memorial
 * Timeline and Family Chart Comparison "viral screenshot" share cards — both
 * render a permanent `<ShareWatermark />` inside the captured node, so the
 * exported image always carries the "galaxiamea.com" mark.
 *
 * Deliberately does NOT reuse the public /api/quick-share pipeline: that
 * stack mints an unauthenticated, anyone-with-the-link page for the public
 * Quick Chart funnel. Memorial milestones and a family's chart placements
 * are private, owner-authored data — the right "share" here is an image the
 * owner controls, not a new public URL into the app's data.
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
      const dataUrl = await toPng(targetRef.current, {
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
