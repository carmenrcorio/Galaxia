import Link from "next/link";

export interface RelatedLinkItem {
  href: string;
  /** Full CTA text — reads as the next helpful step, not a bare page title. */
  label: string;
}

interface Props {
  heading: string;
  links: RelatedLinkItem[];
  /**
   * Skip the section's own `.container` (max-width + gutters). Set this
   * when the caller already renders inside a `.container` — e.g. the Quick
   * Chart pages (QuickChartShell's `<main className="container">`), where
   * nesting a second `.container` would double the side padding.
   */
  bare?: boolean;
}

/**
 * Contextual cross-links between the standalone marketing pages
 * (/why-galaxia, /generations, /meet-vela, /security, /pricing), the Quick
 * Chart tools (/chart, /chart/compare), and out to the blog — the
 * internal-linking pass that keeps every standalone page reachable in 2
 * clicks from `/` without dropping a full site-map onto each one. Every
 * caller picks the 2-3 pages that are actually the next relevant read from
 * where the visitor already is; this component only renders that short,
 * deliberate list.
 */
export function RelatedLinks({ heading, links, bare = false }: Props) {
  // `.reveal` only fades in once <RevealObserver> (mounted on the standalone
  // marketing pages) adds `.in` on scroll-into-view — the Quick Chart pages
  // (`bare`) don't mount it, so skip the class there or this would render
  // permanently at opacity: 0.
  const sectionClassName = ["related-links", bare ? "" : "container reveal"].filter(Boolean).join(" ");
  return (
    <section className={sectionClassName}>
      <span className="eyebrow">{heading}</span>
      <div className="related-links-grid">
        {links.map((link) => (
          <Link key={link.href} href={link.href as never} className="related-link-card">
            <span>{link.label}</span>
            <span className="related-link-arrow" aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
