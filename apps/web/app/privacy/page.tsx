import type { Metadata } from "next";
import { LegalDocument } from "../../components/legal-document";
import { WebPageJsonLd } from "../../components/marketing/webpage-json-ld";
import { readLegalMarkdown } from "../../lib/legal-content";

const TITLE = "Privacy Policy · Galaxia";
// FOUNDER-REVIEW: authored. Page-specific description; do not inherit SITE_DESCRIPTION.
const DESCRIPTION =
  "How Galaxia collects, uses, and protects birth data about you and the people you add, and what we never do with that information.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "/privacy"
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Galaxia",
    type: "website",
    url: "/privacy",
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
 * Renders the reviewed Privacy Policy (content/legal/privacy-policy.md)
 * verbatim. Public route — not in middleware's matcher, so it's reachable
 * without auth or Supabase config. See LegalDocument for the rendering
 * approach; do not hand-edit the wording here, edit the source markdown.
 */
export default function PrivacyPage() {
  const markdown = readLegalMarkdown("privacy-policy.md");
  return (
    <>
      <WebPageJsonLd path="/privacy" name={TITLE} description={DESCRIPTION} />
      <main className="container legal-page">
        <LegalDocument markdown={markdown} />
      </main>
    </>
  );
}
