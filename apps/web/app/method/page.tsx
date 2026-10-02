import type { Metadata } from "next";
import Link from "next/link";
import { BlogHeader } from "../../components/blog/blog-header";
import { SiteFooter } from "../../components/marketing/site-footer";
import { JsonLd } from "../../components/seo/json-ld";
import {
  METHOD_DESCRIPTION,
  METHOD_H1,
  METHOD_LEDE_BEFORE_LINK,
  METHOD_LEDE_LINK_LABEL,
  METHOD_PATH,
  METHOD_SECTIONS,
  METHOD_TITLE
} from "../../lib/method-copy";

export const metadata: Metadata = {
  title: METHOD_TITLE,
  description: METHOD_DESCRIPTION,
  alternates: { canonical: METHOD_PATH },
  openGraph: {
    title: METHOD_TITLE,
    description: METHOD_DESCRIPTION,
    siteName: "Galaxia",
    type: "website",
    url: METHOD_PATH
  }
};

export default function MethodPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: METHOD_TITLE,
          description: METHOD_DESCRIPTION,
          url: `https://galaxiamea.com${METHOD_PATH}`
        }}
      />
      <BlogHeader />
      <main className="container article-page article-content">
        <h1 className="auth-title article-title">{METHOD_H1}</h1>
        <p className="article-byline-bio">
          {METHOD_LEDE_BEFORE_LINK}
          <Link href="/methodology">{METHOD_LEDE_LINK_LABEL}</Link>.
        </p>
        {METHOD_SECTIONS.map((section) => (
          <section key={section.id}>
            <h2 id={section.id}>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {"velaBeforeLink" in section && section.velaBeforeLink ? (
              <p>
                {section.velaBeforeLink}
                <Link href="/methodology">{section.velaLinkLabel}</Link>
                {section.velaAfterLink}
              </p>
            ) : null}
          </section>
        ))}
      </main>
      <SiteFooter />
    </>
  );
}
