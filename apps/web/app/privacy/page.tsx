import type { Metadata } from "next";
import { LegalDocument } from "../../components/legal-document";
import { readLegalMarkdown } from "../../lib/legal-content";

export const metadata: Metadata = {
  title: "Privacy Policy · Galaxia"
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
    <main className="container legal-page">
      <LegalDocument markdown={markdown} />
    </main>
  );
}
