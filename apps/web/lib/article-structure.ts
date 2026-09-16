import { slugify } from "./slugify";

/**
 * Rendering helpers for the published-post template (app/[slug]/page.tsx).
 * Kept out of lib/blog.ts so tests can import them without pulling
 * `server-only` / Supabase.
 */

/** Sentinel injected into markdown, then swapped for the mid-post CTA. Never authored into post bodies. */
export const MID_CTA_MARKER = "%%GALAXIA_MID_CTA%%";


export const ARTICLE_TOC_LABEL = "In this piece";


export const MID_POST_CTA_COPY = "See how this plays out in your own chart";


export const READ_NEXT_LABEL = "Read next";

export function midPostCtaHref(category: "guides" | "debunked"): "/chart" | "/chart/compare" {
  return category === "debunked" ? "/chart/compare" : "/chart";
}

export function headingPlainText(raw: string): string {
  return raw
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]+/g, "")
    .trim();
}

export function uniqueHeadingId(text: string, seen: Map<string, number>): string {
  const base = slugify(text) || "section";
  const n = seen.get(base) ?? 0;
  seen.set(base, n + 1);
  return n === 0 ? base : `${base}-${n}`;
}

export interface ArticleHeading {
  text: string;
  id: string;
}

/**
 * `##` headings only (not `###`). Same id sequence the article renderer
 * assigns, so TOC jump links match.
 */
export function extractH2Headings(markdown: string): ArticleHeading[] {
  const seen = new Map<string, number>();
  const headings: ArticleHeading[] = [];
  let inFence = false;
  for (const line of markdown.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = /^## ([^#].*)$/.exec(line);
    if (!match) continue;
    const text = headingPlainText(match[1] ?? "");
    headings.push({ text, id: uniqueHeadingId(text, seen) });
  }
  return headings;
}

function wordCount(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

function insertAtWordMidpoint(markdown: string, marker: string): string {
  const paragraphs = markdown.split(/\n\n+/);
  if (paragraphs.length <= 1) {
    return `${markdown}\n\n${marker}\n`;
  }
  const total = wordCount(markdown);
  const target = total / 2;
  let seen = 0;
  const out: string[] = [];
  let inserted = false;
  for (const paragraph of paragraphs) {
    out.push(paragraph);
    seen += wordCount(paragraph);
    if (!inserted && seen >= target) {
      out.push(marker);
      inserted = true;
    }
  }
  if (!inserted) out.push(marker);
  return out.join("\n\n");
}

/**
 * Insert the mid-post CTA marker after the h2 closest to the document
 * midpoint (the middle third). If no h2 sits there, insert at the 50%
 * word-count paragraph boundary instead. Never writes the CTA into the
 * stored body: the renderer injects this at read time.
 */
export function injectMidPostCtaMarker(markdown: string, marker = MID_CTA_MARKER): string {
  if (markdown.includes(marker)) return markdown;

  const matches = [...markdown.matchAll(/^## [^#\n].*$/gm)];
  const length = markdown.length;
  const mid = length / 2;
  const nearby = matches.filter((m) => {
    const index = m.index ?? 0;
    return index >= length * 0.25 && index <= length * 0.75;
  });
  nearby.sort((a, b) => Math.abs((a.index ?? 0) - mid) - Math.abs((b.index ?? 0) - mid));
  const chosen = nearby[0];
  if (chosen) {
    const at = (chosen.index ?? 0) + chosen[0].length;
    return `${markdown.slice(0, at)}\n\n${marker}\n${markdown.slice(at)}`;
  }
  return insertAtWordMidpoint(markdown, marker);
}

export interface RelatedPostInput {
  slug: string;
  category: "guides" | "debunked";
  publishedAt: string | null;
}

/**
 * Two posts from the same category, newest first, excluding `current`.
 * If fewer than `count` exist there, fill from the other category.
 */
export function pickRelatedPosts<T extends RelatedPostInput>(
  posts: T[],
  current: { slug: string; category: "guides" | "debunked" },
  count = 2
): T[] {
  const others = posts.filter((post) => post.slug !== current.slug);
  const byDateDesc = (a: T, b: T) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");
  const same = others.filter((post) => post.category === current.category).sort(byDateDesc);
  const other = others.filter((post) => post.category !== current.category).sort(byDateDesc);
  return [...same, ...other].slice(0, count);
}
