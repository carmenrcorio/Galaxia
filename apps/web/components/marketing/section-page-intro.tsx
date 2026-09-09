import Link from "next/link";

interface Props {
  title: string;
  lede: string;
}

/**
 * Shared page header for the standalone routes carved out of former
 * homepage anchor sections (#shift → /why-galaxia, #generations →
 * /generations, #vela → /meet-vela, #trust → /security, #pricing →
 * /pricing). A same-page anchor section only ever needed an eyebrow + <h2>
 * (still true on `/` itself, where the page's one real <h1> lives in
 * <Hero>) — a standalone page needs its own <h1> and a way back to the
 * site, which is what this adds ahead of the reused section component.
 */
export function SectionPageIntro({ title, lede }: Props) {
  return (
    <header className="container section-page-intro">
      <nav aria-label="Breadcrumb" className="section-page-breadcrumb">
        <Link href="/">Galaxia</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{title}</span>
      </nav>
      <h1 className="section-page-h1">{title}</h1>
      <p className="lede section-page-lede">{lede}</p>
    </header>
  );
}
