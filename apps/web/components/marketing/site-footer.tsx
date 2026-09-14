import Link from "next/link";
import { SITE_FOOTER_LINKS } from "../../lib/nav-links";

/**
 * Site-wide footer, shared by the homepage, the standalone marketing pages
 * (/why-galaxia, /generations, /meet-vela, /for-work, /press, /security, /pricing), and the
 * blog. All real routes now — no in-page anchors — so every link resolves
 * the same way no matter which page the footer is rendered on. Quick Chart
 * and Download are named here because both are public, logged-out surfaces.
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
          {SITE_FOOTER_LINKS.map((l) => (
            <Link key={l.href} href={l.href as never}>{l.label}</Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
