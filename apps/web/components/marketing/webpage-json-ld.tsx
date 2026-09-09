import { JsonLd, type JsonLdObject } from "../seo/json-ld";
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
 * `WebPage` + `BreadcrumbList` JSON-LD for a standalone marketing page,
 * rendered via the shared <JsonLd> injector (components/seo/json-ld.tsx —
 * also used for the homepage's `SoftwareApplication` schema and each blog
 * post's `Article` schema). The site's `SoftwareApplication` schema stays
 * on `/` only (app/page.tsx) — it describes the product once, not once per
 * page.
 */
export function WebPageJsonLd({ path, name, description }: Props) {
  const url = `${SITE_URL}${path}`;
  const jsonLd: JsonLdObject = {
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

  return <JsonLd data={jsonLd} />;
}
