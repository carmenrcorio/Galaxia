import type { Metadata } from "next";
import { LegalDocument } from "../../components/legal-document";
import { readLegalMarkdown } from "../../lib/legal-content";

export const metadata: Metadata = {
  title: "Terms of Service · Galaxia"
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
    <main className="container legal-page">
      <LegalDocument markdown={markdown} />
    </main>
  );
}
