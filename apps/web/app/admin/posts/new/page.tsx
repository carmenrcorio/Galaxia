import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { PostEditorForm } from "../../../../components/admin/post-editor-form";
import { BLOG_CATEGORIES } from "../../../../lib/blog";
import { listBlogImages, type BlogImage } from "../../../../lib/admin/post-images";
import { missingEnvMessage, publicEnv } from "../../../../lib/env";
import { privateEnv } from "../../../../lib/env.server";

/**
 * New-post editor. Same requireAdmin() layout gate as every /admin page.
 * Loads the blog-images bucket so the hero/body pickers work before the
 * first save.
 */
export default async function NewAdminPostPage() {
  let images: BlogImage[] = [];
  let loadError: string | null = null;

  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    loadError = missingEnvMessage("SUPABASE_SERVICE_ROLE_KEY");
  } else {
    const serviceRoleClient = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
      auth: { persistSession: false }
    });
    try {
      images = await listBlogImages(serviceRoleClient);
    } catch {
      loadError = "Couldn't load images. You can still write the post and try the picker after saving.";
    }
  }

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
      {loadError ? <p className="error">{loadError}</p> : null}
      <PostEditorForm mode="create" categories={BLOG_CATEGORIES} images={images} />
    </section>
  );
}
