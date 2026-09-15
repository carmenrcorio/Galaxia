"use client";

import { useEffect } from "react";
import type { BlogImage } from "../../lib/admin/post-images";
import { PostImageChooser } from "./post-image-chooser";

/**
 * Overlay picker for "Insert image after". Same Storage dropdown + upload
 * as the hero chooser. Closes after a pick; Escape / backdrop click cancel.
 */
export function PostImagePicker({
  images,
  onPick,
  onClose
}: {
  images: BlogImage[];
  onPick: (image: { url: string; name: string }) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="post-image-picker-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="glass-card post-image-picker-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-image-picker-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="post-image-picker-title" className="page-title" style={{ fontSize: "1.25rem" }}>
          Insert image
        </h2>
        <p className="muted">Pick a file from blog-images or upload a photo.</p>
        <PostImageChooser
          images={images}
          onPicked={(image) => {
            onPick(image);
            onClose();
          }}
        />
        <button type="button" className="pill-link" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
