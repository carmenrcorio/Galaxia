import { describe, expect, it } from "vitest";
import { GALAXIA_HELP_EMAIL } from "@galaxia/core";
import { readLegalMarkdown } from "./legal-content";

/**
 * LegalDocument's react-markdown has no rehype-raw plugin (see
 * components/legal-document.tsx), so an HTML comment left in
 * content/legal/*.md renders as literal escaped text on /privacy and /terms
 * instead of being dropped. readLegalMarkdown strips comments before the
 * page ever sees them.
 */
describe("readLegalMarkdown", () => {
  it("strips HTML comments out of the Privacy Policy", () => {
    const markdown = readLegalMarkdown("privacy-policy.md");
    expect(markdown).not.toContain("<!--");
    expect(markdown).not.toContain("-->");
    expect(markdown).not.toContain("FOUNDER-REVIEW");
  });

  it("strips HTML comments out of the Terms of Service", () => {
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

  it("Terms §5 trial language does not claim a card is charged at trial end", () => {
    const markdown = readLegalMarkdown("terms-of-service.md");
    expect(markdown).toContain("A trial does not require a payment method");
    expect(markdown).toContain("A subscription begins only when you actively choose to upgrade.");
    expect(markdown).not.toContain("the payment method you provided will be charged");
    expect(markdown).not.toContain("your subscription will begin automatically");
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

  it("Privacy section 11 is the reviewed 18+ / adult-added-minors copy, with no counsel bracket or em dash", () => {
    const markdown = readLegalMarkdown("privacy-policy.md");
    const start = markdown.indexOf("Children's and minors' privacy");
    const end = markdown.indexOf("Your rights and choices");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const section11 = markdown.slice(start, end);

    expect(section11).toContain("### 11.1 No direct account creation by minors");
    expect(section11).toContain("### 11.2 Profiles concerning minors");
    expect(section11).toContain("### 11.3 Representations concerning minor data");
    expect(section11).toContain("at least 18 years old");
    expect(section11).toContain("safety limits in Section 5");
    expect(section11).toContain("does not create an account for that minor");
    expect(section11).toContain("parent or legal guardian");
    expect(section11).toContain("defend, indemnify, and hold harmless Galaxia");
    expect(section11).toContain(GALAXIA_HELP_EMAIL);

    expect(section11).not.toContain("\u2014");
    expect(section11).not.toContain("should be reviewed by counsel");
    expect(section11).not.toContain("under 13");
    expect(section11).not.toContain("FOUNDER-REVIEW");
    expect(section11).not.toMatch(/\[This area/);
  });
});
