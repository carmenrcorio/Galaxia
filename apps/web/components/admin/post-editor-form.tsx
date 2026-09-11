"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { BlogCategory, BlogCategorySlug } from "../../lib/blog";
import { slugify } from "../../lib/slugify";
import type { AdminPostDetail } from "../../lib/admin/posts";

/**
 * Create/edit form for one `posts` row, shared by `/admin/posts/new` and
 * `/admin/posts/[id]`. POSTs/PATCHes the guarded `/api/admin/posts[/id]`
 * routes (validate + write + audit log all happen there, not here — this
 * component has no privileged logic of its own, same contract
 * `CompActionButton`/`ResendEmailButton` follow).
 *
 * The body editor is a plain markdown textarea with an "Insert image"
 * button, per the v1 scope this was built for: this repo has
 * `react-markdown`/`remark-gfm` for the READ side (app/[slug]/page.tsx)
 * but no rich-text/WYSIWYG editor dependency, so a full editor would be a
 * new dependency this task didn't ask for. "Insert image" uploads through
 * the same `/api/admin/posts/images` endpoint the hero-image field uses,
 * then splices `![](url)` into the textarea at the current cursor
 * position — enough to author inline images without hand-typing markdown
 * image syntax or a URL.
 */
export function PostEditorForm({
  mode,
  categories,
  post
}: {
  mode: "create" | "edit";
  categories: BlogCategory[];
  post?: AdminPostDetail;
}) {
  const router = useRouter();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const insertFileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [dek, setDek] = useState(post?.dek ?? "");
  const [category, setCategory] = useState<BlogCategorySlug>(post?.category ?? categories[0]?.slug ?? "guides");
  const [body, setBody] = useState(post?.body ?? "");
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(post?.hero_image_url ?? null);
  const [status, setStatus] = useState<"draft" | "published">(post?.status ?? "draft");

  const [heroUploading, setHeroUploading] = useState(false);
  const [insertUploading, setInsertUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/admin/posts/images", { method: "POST", body: formData });
    const responseBody = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok || !responseBody.url) {
      throw new Error(responseBody.error ?? "Couldn't upload the image. Please try again.");
    }
    return responseBody.url;
  }

  async function onHeroFileSelected(file: File | undefined) {
    if (!file) return;
    setError(null);
    setHeroUploading(true);
    try {
      const url = await uploadImage(file);
      setHeroImageUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload the hero image.");
    } finally {
      setHeroUploading(false);
      if (heroFileInputRef.current) heroFileInputRef.current.value = "";
    }
  }

  async function onInsertImageFileSelected(file: File | undefined) {
    if (!file) return;
    setError(null);
    setInsertUploading(true);
    try {
      const url = await uploadImage(file);
      const textarea = bodyRef.current;
      const markdownImage = `![${file.name.replace(/\.[^.]+$/, "")}](${url})`;
      if (textarea) {
        const start = textarea.selectionStart ?? body.length;
        const end = textarea.selectionEnd ?? body.length;
        const next = `${body.slice(0, start)}${markdownImage}\n${body.slice(end)}`;
        setBody(next);
        // Restore focus + caret just after the inserted markdown, next tick
        // (after React has committed the new value to the textarea).
        requestAnimationFrame(() => {
          const caret = start + markdownImage.length + 1;
          textarea.focus();
          textarea.setSelectionRange(caret, caret);
        });
      } else {
        setBody((prev) => `${prev}\n${markdownImage}\n`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload the image.");
    } finally {
      setInsertUploading(false);
      if (insertFileInputRef.current) insertFileInputRef.current.value = "";
    }
  }

  async function onSave() {
    setError(null);
    if (!title.trim()) {
      setError("Title is required.");
      return;
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
      const responseBody = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(responseBody.error ?? "Couldn't save the post. Please try again.");
        return;
      }
      router.push("/admin/posts");
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
            {/* FOUNDER-REVIEW: rewritten (no U+2014). */}
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
        <span className="muted" style={{ fontSize: ".78rem", fontWeight: 600 }}>Hero image</span>
        {heroImageUrl ? (
          <div style={{ display: "grid", gap: 10 }}>
            <img
              src={heroImageUrl}
              alt=""
              style={{ width: "100%", maxWidth: 420, borderRadius: 14, border: "1px solid rgba(230,174,108,.2)" }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="pill-link" onClick={() => heroFileInputRef.current?.click()} disabled={heroUploading}>
                {heroUploading ? "Uploading…" : "Replace image"}
              </button>
              <button type="button" className="pill-link" onClick={() => setHeroImageUrl(null)}>
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="pill-link" onClick={() => heroFileInputRef.current?.click()} disabled={heroUploading}>
            {heroUploading ? "Uploading…" : "Upload hero image"}
          </button>
        )}
        <input
          ref={heroFileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          style={{ display: "none" }}
          onChange={(e) => void onHeroFileSelected(e.target.files?.[0])}
        />
      </div>

      <div className="glass-card" style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="muted" style={{ fontSize: ".78rem", fontWeight: 600 }}>Body (Markdown)</span>
          <button type="button" className="pill-link" onClick={() => insertFileInputRef.current?.click()} disabled={insertUploading}>
            {insertUploading ? "Uploading…" : "Insert image"}
          </button>
          <input
            ref={insertFileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            style={{ display: "none" }}
            onChange={(e) => void onInsertImageFileSelected(e.target.files?.[0])}
          />
        </div>
        <textarea
          ref={bodyRef}
          className="field field--rect"
          rows={20}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          style={{ fontFamily: "var(--mono, monospace)", fontSize: ".88rem", lineHeight: 1.6 }}
          placeholder={"## A section heading\n\nA paragraph. **Bold** and *italic* work. Use \"Insert image\" above to add a photo inline."}
        />
      </div>

      <div className="glass-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
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

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {mode === "edit" ? (
            <button type="button" className="pill-link" onClick={() => void onDelete()} disabled={busy}>
              {deleting ? "Deleting…" : "Delete post"}
            </button>
          ) : null}
          <button type="button" className="pill-link--gold" onClick={() => void onSave()} disabled={busy}>
            {saving ? "Saving…" : mode === "create" ? "Create post" : "Save changes"}
          </button>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
