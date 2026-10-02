import { slugify } from "./slugify";

/**
 * Rendering helpers for the published-post template (app/[slug]/page.tsx).
 * Kept out of lib/blog.ts so tests can import them without pulling
 * `server-only` / Supabase.
 */

/** Sentinel injected into markdown, then swapped for the mid-post newsletter box. Never authored into post bodies. */
export const MID_NEWSLETTER_MARKER = "%%GALAXIA_MID_NEWSLETTER%%";

/** @deprecated Renamed to MID_NEWSLETTER_MARKER. */
export const MID_CTA_MARKER = MID_NEWSLETTER_MARKER;

/** Sentinel swapped for the supporting figure. Never authored into post bodies. */
export const FIGURE_MARKER = "%%GALAXIA_FIGURE%%";


export const ARTICLE_TOC_LABEL = "In this piece";

/** "In this piece" renders only when a post has at least this many H2s. */
export const MIN_TOC_HEADINGS = 3;


export const MID_POST_CTA_COPY = "See how this plays out in your own chart";


export const READ_NEXT_LABEL = "Read next";

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

export function tocHeadings(markdown: string): ArticleHeading[] {
  const headings = extractH2Headings(markdown);
  return headings.length >= MIN_TOC_HEADINGS ? headings : [];
}

export type FigurePlacement = "named" | "first-h2" | "missing";

/**
 * Insert `marker` after the H2 section whose plain text matches `heading`
 * (the paragraphs under that heading, before the next H2). If that heading
 * is not in the body, insert after the first H2 section instead. If the
 * body has no H2, append the marker.
 */
export function insertFigureAfterHeading(
  markdown: string,
  heading: string,
  marker = FIGURE_MARKER
): { markdown: string; placement: FigurePlacement } {
  if (markdown.includes(marker)) return { markdown, placement: "named" };

  const lines = markdown.split("\n");
  const h2Indexes: number[] = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.trimStart().startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (/^## [^#]/.test(line)) h2Indexes.push(i);
  }

  if (h2Indexes.length === 0) {
    const suffix = markdown.endsWith("\n") ? "" : "\n";
    return { markdown: `${markdown}${suffix}\n${marker}\n`, placement: "missing" };
  }

  const wanted = headingPlainText(heading);
  const namedIndex = h2Indexes.find((i) => headingPlainText((lines[i] ?? "").replace(/^##\s+/, "")) === wanted);
  const placement: FigurePlacement = namedIndex === undefined ? "first-h2" : "named";
  const sectionStart = namedIndex ?? h2Indexes[0] ?? 0;
  const order = h2Indexes.indexOf(sectionStart);
  const nextHeading = h2Indexes[order + 1];
  const insertAt = nextHeading ?? lines.length;
  const next = [...lines.slice(0, insertAt), "", marker, "", ...lines.slice(insertAt)];
  return { markdown: next.join("\n"), placement };
}

function isFenceToggle(line: string): boolean {
  return line.trimStart().startsWith("```");
}

/** A real paragraph line: not a heading, list item, table row, or marker. */
function isProseLine(line: string): boolean {
  const text = line.trim();
  if (!text) return false;
  if (/^#{1,6}\s/.test(text)) return false;
  if (/^([-*+]|\d+\.)\s/.test(text)) return false;
  if (text.startsWith("|")) return false;
  if (text === FIGURE_MARKER || text === MID_CTA_MARKER) return false;
  return true;
}

function sectionHasProse(lines: string[], from: number, to: number): boolean {
  let inFence = false;
  for (let i = from; i < to; i++) {
    const line = lines[i] ?? "";
    if (isFenceToggle(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (isProseLine(line)) return true;
  }
  return false;
}

function insertMarkerBefore(lines: string[], index: number, marker: string): string {
  const next = [...lines.slice(0, index), "", marker, "", ...lines.slice(index)];
  return next.join("\n");
}

/**
 * Insert the mid-post CTA after the last block of the first H2 section
 * that contains a paragraph. That is the first section after the
 * introduction. The marker never sits directly under the heading, never
 * inside a list, and never mid-paragraph. If no H2 section has a
 * paragraph, the marker follows the last paragraph in the piece.
 * Never writes the CTA into the stored body: the renderer injects this
 * at read time.
 */
export function splitMarkdownBeforeFirstH2(markdown: string): { before: string; fromFirstH2: string } {
  const lines = markdown.split("\n");
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.trimStart().startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (/^## [^#]/.test(line)) {
      const before = lines.slice(0, i).join("\n").trimEnd();
      const fromFirstH2 = lines.slice(i).join("\n");
      return { before, fromFirstH2 };
    }
  }
  return { before: markdown.trimEnd(), fromFirstH2: "" };
}

export function injectMidNewsletterMarker(markdown: string, marker = MID_NEWSLETTER_MARKER): string {
  return injectMidPostCtaMarker(markdown, marker);
}

export function injectMidPostCtaMarker(markdown: string, marker = MID_NEWSLETTER_MARKER): string {
  if (markdown.includes(marker)) return markdown;

  const lines = markdown.split("\n");
  const h2Indexes: number[] = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (isFenceToggle(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (/^## [^#]/.test(line)) h2Indexes.push(i);
  }

  for (let n = 0; n < h2Indexes.length; n++) {
    const start = h2Indexes[n] ?? 0;
    const end = h2Indexes[n + 1] ?? lines.length;
    if (!sectionHasProse(lines, start + 1, end)) continue;
    return insertMarkerBefore(lines, end, marker);
  }

  let lastProse = -1;
  inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (isFenceToggle(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (isProseLine(line)) lastProse = i;
  }
  if (lastProse === -1) {
    const suffix = markdown.endsWith("\n") ? "" : "\n";
    return `${markdown}${suffix}\n${marker}\n`;
  }
  return insertMarkerBefore(lines, lastProse + 1, marker);
}

export interface RelatedPostInput {
  slug: string;
  category: "guides" | "debunked";
  publishedAt: string | null;
  relatedSlugs?: string[] | null;
}

/**
 * Read next is the post's `relatedSlugs`, in that order, when any are set.
 * Posts without a pair still fall back to two from the same category, newest
 * first, then the other category. That fallback is what older posts use
 * until a topic pair is approved.
 */
export function pickRelatedPosts<T extends RelatedPostInput>(
  posts: T[],
  current: { slug: string; category: "guides" | "debunked"; relatedSlugs?: string[] | null },
  count = 2
): T[] {
  const explicit = (current.relatedSlugs ?? []).filter((slug) => slug && slug !== current.slug);
  if (explicit.length > 0) {
    const bySlug = new Map(posts.map((post) => [post.slug, post]));
    const picked: T[] = [];
    for (const slug of explicit) {
      const post = bySlug.get(slug);
      if (post && post.slug !== current.slug) picked.push(post);
      if (picked.length >= count) break;
    }
    return picked;
  }
  const others = posts.filter((post) => post.slug !== current.slug);
  const byDateDesc = (a: T, b: T) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");
  const same = others.filter((post) => post.category === current.category).sort(byDateDesc);
  const other = others.filter((post) => post.category !== current.category).sort(byDateDesc);
  return [...same, ...other].slice(0, count);
}
