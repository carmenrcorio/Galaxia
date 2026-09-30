import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleDiagram } from "../../components/blog/article-diagram";
import { ArticleClosingCta } from "../../components/blog/article-closing-cta";
import { ArticleMarkdown } from "../../components/blog/article-markdown";
import { BlogHeader } from "../../components/blog/blog-header";
import { BlogPostCard } from "../../components/blog/blog-post-card";
import { ChartReadingCapture } from "../../components/blog/chart-reading-capture";
import { SiteFooter } from "../../components/marketing/site-footer";
import { JsonLd } from "../../components/seo/json-ld";
import {
  ARTICLE_TOC_LABEL,
  READ_NEXT_LABEL,
  insertFigureAfterHeading,
  pickRelatedPosts,
  tocHeadings
} from "../../lib/article-structure";
import { buildArticleJsonLd } from "../../lib/blog-article-json-ld";
import { buildPostMetadata } from "../../lib/blog-metadata";
import { BLOG_BYLINE, BLOG_INTRO_NOTE, BLOG_INTRO_NOTE_LINK, closingCtaForSlug, inlineCtaHref } from "../../lib/blog-cta";
import { BLOG_METHOD_PATH, getPublishedPost, getPublishedPosts } from "../../lib/blog";
import { formatUpdatedDate, postUpdatedIso } from "../../lib/blog-index";

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

  const toc = tocHeadings(post.body);
  const related = pickRelatedPosts(published, {
    slug: post.slug,
    category: post.category,
    relatedSlugs: post.relatedSlugs
  });
  const updatedIso = postUpdatedIso(post.updatedAt, post.publishedAt);
  const inlineHref = inlineCtaHref(post.slug);
  const heroAlt = post.heroImageAlt?.trim() ?? "";
  const figureReady = Boolean(
    post.figureImageUrl?.trim() &&
      post.figureImageAlt?.trim() &&
      post.figureCaption?.trim() &&
      post.figureLongDescription?.trim()
  );
  const placed = figureReady
    ? insertFigureAfterHeading(post.body, post.figureAfterHeading ?? "")
    : { markdown: post.body, placement: "none" as const };
  if (figureReady && placed.placement !== "named") {
    console.warn(
      `[blog] figure heading not found for ${post.slug} ("${post.figureAfterHeading ?? ""}"); placed after the first section`
    );
  }
  const figure = figureReady ? (
    <ArticleDiagram
      src={post.figureImageUrl ?? ""}
      alt={post.figureImageAlt ?? ""}
      caption={post.figureCaption ?? ""}
      longDescription={post.figureLongDescription ?? ""}
      width={1200}
      height={700}
    />
  ) : null;

  return (
    <>
      <JsonLd data={buildArticleJsonLd(post)} />
      <BlogHeader />
      <main className="container article-page article-content">
        <h1 className="auth-title article-title">{post.title}</h1>
        <p className="article-byline">
          {BLOG_BYLINE}
          {updatedIso ? (
            <>
              {" · Updated "}
              <time dateTime={updatedIso}>{formatUpdatedDate(updatedIso)}</time>
            </>
          ) : null}
          {` · ${post.readTimeMinutes} min read`}
        </p>
        <p className="article-intro-note">
          {BLOG_INTRO_NOTE}{" "}
          <Link href={BLOG_METHOD_PATH}>{BLOG_INTRO_NOTE_LINK}</Link>
        </p>
        {post.methodNote ? <p className="article-method-note">{post.methodNote}</p> : null}
        {post.heroImageUrl && heroAlt ? (
          <figure className="article-hero">
            <Image src={post.heroImageUrl} alt={heroAlt} width={1600} height={840} priority />
          </figure>
        ) : post.heroImageUrl ? (
          <figure className="article-hero">
            <img src={post.heroImageUrl} alt="" width={1200} height={630} />
          </figure>
        ) : null}
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
        <ArticleMarkdown midCtaHref={inlineHref ?? undefined} slug={post.slug} figure={figure}>
          {placed.markdown}
        </ArticleMarkdown>

        <ArticleClosingCta slug={post.slug} cta={closingCtaForSlug(post.slug)} />

        <ChartReadingCapture slug={post.slug} />

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
      </main>
      <SiteFooter />
    </>
  );
}
