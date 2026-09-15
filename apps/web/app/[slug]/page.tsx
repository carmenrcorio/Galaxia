import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleMarkdown } from "../../components/blog/article-markdown";
import { BlogHeader } from "../../components/blog/blog-header";
import { BlogPostCard } from "../../components/blog/blog-post-card";
import { ChartReadingCapture } from "../../components/blog/chart-reading-capture";
import { SiteFooter } from "../../components/marketing/site-footer";
import { JsonLd } from "../../components/seo/json-ld";
import {
  ARTICLE_TOC_LABEL,
  READ_NEXT_LABEL,
  extractH2Headings,
  midPostCtaHref,
  pickRelatedPosts
} from "../../lib/article-structure";
import { buildArticleJsonLd } from "../../lib/blog-article-json-ld";
import { buildPostMetadata } from "../../lib/blog-metadata";
import { formatPostDate, getPublishedPost, getPublishedPosts } from "../../lib/blog";

type Params = { slug: string };

/**
 * The one post template every blog article renders through — reads its
 * content from the `posts` table (lib/blog.ts -> getPublishedPost) rather
 * than being its own hand-authored JSX page per article the way
 * /synastry-chart-meaning used to be (see that route's own removal in this
 * same change). A single top-level dynamic segment, not nested under
 * /blog/[slug]: this keeps every existing post URL — the sitemap entry,
 * the OG `url` a share might already have cached, and the href
 * `<BlogPostCard>` already builds as `/${post.slug}` — pointing at exactly
 * the same path it did before this migration, no redirect needed. Next.js
 * App Router resolves a static route (e.g. /login, /chart, /admin) ahead
 * of a same-level dynamic segment, so this cannot shadow any real route in
 * `apps/web/app/*`.
 *
 * `getPublishedPost` only ever returns a `status = 'published'` row (both
 * via its own `.eq("status", "published")` filter and the `posts` RLS
 * policy underneath it — see the migration) — a draft slug, or a slug that
 * simply doesn't exist, both fall through to `notFound()` identically, so
 * this route can never be used to probe which slugs exist as drafts.
 */
export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return {};

  // Prefer the post's own stored hero for link previews; falls back to the
  // generic site OG card when hero_image_url is null.
  return buildPostMetadata(post);
}

export const revalidate = 60;

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const [post, published] = await Promise.all([getPublishedPost(slug), getPublishedPosts()]);
  if (!post) notFound();

  const toc = post.readTimeMinutes >= 5 ? extractH2Headings(post.body) : [];
  const related = pickRelatedPosts(published, post);
  const publishedLabel = post.publishedAt ? formatPostDate(post.publishedAt) : null;

  return (
    <>
      <JsonLd data={buildArticleJsonLd(post)} />
      <BlogHeader />
      <main className="container article-page article-content">
        <h1 className="auth-title article-title">{post.title}</h1>
        {post.heroImageUrl ? (
          <figure className="article-hero">
            <img src={post.heroImageUrl} alt="" width={1200} height={630} />
          </figure>
        ) : null}
        {/* FOUNDER-REVIEW: post byline row (author, date, read time). */}
        <p className="article-byline">
          {post.byline}
          {publishedLabel ? ` · ${publishedLabel}` : ""}
          {` · ${post.readTimeMinutes} min read`}
        </p>
        {toc.length > 0 ? (
          <nav className="article-toc" aria-label={ARTICLE_TOC_LABEL}>
            <p className="article-toc-label">{ARTICLE_TOC_LABEL}</p>
            <ol className="article-toc-list">
              {toc.map((heading) => (
                <li key={heading.id}>
                  <a href={`#${heading.id}`}>{heading.text}</a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        <ArticleMarkdown midCtaHref={midPostCtaHref(post.category)}>{post.body}</ArticleMarkdown>

        <ChartReadingCapture />

        {related.length > 0 ? (
          <section className="article-read-next" aria-labelledby="article-read-next-heading">
            <h2 id="article-read-next-heading" className="article-read-next-label">
              {READ_NEXT_LABEL}
            </h2>
            <div className="blog-post-list">
              {related.map((next) => (
                <BlogPostCard key={next.slug} post={next} variant="related" />
              ))}
            </div>
          </section>
        ) : null}

        <div className="article-cta">
          <a className="btn-primary" href="https://galaxiamea.com">
            Start 14 days free
          </a>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
