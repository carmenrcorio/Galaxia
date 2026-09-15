import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { missingEnvMessage, publicEnv } from "../../../../lib/env";
import { privateEnv } from "../../../../lib/env.server";
import { getPostForAdminBySlugOrId, type AdminPostDetail } from "../../../../lib/admin/posts";
import { listBlogImages, type BlogImage } from "../../../../lib/admin/post-images";
import { BLOG_CATEGORIES } from "../../../../lib/blog";
import { PostEditorForm } from "../../../../components/admin/post-editor-form";

/**
 * Admin post editor at `/admin/posts/{slug}`. Renders behind
 * `app/admin/layout.tsx`'s `requireAdmin()` call (admin_users + isAdmin,
 * the same gate as `/admin/analytics`). No owner-email special case, and
 * no guard call here.
 */
export default async function EditAdminPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

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
  let images: BlogImage[] = [];
  let loadError: string | null = null;
  let imageWarning: string | null = null;
  try {
    post = await getPostForAdminBySlugOrId(serviceRoleClient, slug);
  } catch {
    loadError = "Couldn't load this post. Please try again.";
  }
  try {
    images = await listBlogImages(serviceRoleClient);
  } catch {
    imageWarning = "Couldn't load images from blog-images. You can still edit the post.";
  }

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <div>
        <Link href="/admin/posts" className="pill-link" style={{ width: "fit-content" }}>
          ← Back to posts
        </Link>
      </div>

      {loadError ? <p className="error">{loadError}</p> : null}
      {imageWarning ? <p className="error">{imageWarning}</p> : null}

      {!loadError && !post ? (
        <div className="glass-card">
          <p className="eyebrow">Admin</p>
          <h1 className="page-title" style={{ fontSize: "1.6rem" }}>Post not found</h1>
          <p className="muted">No post matches this slug. It may have been deleted, or the link may be incorrect.</p>
        </div>
      ) : null}

      {post ? (
        <>
          <div>
            <p className="eyebrow">Admin</p>
            <h1 className="page-title" style={{ fontSize: "1.9rem" }}>{post.title}</h1>
          </div>
          <PostEditorForm mode="edit" categories={BLOG_CATEGORIES} post={post} images={images} />
        </>
      ) : null}
    </section>
  );
}
