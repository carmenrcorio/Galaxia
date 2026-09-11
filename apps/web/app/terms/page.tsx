import type { Metadata } from "next";
import { LegalDocument } from "../../components/legal-document";
import { WebPageJsonLd } from "../../components/marketing/webpage-json-ld";
import { readLegalMarkdown } from "../../lib/legal-content";

const TITLE = "Terms of Service · Galaxia";
// FOUNDER-REVIEW: authored. Page-specific description; do not inherit SITE_DESCRIPTION.
const DESCRIPTION =
  "Terms for using Galaxia, including accounts, the nature of the Service, adding other people, billing, and limits on our liability.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "/terms"
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Galaxia",
    type: "website",
    url: "/terms",
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
 * Renders the reviewed Terms of Service (content/legal/terms-of-service.md)
 * verbatim. Public route — not in middleware's matcher, so it's reachable
 * without auth or Supabase config. See LegalDocument for the rendering
 * approach; do not hand-edit the wording here, edit the source markdown.
 */
export default function TermsPage() {
  const markdown = readLegalMarkdown("terms-of-service.md");
  return (
    <>
      <WebPageJsonLd path="/terms" name={TITLE} description={DESCRIPTION} />
      <main className="container legal-page">
        <LegalDocument markdown={markdown} />
      </main>
    </>
  );
}
