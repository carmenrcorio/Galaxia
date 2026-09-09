import Link from "next/link";
import { PostEditorForm } from "../../../../components/admin/post-editor-form";
import { BLOG_CATEGORIES } from "../../../../lib/blog";

export default function NewAdminPostPage() {
  return (
    <section style={{ display: "grid", gap: 20 }}>
      <div>
        <Link href="/admin/posts" className="pill-link" style={{ width: "fit-content" }}>
          ← Back to posts
        </Link>
      </div>
      <div>
        <p className="eyebrow">Admin</p>
        <h1 className="page-title" style={{ fontSize: "1.9rem" }}>New post</h1>
      </div>
      <PostEditorForm mode="create" categories={BLOG_CATEGORIES} />
    </section>
  );
}
