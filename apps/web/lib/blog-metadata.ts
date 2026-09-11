import type { Metadata } from "next";

/**
 * Site-wide OG card restated by any route that sets its own `openGraph` /
 * `twitter` object. Next merges metadata per top-level key, not
 * deep-per-field, so omitting `images` would drop the root default.
 */
export const SITE_OG_IMAGE = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: "Galaxia: astrology for the people you love"
} as const;

export interface PostMetadataInput {
  slug: string;
  title: string;
  dek: string;
  heroImageUrl: string | null;
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
  const ogImage = post.heroImageUrl
    ? [{ url: post.heroImageUrl, alt: post.title }]
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
export function buildCategoryMetadata(category: CategoryMetadataInput): Metadata {
  // FOUNDER-REVIEW: rewritten (no U+2014). Title kept from the category page.
  const title = `${category.label} on the Galaxia blog`;
  const description = `${category.label} posts from the Galaxia blog.`;

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
