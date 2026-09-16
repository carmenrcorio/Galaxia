"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BlogCategory, BlogCategorySlug } from "../../lib/blog";
import { slugify } from "../../lib/slugify";
import type { AdminPostDetail } from "../../lib/admin/posts";
import type { BlogImage } from "../../lib/admin/post-images";
import {
  countBodyWords,
  insertImageAfter,
  moveBlock,
  parseBodyBlocks,
  removeBlock,
  serializeBodyBlocks,
  shouldWarnBeforeBodySave,
  type BodyBlock
} from "../../lib/admin/post-body-blocks";
import { PostImageChooser } from "./post-image-chooser";
import { PostImagePicker } from "./post-image-picker";

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatLastSaved(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "unknown";
  const day = String(at.getUTCDate());
  const month = SHORT_MONTHS[at.getUTCMonth()];
  const year = at.getUTCFullYear();
  const hour = String(at.getUTCHours()).padStart(2, "0");
  const minute = String(at.getUTCMinutes()).padStart(2, "0");
  return `${day} ${month} ${year}, ${hour}:${minute} UTC`;
}

/**
 * Create/edit form for one `posts` row, shared by `/admin/posts/new` and
 * `/admin/posts/[slug]`. POSTs/PATCHes the guarded `/api/admin/posts[/id]`
 * routes (validate + write + audit log all happen there, not here).
 *
 * Photo management is the load-bearing work: hero is chosen from the
 * `blog-images` bucket or uploaded to `blog-images/photos/`; the body is
 * a list of heading/paragraph/image blocks that can be reordered and have
 * images inserted after any block. One explicit Save writes body +
 * hero_image_url (and the rest of the row). No auto-save.
 */
export function PostEditorForm({
  mode,
  categories,
  post,
  images
}: {
  mode: "create" | "edit";
  categories: BlogCategory[];
  post?: AdminPostDetail;
  images: BlogImage[];
}) {
  const router = useRouter();

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [dek, setDek] = useState(post?.dek ?? "");
  const [category, setCategory] = useState<BlogCategorySlug>(post?.category ?? categories[0]?.slug ?? "guides");
  const [blocks, setBlocks] = useState<BodyBlock[]>(() => parseBodyBlocks(post?.body ?? ""));
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(post?.hero_image_url ?? null);
  const [status, setStatus] = useState<"draft" | "published">(post?.status ?? "draft");
  const [imageList, setImageList] = useState<BlogImage[]>(images);

  const [pickerAfterIndex, setPickerAfterIndex] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(post?.updated_at ?? null);

  const body = serializeBodyBlocks(blocks);
  const wordCount = countBodyWords(body);

  function onTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function rememberImage(url: string, name: string) {
    setImageList((prev) => {
      if (prev.some((image) => image.url === url)) return prev;
      const path = name.includes("/") ? name : `photos/${name}`;
      return [...prev, { path, name: path.split("/").pop() ?? name, url }].sort((a, b) =>
        a.path.localeCompare(b.path)
      );
    });
  }

  function applyPickedImage(image: { url: string; name: string }, afterIndex: number) {
    rememberImage(image.url, image.name);
    setBlocks((prev) => insertImageAfter(prev, afterIndex, image.url, image.name));
  }

  function onHeroPicked(image: { url: string; name: string }) {
    rememberImage(image.url, image.name);
    setHeroImageUrl(image.url);
  }

  async function onSave() {
    setError(null);
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (shouldWarnBeforeBodySave(body)) {
      const confirmed = window.confirm(
        `This body is over 10,000 words (${wordCount.toLocaleString("en-US")}). Saving rewrites the entire body column. Continue?`
      );
      if (!confirmed) return;
    }
    setSaving(true);
    try {
      const payload = {
        title,
        slug: slug || slugify(title),
        dek,
        category,
        body,
        heroImageUrl,
        status
      };
      const res = await fetch(mode === "create" ? "/api/admin/posts" : `/api/admin/posts/${post!.id}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const responseBody = (await res.json().catch(() => ({}))) as {
        error?: string;
        post?: AdminPostDetail;
      };
      if (!res.ok) {
        setError(responseBody.error ?? "Couldn't save the post. Please try again.");
        return;
      }
      const saved = responseBody.post;
      setLastSavedAt(saved?.updated_at ?? new Date().toISOString());
      if (mode === "create" && saved?.slug) {
        router.push(`/admin/posts/${saved.slug}` as never);
        router.refresh();
        return;
      }
      if (saved?.slug && saved.slug !== slug) {
        router.replace(`/admin/posts/${saved.slug}` as never);
      }
      router.refresh();
    } catch {
      setError("Couldn't save the post. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!post) return;
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/posts/${post.id}`, { method: "DELETE" });
      const responseBody = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(responseBody.error ?? "Couldn't delete the post. Please try again.");
        return;
      }
      router.push("/admin/posts");
      router.refresh();
    } catch {
      setError("Couldn't delete the post. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  const busy = saving || deleting;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div className="glass-card" style={{ display: "grid", gap: 16 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span className="muted" style={{ fontSize: ".78rem", fontWeight: 600 }}>Title</span>
          <input
            className="field"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="What a Synastry Chart Actually Tells You About Your Relationship"
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span className="muted" style={{ fontSize: ".78rem", fontWeight: 600 }}>
                        Slug <span style={{ opacity: 0.7 }}>: the post will live at /{slug || "…"}</span>
          </span>
          <input
            className="field"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
            placeholder="synastry-chart-meaning"
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span className="muted" style={{ fontSize: ".78rem", fontWeight: 600 }}>Dek (short summary)</span>
          <textarea
            className="field field--rect"
            rows={2}
            value={dek}
            onChange={(e) => setDek(e.target.value)}
            placeholder="Not a compatibility score. A synastry chart maps where two people flow easily…"
          />
        </label>

        <label style={{ display: "grid", gap: 6, maxWidth: 280 }}>
          <span className="muted" style={{ fontSize: ".78rem", fontWeight: 600 }}>Category</span>
          <select
            className="field field--rect"
            value={category}
            onChange={(e) => setCategory(e.target.value as BlogCategorySlug)}
          >
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="glass-card" style={{ display: "grid", gap: 12 }}>
        <h2 className="admin-editor-section-title">Hero image</h2>
        {heroImageUrl ? (
          <img
            src={heroImageUrl}
            alt=""
            style={{ width: "100%", maxWidth: 420, borderRadius: 14, border: "1px solid rgba(230,174,108,.2)" }}
          />
        ) : (
          <p className="muted">none set</p>
        )}
        <PostImageChooser
          images={imageList}
          selectedUrl={heroImageUrl}
          disabled={busy}
          onSelectUrl={setHeroImageUrl}
          onPicked={onHeroPicked}
        />
        {heroImageUrl ? (
          <button type="button" className="pill-link" onClick={() => setHeroImageUrl(null)} disabled={busy}>
            Remove hero image
          </button>
        ) : null}
      </div>

      <div className="glass-card" style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h2 className="admin-editor-section-title">Body photo blocks</h2>
          <p className="muted" style={{ fontSize: ".78rem" }}>
            {wordCount.toLocaleString("en-US")} {wordCount === 1 ? "word" : "words"}
          </p>
        </div>

        {blocks.length === 0 ? (
          <div style={{ display: "grid", gap: 10 }}>
            <p className="muted">No body blocks yet.</p>
            <button type="button" className="pill-link" onClick={() => setPickerAfterIndex(-1)} disabled={busy}>
              Insert image
            </button>
          </div>
        ) : (
          <ol className="post-block-list">
            {blocks.map((block, index) => (
              <li
                key={block.id}
                className={dragIndex === index ? "post-block post-block--dragging" : "post-block"}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = Number(e.dataTransfer.getData("text/plain"));
                  setBlocks((prev) => moveBlock(prev, from, index));
                  setDragIndex(null);
                }}
              >
                <button
                  type="button"
                  className="post-block-handle"
                  draggable
                  aria-label={`Reorder block ${index + 1}`}
                  onDragStart={(e) => {
                    setDragIndex(index);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", String(index));
                  }}
                  onDragEnd={() => setDragIndex(null)}
                >
                  <span aria-hidden="true">::</span>
                </button>

                <div className="post-block-body">
                  {block.kind === "image" && block.url ? (
                    <div className="post-block-image">
                      <img src={block.url} alt={block.alt || ""} className="post-block-thumb" />
                      <p className="muted" style={{ fontSize: ".78rem", wordBreak: "break-all" }}>
                        {block.alt || "photo"}
                      </p>
                      <button
                        type="button"
                        className="pill-link"
                        onClick={() => setBlocks((prev) => removeBlock(prev, index))}
                        disabled={busy}
                      >
                        Remove image
                      </button>
                    </div>
                  ) : (
                    <textarea
                      className="field field--rect"
                      rows={block.kind === "heading" ? 2 : 5}
                      value={block.markdown}
                      onChange={(e) => {
                        const markdown = e.target.value;
                        setBlocks((prev) =>
                          prev.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, markdown } : item
                          )
                        );
                      }}
                      style={{ fontFamily: "var(--mono, monospace)", fontSize: ".88rem", lineHeight: 1.6 }}
                    />
                  )}
                </div>

                <button
                  type="button"
                  className="pill-link"
                  onClick={() => setPickerAfterIndex(index)}
                  disabled={busy}
                >
                  Insert image after
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="glass-card" style={{ display: "grid", gap: 14 }}>
        <h2 className="admin-editor-section-title">Save</h2>
        <p className="muted">
          {lastSavedAt ? `Last saved ${formatLastSaved(lastSavedAt)}` : "Not saved yet"}
        </p>
        <div role="radiogroup" aria-label="Publish status" style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className={status === "draft" ? "pill-link--gold" : "pill-link"}
            aria-pressed={status === "draft"}
            onClick={() => setStatus("draft")}
          >
            Draft
          </button>
          <button
            type="button"
            className={status === "published" ? "pill-link--gold" : "pill-link"}
            aria-pressed={status === "published"}
            onClick={() => setStatus("published")}
          >
            Published
          </button>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {mode === "edit" ? (
            <button type="button" className="pill-link" onClick={() => void onDelete()} disabled={busy}>
              {deleting ? "Deleting…" : "Delete post"}
            </button>
          ) : null}
          <button type="button" className="pill-link--gold" onClick={() => void onSave()} disabled={busy}>
            {saving ? "Saving…" : mode === "create" ? "Create post" : "Save"}
          </button>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}

      {pickerAfterIndex !== null ? (
        <PostImagePicker
          images={imageList}
          onPick={(image) => applyPickedImage(image, pickerAfterIndex)}
          onClose={() => setPickerAfterIndex(null)}
        />
      ) : null}
    </div>
  );
}
