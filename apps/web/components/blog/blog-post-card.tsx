import Image from "next/image";
import { BlogTrackedLink } from "./blog-analytics";
import { BLOG_ABOUT_TAG, formatPostDate, getCategory, type BlogPost } from "../../lib/blog";
import {
  BLOG_ANALYTICS,
  BLOG_TIMELY_BADGE,
  cardThumbnailSrc,
  isTimelyActive
} from "../../lib/blog-index";

export function BlogPostCard({
  post,
  variant = "index",
  placement = "feed"
}: {
  post: BlogPost;
  variant?: "index" | "related";
  placement?: "feed" | "start-here";
}) {
  const category = getCategory(post.category);
  const related = variant === "related";
  const thumb = related ? null : cardThumbnailSrc(post.slug, post.heroImageUrl);
  const showBadge = !related && isTimelyActive(post);
  const showTag = !related && (post.aboutGalaxia || Boolean(category));
  const event =
    variant === "related"
      ? BLOG_ANALYTICS.readNext
      : placement === "start-here"
        ? BLOG_ANALYTICS.startHere
        : BLOG_ANALYTICS.card;

  return (
    // Post routes are a single top-level dynamic segment (app/[slug]/page.tsx),
    // not individual hand-authored folders. `typedRoutes` still can't verify
    // this from `post.slug` alone, the same escape marketing-nav.tsx uses for
    // its own config-driven hrefs.
    <BlogTrackedLink
      href={`/${post.slug}`}
      className={`blog-post-card${placement === "start-here" ? " blog-post-card--start" : ""}`}
      event={event}
      slug={post.slug}
    >
      {/* alt is empty because the card title is the accessible name of the
          link. The frame keeps a 16:9 box so the image cannot shift layout. */}
      {thumb ? (
        <span className="blog-post-card-thumb">
          <Image
            src={thumb}
            alt=""
            width={1600}
            height={900}
            sizes={placement === "start-here" ? "(max-width: 720px) 100vw, 280px" : "(max-width: 860px) 100vw, 860px"}
            loading="lazy"
            style={{ width: "100%", height: "auto", objectFit: "cover" }}
          />
        </span>
      ) : null}
      {showTag || showBadge ? (
        <span className="blog-post-card-tags">
          {post.aboutGalaxia ? (
            <span className="blog-post-card-tag">{BLOG_ABOUT_TAG}</span>
          ) : category ? (
            <span className="blog-post-card-tag">{category.label}</span>
          ) : null}
          {showBadge ? <span className="blog-post-card-badge">{BLOG_TIMELY_BADGE}</span> : null}
        </span>
      ) : null}
      <h2 className="blog-post-card-title">{post.title}</h2>
      <p className="blog-post-card-dek">{post.dek}</p>
      {variant !== "related" ? (
        <p className="blog-post-card-meta">
          {post.isTimely && post.publishedAt ? `${formatPostDate(post.publishedAt)} · ` : ""}
          {post.readTimeMinutes} min read
        </p>
      ) : null}
    </BlogTrackedLink>
  );
}
