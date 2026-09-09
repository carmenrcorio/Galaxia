import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { notFound } from "next/navigation";
import { BlogHeader } from "../../components/blog/blog-header";
import { SiteFooter } from "../../components/marketing/site-footer";
import { getPublishedPost } from "../../lib/blog";

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

  // Prefer the post's own hero image for link previews once one is set
  // (Part C); falls back to the generic site OG card exactly like before
  // for a post that has none yet.
  const ogImage = post.heroImageUrl
    ? [{ url: post.heroImageUrl, alt: post.title }]
    : [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia — astrology for the people you love" }];

  return {
    title: post.title,
    description: post.dek,
    openGraph: {
      title: post.title,
      description: post.dek,
      siteName: "Galaxia",
      type: "article",
      url: `/${post.slug}`,
      images: ogImage
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.dek,
      images: ogImage
    }
  };
}

export const revalidate = 60;

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();

  return (
    <>
      <BlogHeader />
      <main className="container article-page article-content">
        {post.heroImageUrl ? (
          <figure className="article-hero">
            <img src={post.heroImageUrl} alt="" />
          </figure>
        ) : null}
        <h1 className="auth-title article-title">{post.title}</h1>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="article-p">{children}</p>,
            h2: ({ children }) => <h2 className="article-h2">{children}</h2>,
            h3: ({ children }) => <h2 className="article-h2">{children}</h2>,
            blockquote: ({ children }) => <blockquote className="article-blockquote">{children}</blockquote>,
            img: ({ src, alt }) => (
              <figure className="article-figure">
                <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} />
              </figure>
            ),
            a: ({ href, children }) => (
              <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                {children}
              </a>
            )
          }}
        >
          {post.body}
        </ReactMarkdown>

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
