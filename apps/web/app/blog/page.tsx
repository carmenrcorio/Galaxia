import type { Metadata } from "next";
import Link from "next/link";
import { BlogHeader } from "../../components/blog/blog-header";
import { BlogPostCard } from "../../components/blog/blog-post-card";
import { SiteFooter } from "../../components/marketing/site-footer";
import { BLOG_CATEGORIES, BLOG_POSTS } from "../../lib/blog";

const TITLE = "Blog — Galaxia";
const DESCRIPTION = "Guides for reading real birth charts — synastry, generations, and what astrology can and can't actually tell you.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Galaxia",
    type: "website",
    url: "/blog",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia — astrology for the people you love" }]
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia — astrology for the people you love" }]
  }
};

export default function BlogIndexPage() {
  const posts = [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <>
      <BlogHeader />
      <main className="container blog-index-page">
        <span className="eyebrow">Galaxia blog</span>
        <h1 className="page-title">Guides for the people you love.</h1>
        <p className="lede">
          How to actually read a chart — starting with the ones for the people already in your life.
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
    </>
  );
}
