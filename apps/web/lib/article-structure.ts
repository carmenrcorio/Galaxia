import { slugify } from "./slugify";

/**
 * Rendering helpers for the published-post template (app/[slug]/page.tsx).
 * Kept out of lib/blog.ts so tests can import them without pulling
 * `server-only` / Supabase.
 */

/** Sentinel injected into markdown, then swapped for the mid-post CTA. Never authored into post bodies. */
export const MID_CTA_MARKER = "%%GALAXIA_MID_CTA%%";

/** Sentinel swapped for the supporting figure. Never authored into post bodies. */
export const FIGURE_MARKER = "%%GALAXIA_FIGURE%%";


export const ARTICLE_TOC_LABEL = "In this piece";

/** "In this piece" renders only when a post has at least this many H2s. */
export const MIN_TOC_HEADINGS = 3;


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

export function tocHeadings(markdown: string): ArticleHeading[] {
  const headings = extractH2Headings(markdown);
  return headings.length >= MIN_TOC_HEADINGS ? headings : [];
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

function lineStartOffsets(lines: string[]): number[] {
  const offsets: number[] = [];
  let acc = 0;
  for (const line of lines) {
    offsets.push(acc);
    acc += line.length + 1;
  }
  return offsets;
}

/**
 * Insert the mid-post CTA marker after the first paragraph of the h2
 * closest to the document midpoint (the middle third). The marker never
 * sits directly under that heading, and never before that section's first
 * paragraph. If no h2 sits in the middle third, or that section has no
 * paragraph, insert at the 50% word-count paragraph boundary instead.
 * Never writes the CTA into the stored body: the renderer injects this
 * at read time.
 */
export function injectMidPostCtaMarker(markdown: string, marker = MID_CTA_MARKER): string {
  if (markdown.includes(marker)) return markdown;

  const lines = markdown.split("\n");
  const offsets = lineStartOffsets(lines);
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

  const length = markdown.length;
  const mid = length / 2;
  const nearby = h2Indexes.filter((index) => {
    const at = offsets[index] ?? 0;
    return at >= length * 0.25 && at <= length * 0.75;
  });
  nearby.sort((a, b) => Math.abs((offsets[a] ?? 0) - mid) - Math.abs((offsets[b] ?? 0) - mid));
  const chosen = nearby[0];
  if (chosen !== undefined) {
    let cursor = chosen + 1;
    while (cursor < lines.length && (lines[cursor] ?? "").trim() === "") cursor++;
    const firstLine = lines[cursor] ?? "";
    if (cursor < lines.length && !/^## [^#]/.test(firstLine) && !firstLine.trimStart().startsWith("```")) {
      while (cursor < lines.length && (lines[cursor] ?? "").trim() !== "") cursor++;
      const next = [...lines.slice(0, cursor), "", marker, ...lines.slice(cursor)];
      return next.join("\n");
    }
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
