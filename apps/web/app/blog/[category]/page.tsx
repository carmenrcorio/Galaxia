import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogHeader } from "../../../components/blog/blog-header";
import { BlogPostCard } from "../../../components/blog/blog-post-card";
import { BlogZodiacTrail } from "../../../components/blog/blog-zodiac-trail";
import { CosmicBackground } from "../../../components/cosmic-background";
import { SiteFooter } from "../../../components/marketing/site-footer";
import { BLOG_CATEGORIES, getCategory, getPublishedPostsByCategory, type BlogCategorySlug } from "../../../lib/blog";

type Params = { category: string };

export function generateStaticParams(): Params[] {
  return BLOG_CATEGORIES.map((category) => ({ category: category.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { category: slug } = await params;
  const category = getCategory(slug);
  if (!category) return {};

  // FOUNDER-REVIEW: rewritten (no U+2014).
  const title = `${category.label} on the Galaxia blog`;
  const description = `${category.label} posts from the Galaxia blog.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/blog/${category.slug}`
    },
    openGraph: { title, description, siteName: "Galaxia", type: "website", url: `/blog/${category.slug}` },
    twitter: { card: "summary_large_image", title, description }
  };
}

export const revalidate = 60;

export default async function BlogCategoryPage({ params }: { params: Promise<Params> }) {
  const { category: slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  const posts = await getPublishedPostsByCategory(category.slug as BlogCategorySlug);

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <CosmicBackground />
      <BlogHeader />
      <main className="container blog-index-page" style={{ position: "relative", zIndex: 2 }}>
        <BlogZodiacTrail />
        <div className="blog-index-glow" aria-hidden="true" />
        <span className="eyebrow">Galaxia blog</span>
        <h1 className="page-title">{category.label}</h1>

        <nav aria-label="Categories" className="blog-tabs">
          <Link href="/blog" className="blog-tab">
            All posts
          </Link>
          {BLOG_CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/blog/${c.slug}`} className={`blog-tab${c.slug === category.slug ? " blog-tab--active" : ""}`}>
              {c.label}
            </Link>
          ))}
        </nav>

        {posts.length > 0 ? (
          <div className="blog-post-list">
            {posts.map((post) => (
              <BlogPostCard key={post.slug} post={post} />
            ))}
          </div>
        ) : (
          <p className="blog-category-empty">{category.emptyNote}</p>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
