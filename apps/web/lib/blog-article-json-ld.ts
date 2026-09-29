import type { JsonLdObject } from "../components/seo/json-ld";
import { absolutePostImageUrl } from "./blog-metadata";

const SITE_URL = "https://galaxiamea.com";

/**
 * The published-post fields Article JSON-LD actually reads. Kept as a
 * narrow interface so tests (and the post page) can call
 * `buildArticleJsonLd` without importing `lib/blog.ts`, which is
 * `server-only`.
 */
export interface ArticleJsonLdPost {
  slug: string;
  title: string;
  publishedAt: string | null;
  updatedAt: string;
  heroImageUrl?: string | null;
}

/**
 * Article JSON-LD for a single blog post, built from the same row
 * `generateMetadata` already reads: never hardcoded copy. Canonical
 * `mainEntityOfPage.@id` is the top-level path (`https://galaxiamea.com/{slug}`),
 * never a `/blog/` prefix: posts render at `app/[slug]/page.tsx`.
 */
export function buildArticleJsonLd(post: ArticleJsonLdPost): JsonLdObject {
  const image = post.heroImageUrl?.trim() ? absolutePostImageUrl(post.heroImageUrl.trim()) : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    datePublished: post.publishedAt ?? post.updatedAt,
    dateModified: post.updatedAt || post.publishedAt || undefined,
    ...(image ? { image } : {}),
    author: {
      "@type": "Organization",
      name: "Galaxia"
    },
    publisher: {
      "@type": "Organization",
      name: "Galaxia",
      url: SITE_URL
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/${post.slug}`
    }
  };
}
