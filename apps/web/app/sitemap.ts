import type { MetadataRoute } from "next";
import { publicEnv } from "../lib/env";
import { BLOG_CATEGORIES, getPublishedPosts } from "../lib/blog";

// Same base URL as `metadataBase` in app/layout.tsx (see PR #153) — falls back
// to the prod URL when NEXT_PUBLIC_SITE_URL is unset, so this never emits
// relative/broken <loc> entries.
const SITE_URL = publicEnv.siteUrl || "https://galaxia-three.vercel.app";

/**
 * Every real, public, indexable route. Deliberately excludes:
 *   - /admin/** (internal only)
 *   - /account/**, /app/**, /welcome, /start, /subscribe (auth-gated —
 *     middleware.ts redirects a signed-out visitor to /login for all of these)
 *   - /invite/[token], /s/[token], /r/[slug] (per-invite/per-share/
 *     per-referral pages, not general content — see route comments)
 *   - /auth/callback (an OAuth redirect target, not a page)
 * `/why-galaxia`, `/generations`, `/meet-vela`, `/security`, `/pricing` are
 * standalone pages carved out of former homepage anchor sections (#shift,
 * #generations, #vela, #trust, #pricing — see components/marketing/*
 * -section.tsx); each is also still reachable as a same-page anchor on `/`.
 *
 * Post URLs (`/${slug}`) are read from the `posts` table at request time
 * (getPublishedPosts — published rows only, via lib/blog.ts) rather than
 * hardcoded, now that they come from the admin editor (/admin/posts)
 * instead of a static per-article route folder. A new post appears here
 * the same request it becomes visible on /blog — no sitemap edit needed.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = [
    "/",
    "/why-galaxia",
    "/generations",
    "/meet-vela",
    "/security",
    "/pricing",
    "/blog",
    ...BLOG_CATEGORIES.map((c) => `/blog/${c.slug}`),
    "/privacy",
    "/terms",
    "/download",
    "/login",
    "/signup",
    "/chart",
    "/chart/compare"
  ];

  const posts = await getPublishedPosts();

  return [
    ...routes.map((route) => ({
      url: `${SITE_URL}${route}`,
      lastModified: new Date()
    })),
    ...posts.map((post) => ({
      url: `${SITE_URL}/${post.slug}`,
      lastModified: post.publishedAt ? new Date(post.publishedAt) : new Date()
    }))
  ];
}
