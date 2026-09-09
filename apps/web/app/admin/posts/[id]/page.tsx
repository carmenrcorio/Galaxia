import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { missingEnvMessage, publicEnv } from "../../../../lib/env";
import { privateEnv } from "../../../../lib/env.server";
import { getPostForAdmin, type AdminPostDetail } from "../../../../lib/admin/posts";
import { BLOG_CATEGORIES } from "../../../../lib/blog";
import { PostEditorForm } from "../../../../components/admin/post-editor-form";

export default async function EditAdminPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return (
      <section className="glass-card">
        <h1 className="page-title" style={{ fontSize: "1.6rem" }}>Post</h1>
        <p className="error">{missingEnvMessage("SUPABASE_SERVICE_ROLE_KEY")}</p>
      </section>
    );
  }

  const serviceRoleClient = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
    auth: { persistSession: false }
  });

  let post: AdminPostDetail | null = null;
  let loadError: string | null = null;
  try {
    post = await getPostForAdmin(serviceRoleClient, id);
  } catch {
    loadError = "Couldn't load this post. Please try again.";
  }

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <div>
        <Link href="/admin/posts" className="pill-link" style={{ width: "fit-content" }}>
          ← Back to posts
        </Link>
      </div>

      {loadError ? <p className="error">{loadError}</p> : null}

      {!loadError && !post ? (
        <div className="glass-card">
          <p className="eyebrow">Admin</p>
          <h1 className="page-title" style={{ fontSize: "1.6rem" }}>Post not found</h1>
          <p className="muted">No post matches this id. It may have been deleted, or the link may be incorrect.</p>
        </div>
      ) : null}

      {post ? (
        <>
          <div>
            <p className="eyebrow">Admin</p>
            <h1 className="page-title" style={{ fontSize: "1.9rem" }}>{post.title}</h1>
          </div>
          <PostEditorForm mode="edit" categories={BLOG_CATEGORIES} post={post} />
        </>
      ) : null}
    </section>
  );
}
