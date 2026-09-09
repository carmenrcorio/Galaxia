import Link from "next/link";
import { formatPostDate, getCategory, type BlogPost } from "../../lib/blog";

export function BlogPostCard({ post }: { post: BlogPost }) {
  const category = getCategory(post.category);

  return (
    // Post routes are a single top-level dynamic segment (app/[slug]/page.tsx),
    // not individual hand-authored folders anymore — but `typedRoutes` still
    // can't verify this from `post.slug` alone, same escape marketing-nav.tsx
    // uses for its own config-driven hrefs.
    <Link href={`/${post.slug}` as never} className="blog-post-card">
      {category ? <span className="blog-post-card-tag">{category.label}</span> : null}
      <h2 className="blog-post-card-title">{post.title}</h2>
      <p className="blog-post-card-dek">{post.dek}</p>
      <p className="blog-post-card-meta">
        {post.publishedAt ? `${formatPostDate(post.publishedAt)} · ` : ""}
        {post.readTimeMinutes} min read
      </p>
    </Link>
  );
}
