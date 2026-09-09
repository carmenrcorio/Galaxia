import { publicEnv } from "../../lib/env";

// Same prod fallback as app/layout.tsx's `metadataBase` / app/sitemap.ts's
// `SITE_URL` — schema.org `url`/`item` values must be absolute, so this
// can't rely on Next resolving a relative path the way `metadataBase` does
// for openGraph/canonical.
const SITE_URL = publicEnv.siteUrl || "https://galaxia-three.vercel.app";

interface Props {
  path: string;
  name: string;
  description: string;
}

/**
 * `WebPage` + `BreadcrumbList` JSON-LD for a standalone marketing page.
 * The site's `SoftwareApplication` schema stays on `/` only (app/page.tsx)
 * — it describes the product once, not once per page.
 */
export function WebPageJsonLd({ path, name, description }: Props) {
  const url = `${SITE_URL}${path}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
    url,
    isPartOf: { "@type": "WebSite", name: "Galaxia", url: SITE_URL },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Galaxia", item: SITE_URL },
        { "@type": "ListItem", position: 2, name, item: url }
      ]
    }
  };

  // eslint-disable-next-line react/no-danger -- trusted, statically-built JSON, not user input
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />;
}
