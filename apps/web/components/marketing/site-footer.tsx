import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer" style={{ position: "relative", zIndex: 2 }}>
      <div className="container site-footer-in">
        <div>
          <div className="site-footer-brand">Galaxia</div>
          <p>The people you love, written in the stars. · © 2026 Galaxia</p>
        </div>
        <div className="site-footer-links">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <a href="#pricing">Pricing</a>
        </div>
      </div>
    </footer>
  );
}
