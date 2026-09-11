import type { Metadata } from "next";
import Link from "next/link";
import { BlogHeader } from "../../components/blog/blog-header";
import { BlogPostCard } from "../../components/blog/blog-post-card";
import { BlogZodiacTrail } from "../../components/blog/blog-zodiac-trail";
import { CosmicBackground } from "../../components/cosmic-background";
import { SiteFooter } from "../../components/marketing/site-footer";
import { BLOG_CATEGORIES, getPublishedPosts } from "../../lib/blog";

// FOUNDER-REVIEW: rewritten (no U+2014).
const TITLE = "Galaxia Blog";
const DESCRIPTION = "Guides for reading real birth charts: synastry, generations, and what astrology can and can't actually tell you.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "/blog"
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Galaxia",
    type: "website",
    url: "/blog",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia: astrology for the people you love" }]
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia: astrology for the people you love" }]
  }
};

// Re-read on every request rather than caching indefinitely — a post
// published through /admin/posts should show up here promptly, not only
// after the next deploy.
export const revalidate = 60;

export default async function BlogIndexPage() {
  const posts = await getPublishedPosts();

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <CosmicBackground />
      <BlogHeader />
      <main className="container blog-index-page" style={{ position: "relative", zIndex: 2 }}>
        <BlogZodiacTrail />
        <div className="blog-index-glow" aria-hidden="true" />
        <span className="eyebrow">Galaxia blog</span>
        <h1 className="page-title">Guides for the people you love.</h1>
        <p className="lede">
          How to actually read a chart: starting with the ones for the people already in your life.
        </p>

        <nav aria-label="Categories" className="blog-tabs">
          <span className="blog-tab blog-tab--active">All posts</span>
          {BLOG_CATEGORIES.map((category) => (
            <Link key={category.slug} href={`/blog/${category.slug}`} className="blog-tab">
              {category.label}
            </Link>
          ))}
        </nav>

        <div className="blog-post-list">
          {posts.map((post) => (
            <BlogPostCard key={post.slug} post={post} />
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
