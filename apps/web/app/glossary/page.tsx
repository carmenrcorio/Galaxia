import type { Metadata } from "next";
import Link from "next/link";
import { CosmicBackground } from "../../components/cosmic-background";
import { CloseSection } from "../../components/marketing/close-section";
import { MarketingNav } from "../../components/marketing/marketing-nav";
import { RelatedLinks } from "../../components/marketing/related-links";
import { RevealObserver } from "../../components/marketing/reveal-observer";
import { SectionPageIntro } from "../../components/marketing/section-page-intro";
import { SiteFooter } from "../../components/marketing/site-footer";
import { WebPageJsonLd } from "../../components/marketing/webpage-json-ld";
import {
  GLOSSARY_DESCRIPTION,
  GLOSSARY_LEDE,
  GLOSSARY_TERMS,
  GLOSSARY_TITLE,
  groupGlossaryByLetter,
} from "../../lib/glossary-terms";
import { RELATED_LINKS } from "../../lib/nav-links";

const TITLE = GLOSSARY_TITLE;
const DESCRIPTION = GLOSSARY_DESCRIPTION;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/glossary" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Galaxia",
    type: "website",
    url: "/glossary",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia: astrology for the people you love" }]
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia: astrology for the people you love" }]
  }
};

/**
 * Static public glossary. Terms live in lib/glossary-terms.ts so the page
 * stays a Server Component with no data fetch. A static `app/glossary/page.tsx`
 * wins over `app/[slug]/page.tsx`, so this path never collides with a post.
 */
export default function GlossaryPage() {
  const groups = groupGlossaryByLetter(GLOSSARY_TERMS);

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <WebPageJsonLd path="/glossary" name={TITLE} description={DESCRIPTION} />
      <CosmicBackground />
      <RevealObserver />
      <MarketingNav />
      <main className="marketing" style={{ position: "relative", zIndex: 2 }}>
        <SectionPageIntro title={TITLE} lede={GLOSSARY_LEDE} />
        <div className="container glossary-page">
          <nav aria-label="Glossary index" className="glossary-index">
            {groups.map((group) => (
              <a key={group.letter} href={`#letter-${group.letter.toLowerCase()}`}>
                {group.letter}
              </a>
            ))}
          </nav>
          {groups.map((group) => (
            <section key={group.letter} className="glossary-letter">
              <h2 id={`letter-${group.letter.toLowerCase()}`} className="glossary-letter-h2">
                {group.letter}
              </h2>
              {group.terms.map((item) => (
                <article key={item.id} className="glossary-entry">
                  <h3 id={item.id} className="glossary-term-h3">
                    {item.term}
                  </h3>
                  <p className="glossary-def">{item.definition}</p>
                  {item.readMore ? (
                    <p className="glossary-read-more">
                      Read more:{" "}
                      <Link href={`/${item.readMore.slug}`}>{item.readMore.title}</Link>
                    </p>
                  ) : null}
                </article>
              ))}
            </section>
          ))}
        </div>
        <RelatedLinks heading="Keep exploring" links={RELATED_LINKS.glossary} />
        <CloseSection />
      </main>
      <SiteFooter />
    </div>
  );
}
