import { describe, expect, it } from "vitest";
import { GALAXIA_HELP_EMAIL } from "@galaxia/core";
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

  it("substitutes the one Galaxia contact address and leaves no token behind", () => {
    for (const filename of ["privacy-policy.md", "terms-of-service.md"] as const) {
      const markdown = readLegalMarkdown(filename);
      expect(markdown).toContain(GALAXIA_HELP_EMAIL);
      expect(markdown).not.toContain("{{GALAXIA_HELP_EMAIL}}");
    }
  });

  it("Terms section 15 names South Carolina and Greenville County, with no leftover fill-in tokens", () => {
    const markdown = readLegalMarkdown("terms-of-service.md");
    expect(markdown).toContain("the laws of the State of South Carolina");
    expect(markdown).toContain("Greenville County, South Carolina");
    expect(markdown).not.toMatch(/\[GOVERNING STATE/);
    expect(markdown).not.toMatch(/\[COUNTY\/STATE\]/);
    expect(markdown).not.toMatch(/\[CONFIRM /);
  });
});
