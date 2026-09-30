import type { Metadata } from "next";
import { SITE_OG_ALT } from "./brand-copy";

/**
 * Site-wide OG card restated by any route that sets its own `openGraph` /
 * `twitter` object. Next merges metadata per top-level key, not
 * deep-per-field, so omitting `images` would drop the root default.
 */
export const SITE_OG_IMAGE = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: SITE_OG_ALT
} as const;

export const SITE_ORIGIN = "https://galaxiamea.com";

/** OG and JSON-LD need an absolute image URL. Public paths stay relative in the database. */
export function absolutePostImageUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${SITE_ORIGIN}${url}`;
  return url;
}

export interface PostMetadataInput {
  slug: string;
  title: string;
  dek: string;
  heroImageUrl: string | null;
  /** Manifest alt for the nine illustrated posts. Older heroes keep the title as og:image:alt. */
  heroImageAlt?: string | null;
}

export interface CategoryMetadataInput {
  slug: string;
  label: string;
}

/**
 * Per-post <head> metadata. Canonical is the real rendered path (`/{slug}`),
 * never a `/blog/` prefix: posts live at the top-level `[slug]` route.
 */
export function buildPostMetadata(post: PostMetadataInput): Metadata {
  const heroAlt = post.heroImageAlt?.trim() ?? "";
  const ogImage = post.heroImageUrl
    ? [
        {
          url: absolutePostImageUrl(post.heroImageUrl),
          alt: heroAlt || post.title,
          width: heroAlt ? 1600 : 1200,
          height: heroAlt ? 840 : 630
        }
      ]
    : [SITE_OG_IMAGE];

  return {
    title: post.title,
    description: post.dek,
    alternates: {
      canonical: `/${post.slug}`
    },
    openGraph: {
      title: post.title,
      description: post.dek,
      siteName: "Galaxia",
      type: "article",
      url: `/${post.slug}`,
      images: ogImage
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.dek,
      images: ogImage
    }
  };
}

/**
 * Blog category listing metadata. Restates `images` on both `openGraph` and
 * `twitter` so Next does not replace the root default with an imageless object.
 */
export function categoryListingDescription(slug: string): string {
  if (slug === "debunked") {
    return "What astrology can and cannot claim. Birth charts, synastry, placements, aspects, and the limits of a real reading.";
  }
  return "Guides for reading birth charts, synastry, placements, aspects, and houses. What astrology can tell you about the people in your life.";
}

export function buildCategoryMetadata(category: CategoryMetadataInput): Metadata {
  const title =
    category.slug === "debunked"
      ? "Honest Astrology: What a Birth Chart Can and Cannot Claim"
      : "Learn Astrology: Birth Charts, Synastry, and Houses";
  const description = categoryListingDescription(category.slug);

  return {
    title,
    description,
    alternates: {
      canonical: `/blog/${category.slug}`
    },
    openGraph: {
      title,
      description,
      siteName: "Galaxia",
      type: "website",
      url: `/blog/${category.slug}`,
      images: [SITE_OG_IMAGE]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [SITE_OG_IMAGE]
    }
  };
}
