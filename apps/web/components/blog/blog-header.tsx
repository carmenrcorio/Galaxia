import Link from "next/link";

/**
 * Persistent header for blog surfaces (`/blog`, `/blog/[category]`, and every
 * individual post under `app/<slug>/page.tsx`). Before this, article pages
 * had no <header> or <nav> in the DOM at all — a reader landing on a post
 * had no way back to the site short of the browser's back button.
 *
 * Deliberately lighter than <MarketingNav>: a full landing nav (with its
 * in-page anchor links like #pricing, #vela) doesn't belong on a page that
 * isn't the homepage. This is just the wordmark (→ home) + one link back to
 * the blog index, same sticky/blur treatment as the other nav bars
 * (marketing-nav.tsx, app-nav.tsx) for visual consistency.
 */
export function BlogHeader() {
  return (
    <header className="blog-header">
      <div className="container blog-header-in">
        <Link href="/" className="blog-header-brand">
          Galax<span className="blog-header-brand-italic">ia</span>
        </Link>
        <nav aria-label="Blog" className="blog-header-nav">
          <Link href="/blog" className="blog-header-link">
            Blog
          </Link>
        </nav>
      </div>
    </header>
  );
}
