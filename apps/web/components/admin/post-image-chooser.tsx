"use client";

import { useRef, useState } from "react";
import type { BlogImage } from "../../lib/admin/post-images";

/**
 * Shared Storage dropdown + local-file upload for the admin post editor.
 * Hero uses it inline; body "Insert image after" uses it inside the picker.
 * Uploads go through `/api/admin/posts/images` (requireAdminApi on the
 * route). This component has no privileged logic of its own.
 */
export function PostImageChooser({
  images,
  selectedUrl,
  onSelectUrl,
  onPicked,
  disabled
}: {
  images: BlogImage[];
  selectedUrl?: string | null;
  onSelectUrl?: (url: string | null) => void;
  onPicked: (image: { url: string; name: string }) => void;
  disabled?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = images.slice();
  if (selectedUrl && !options.some((image) => image.url === selectedUrl)) {
    options.unshift({ path: selectedUrl, name: "Current (not in blog-images)", url: selectedUrl });
  }

  async function onFileSelected(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/posts/images", { method: "POST", body: formData });
      const responseBody = (await res.json().catch(() => ({}))) as {
        url?: string;
        path?: string;
        error?: string;
      };
      if (!res.ok || !responseBody.url) {
        throw new Error(responseBody.error ?? "Couldn't upload the image. Please try again.");
      }
      onPicked({ url: responseBody.url, name: file.name.replace(/\.[^.]+$/, "") });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload the image.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const busy = disabled || uploading;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span className="muted" style={{ fontSize: ".78rem", fontWeight: 600 }}>
          Images in blog-images
        </span>
        <select
          className="field field--rect"
          value={selectedUrl ?? ""}
          disabled={busy}
          onChange={(e) => {
            const url = e.target.value || null;
            onSelectUrl?.(url);
            if (url && !onSelectUrl) {
              const match = options.find((image) => image.url === url);
              onPicked({ url, name: match?.name.replace(/\.[^.]+$/, "") ?? "photo" });
            }
          }}
        >
          {!selectedUrl ? <option value="">Choose an image</option> : null}
          {options.map((image) => (
            <option key={image.path} value={image.url}>
              {image.path}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span className="muted" style={{ fontSize: ".78rem", fontWeight: 600 }}>
          Upload to blog-images/photos
        </span>
        <input
          ref={fileInputRef}
          className="field field--rect"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          disabled={busy}
          onChange={(e) => void onFileSelected(e.target.files?.[0])}
        />
      </label>

      {uploading ? <p className="muted">Uploading…</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
