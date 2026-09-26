import type { Metadata } from "next";
import { CosmicBackground } from "../../components/cosmic-background";
import { CloseSection } from "../../components/marketing/close-section";
import { MarketingNav } from "../../components/marketing/marketing-nav";
import { RelatedLinks } from "../../components/marketing/related-links";
import { RevealObserver } from "../../components/marketing/reveal-observer";
import { SectionPageIntro } from "../../components/marketing/section-page-intro";
import { SiteFooter } from "../../components/marketing/site-footer";
import { WebPageJsonLd } from "../../components/marketing/webpage-json-ld";
import {
  METHODOLOGY_DESCRIPTION,
  METHODOLOGY_H1,
  METHODOLOGY_LEDE,
  METHODOLOGY_OG_ALT,
  METHODOLOGY_PATH,
  METHODOLOGY_SECTIONS,
  METHODOLOGY_TITLE,
  methodologyOrbRows,
} from "../../lib/methodology-copy";
import { RELATED_LINKS } from "../../lib/nav-links";

/**
 * Public methodology page. Explains how `@galaxia/astro` computes a chart
 * (ephemeris, houses, orbs, applying/separating) and what it does not.
 * Orb numbers are read from `aspectDefinition` so the table cannot drift
 * from the engine. Static server page: no cookies, no Supabase.
 *
 * Canonical in production is https://galaxiamea.com/methodology (relative
 * `/methodology` resolved through `metadataBase`).
 */
export const metadata: Metadata = {
  title: METHODOLOGY_TITLE,
  description: METHODOLOGY_DESCRIPTION,
  alternates: { canonical: METHODOLOGY_PATH },
  openGraph: {
    title: METHODOLOGY_TITLE,
    description: METHODOLOGY_DESCRIPTION,
    siteName: "Galaxia",
    type: "website",
    url: METHODOLOGY_PATH,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: METHODOLOGY_OG_ALT }],
  },
  twitter: {
    card: "summary_large_image",
    title: METHODOLOGY_TITLE,
    description: METHODOLOGY_DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: METHODOLOGY_OG_ALT }],
  },
};

export default function MethodologyPage() {
  const { ephemeris, houses, orbs, applying, omissions } = METHODOLOGY_SECTIONS;
  const orbRows = methodologyOrbRows();

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <WebPageJsonLd path={METHODOLOGY_PATH} name={METHODOLOGY_TITLE} description={METHODOLOGY_DESCRIPTION} />
      <CosmicBackground />
      <RevealObserver />
      <MarketingNav />
      <main className="marketing" style={{ position: "relative", zIndex: 2 }}>
        <SectionPageIntro title={METHODOLOGY_H1} lede={METHODOLOGY_LEDE} />
        <div className="container methodology-page">
          <section>
            <h2 id={ephemeris.id} className="methodology-h2">
              {ephemeris.heading}
            </h2>
            {ephemeris.paragraphs.map((paragraph) => (
              <p key={paragraph} className="methodology-p">
                {paragraph}
              </p>
            ))}
          </section>
          <section>
            <h2 id={houses.id} className="methodology-h2">
              {houses.heading}
            </h2>
            {houses.paragraphs.map((paragraph) => (
              <p key={paragraph} className="methodology-p">
                {paragraph}
              </p>
            ))}
          </section>
          <section>
            <h2 id={orbs.id} className="methodology-h2">
              {orbs.heading}
            </h2>
            {orbs.paragraphs.map((paragraph) => (
              <p key={paragraph} className="methodology-p">
                {paragraph}
              </p>
            ))}
            <div className="legal-doc-table-wrap methodology-orb-table-wrap">
              <table className="legal-doc-table methodology-orb-table">
                <caption className="methodology-table-caption">{orbs.tableCaption}</caption>
                <thead>
                  <tr>
                    <th scope="col">{orbs.columnHeaders.aspect}</th>
                    <th scope="col">{orbs.columnHeaders.luminaries}</th>
                    <th scope="col">{orbs.columnHeaders.personal}</th>
                    <th scope="col">{orbs.columnHeaders.outer}</th>
                  </tr>
                </thead>
                <tbody>
                  {orbRows.map((row) => (
                    <tr key={row.type}>
                      <th scope="row">{row.label}</th>
                      <td>{row.orb}°</td>
                      <td>{row.orb}°</td>
                      <td>{row.orb}°</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="methodology-p">{orbs.transitMoonNote}</p>
          </section>
          <section>
            <h2 id={applying.id} className="methodology-h2">
              {applying.heading}
            </h2>
            {applying.paragraphs.map((paragraph) => (
              <p key={paragraph} className="methodology-p">
                {paragraph}
              </p>
            ))}
          </section>
          <section>
            <h2 id={omissions.id} className="methodology-h2">
              {omissions.heading}
            </h2>
            <p className="methodology-p">{omissions.intro}</p>
            <ul className="legal-doc-list">
              {omissions.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>
        <RelatedLinks heading="Keep exploring" links={RELATED_LINKS.methodology} />
        <CloseSection />
      </main>
      <SiteFooter />
    </div>
  );
}
