import Link from "next/link";
import { formatPostDate, getCategory, type BlogPost } from "../../lib/blog";

export function BlogPostCard({
  post,
  variant = "index"
}: {
  post: BlogPost;
  variant?: "index" | "related";
}) {
  const category = getCategory(post.category);
  const related = variant === "related";

  return (
    // Post routes are a single top-level dynamic segment (app/[slug]/page.tsx),
    // not individual hand-authored folders anymore — but `typedRoutes` still
    // can't verify this from `post.slug` alone, same escape marketing-nav.tsx
    // uses for its own config-driven hrefs.
    <Link href={`/${post.slug}` as never} className="blog-post-card">
      {/* Graceful when hero_image_url is empty (e.g. the migrated synastry
          post, until Carmen assigns one through /admin/posts) — no thumbnail
          renders at all, never a broken-image box. Related cards show title
          and dek only. */}
      {!related && post.heroImageUrl ? <img className="blog-post-card-thumb" src={post.heroImageUrl} alt="" /> : null}
      {!related && category ? <span className="blog-post-card-tag">{category.label}</span> : null}
      <h2 className="blog-post-card-title">{post.title}</h2>
      <p className="blog-post-card-dek">{post.dek}</p>
      {variant !== "related" ? (
        <p className="blog-post-card-meta">
          {post.publishedAt ? `${formatPostDate(post.publishedAt)} · ` : ""}
          {post.readTimeMinutes} min read
        </p>
      ) : null}
    </Link>
  );
}
