import Link from "next/link";

/**
 * Site-wide footer, shared by the homepage, the standalone marketing pages
 * (/why-galaxia, /generations, /meet-vela, /security, /pricing), and the
 * blog. All real routes now — no in-page anchors — so every link resolves
 * the same way no matter which page the footer is rendered on.
 */
export function SiteFooter() {
  return (
    <footer className="site-footer" style={{ position: "relative", zIndex: 2 }}>
      <div className="container site-footer-in">
        <div>
          <div className="site-footer-brand">Galaxia</div>
          <p>The people you love, written in the stars. · © 2026 Galaxia</p>
        </div>
        <div className="site-footer-links">
          <Link href="/why-galaxia">Why Galaxia</Link>
          <Link href="/generations">Generations</Link>
          <Link href="/meet-vela">Meet Vela</Link>
          <Link href="/security">Security</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
