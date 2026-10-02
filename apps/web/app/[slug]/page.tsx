import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleDiagram } from "../../components/blog/article-diagram";
import { ArticleClosingCta } from "../../components/blog/article-closing-cta";
import { ArticleHero } from "../../components/blog/article-hero";
import { ArticleInlineImage } from "../../components/blog/article-inline-image";
import { ArticleIntroCta } from "../../components/blog/article-intro-cta";
import { ArticleMarkdown, buildInlineImagesMarkerMap } from "../../components/blog/article-markdown";
import { BlogHeader } from "../../components/blog/blog-header";
import { BlogPostCard } from "../../components/blog/blog-post-card";
import { BlogStickyCtaBar } from "../../components/blog/blog-sticky-cta-bar";
import { ChartReadingCapture } from "../../components/blog/chart-reading-capture";
import { SiteFooter } from "../../components/marketing/site-footer";
import { JsonLd } from "../../components/seo/json-ld";
import {
  ARTICLE_TOC_LABEL,
  READ_NEXT_LABEL,
  insertFigureAfterHeading,
  pickRelatedPosts,
  splitMarkdownBeforeFirstH2,
  tocHeadings
} from "../../lib/article-structure";
import { buildArticleJsonLd } from "../../lib/blog-article-json-ld";
import { buildPostMetadata } from "../../lib/blog-metadata";
import {
  BLOG_BYLINE,
  BLOG_INTRO_NOTE,
  BLOG_INTRO_NOTE_LINK,
  closingCtaForSlug,
  introCtaForSlug,
  showMidNewsletter
} from "../../lib/blog-cta";
import { injectInlineImageMarkers } from "../../lib/blog-inline-images";
import { BLOG_METHOD_PATH, getPublishedPost, getPublishedPosts } from "../../lib/blog";
import { formatUpdatedDate, postUpdatedIso } from "../../lib/blog-index";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return {};

  return buildPostMetadata(post);
}

export const revalidate = 60;

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const [post, published] = await Promise.all([getPublishedPost(slug), getPublishedPosts()]);
  if (!post) notFound();

  const bodyWithInline = injectInlineImageMarkers(post.body, post.inlineImages);
  const { before: introMarkdown, fromFirstH2: bodyMarkdown } = splitMarkdownBeforeFirstH2(bodyWithInline);
  const toc = tocHeadings(post.body);
  const related = pickRelatedPosts(published, {
    slug: post.slug,
    category: post.category,
    relatedSlugs: post.relatedSlugs
  });
  const updatedIso = postUpdatedIso(post.updatedAt, post.publishedAt);
  const introCta = introCtaForSlug(post.slug, post.category);
  const midNewsletter = showMidNewsletter(post.slug);
  const heroAlt = post.heroImageAlt?.trim() ?? "";
  const figureReady = Boolean(
    post.figureImageUrl?.trim() &&
      post.figureImageAlt?.trim() &&
      post.figureCaption?.trim() &&
      post.figureLongDescription?.trim()
  );
  const hasFirstH2 = Boolean(bodyMarkdown);
  const placed = figureReady && hasFirstH2
    ? insertFigureAfterHeading(bodyMarkdown, post.figureAfterHeading ?? "")
    : { markdown: bodyMarkdown, placement: "none" as const };
  if (figureReady && hasFirstH2 && placed.placement !== "named") {
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

  const inlineImagesByMarker = buildInlineImagesMarkerMap(post.inlineImages, (image) => (
    <ArticleInlineImage image={image} />
  ));

  const leadMarkdown = hasFirstH2 ? introMarkdown : "";
  const mainMarkdown = hasFirstH2 ? placed.markdown : introMarkdown;

  return (
    <>
      <JsonLd data={buildArticleJsonLd(post)} />
      <BlogHeader />
      <BlogStickyCtaBar slug={post.slug} cta={introCta} />
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
        <ArticleHero url={post.heroImageUrl} alt={heroAlt || null} credit={post.heroImageCredit} />
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
        {leadMarkdown ? (
          <ArticleMarkdown slug={post.slug} inlineImagesByMarker={inlineImagesByMarker}>
            {leadMarkdown}
          </ArticleMarkdown>
        ) : null}
        <ArticleIntroCta slug={post.slug} cta={introCta} />
        {mainMarkdown ? (
          <ArticleMarkdown
            slug={post.slug}
            showMidNewsletter={midNewsletter}
            figure={figure}
            inlineImagesByMarker={inlineImagesByMarker}
          >
            {mainMarkdown}
          </ArticleMarkdown>
        ) : null}

        <ArticleClosingCta slug={post.slug} cta={closingCtaForSlug(post.slug, post.category)} />

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
