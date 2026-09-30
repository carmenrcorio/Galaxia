import Link from "next/link";
import { BLOG_HEADER_LINKS } from "../../lib/nav-links";

/**
 * Persistent header for blog surfaces (`/blog`, `/blog/[category]`, and every
 * individual post under `app/<slug>/page.tsx`). Wordmark plus the same
 * Free chart, Blog, and Pricing links the marketing header uses.
 */
export function BlogHeader() {
  return (
    <header className="blog-header">
      <div className="container blog-header-in">
        <Link href="/" className="blog-header-brand">
          Galax<span className="blog-header-brand-italic">ia</span>
        </Link>
        <nav aria-label="Blog" className="blog-header-nav">
          {BLOG_HEADER_LINKS.map((link) => (
            <Link key={link.href} href={link.href as never} className="blog-header-link">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
