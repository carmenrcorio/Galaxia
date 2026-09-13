import { describe, expect, it } from "vitest";
import { readLegalMarkdown } from "./legal-content";

/**
 * LegalDocument's react-markdown has no rehype-raw plugin (see
 * components/legal-document.tsx), so an HTML comment left in
 * content/legal/*.md renders as literal escaped text on /privacy and /terms
 * instead of being dropped. readLegalMarkdown strips comments before the
 * page ever sees them; this locks that in for the FOUNDER-REVIEW markers
 * already used in both documents.
 */
describe("readLegalMarkdown", () => {
  it("strips FOUNDER-REVIEW (and any other HTML comment) out of the Privacy Policy", () => {
    const markdown = readLegalMarkdown("privacy-policy.md");
    expect(markdown).not.toContain("<!--");
    expect(markdown).not.toContain("-->");
    expect(markdown).not.toContain("FOUNDER-REVIEW");
  });

  it("strips FOUNDER-REVIEW (and any other HTML comment) out of the Terms of Service", () => {
    const markdown = readLegalMarkdown("terms-of-service.md");
    expect(markdown).not.toContain("<!--");
    expect(markdown).not.toContain("-->");
    expect(markdown).not.toContain("FOUNDER-REVIEW");
  });

  it("keeps the real prose around a stripped comment intact", () => {
    const markdown = readLegalMarkdown("terms-of-service.md");
    expect(markdown).toContain("**Invitation feature.**");
    expect(markdown).toContain("**Plans.** Access to paid features requires a subscription.");
  });
});
