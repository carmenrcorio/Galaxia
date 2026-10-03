import type { Metadata } from "next";
import Link from "next/link";
import { CosmicBackground } from "../../components/cosmic-background";
import { MarketingNav } from "../../components/marketing/marketing-nav";
import { RevealObserver } from "../../components/marketing/reveal-observer";
import { SectionPageIntro } from "../../components/marketing/section-page-intro";
import { SiteFooter } from "../../components/marketing/site-footer";
import { WebPageJsonLd } from "../../components/marketing/webpage-json-ld";
import {
  LEARN_DESCRIPTION,
  LEARN_HUB_LINKS,
  LEARN_LEDE,
  LEARN_PATH,
  LEARN_TITLE,
} from "../../lib/learn-copy";

export const metadata: Metadata = {
  title: LEARN_TITLE,
  description: LEARN_DESCRIPTION,
  alternates: { canonical: LEARN_PATH },
  openGraph: {
    title: LEARN_TITLE,
    description: LEARN_DESCRIPTION,
    siteName: "Galaxia",
    type: "website",
    url: LEARN_PATH,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Galaxia: astrology to understand the people in your life",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: LEARN_TITLE,
    description: LEARN_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Galaxia: astrology to understand the people in your life",
      },
    ],
  },
};

export default function LearnPage() {
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <WebPageJsonLd path={LEARN_PATH} name={LEARN_TITLE} description={LEARN_DESCRIPTION} />
      <CosmicBackground />
      <RevealObserver />
      <MarketingNav />
      <main className="marketing" style={{ position: "relative", zIndex: 2 }}>
        <SectionPageIntro title={LEARN_TITLE} lede={LEARN_LEDE} />
        <div className="container learn-hub">
          <ul className="learn-hub-list">
            {LEARN_HUB_LINKS.map((item) => (
              <li key={item.href}>
                <Link href={item.href as never} className="learn-hub-card">
                  <span className="learn-hub-card-title">{item.title}</span>
                  <span className="learn-hub-card-desc">{item.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
