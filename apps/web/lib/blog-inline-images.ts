import { insertFigureAfterHeading } from "./article-structure";

export interface PostInlineImage {
  afterHeading: string;
  url: string;
  alt: string;
  caption: string | null;
  credit: string | null;
}

export const INLINE_IMAGE_MARKER_PREFIX = "%%GALAXIA_INLINE_IMAGE_";

export function inlineImageMarker(index: number): string {
  return `${INLINE_IMAGE_MARKER_PREFIX}${index}%%`;
}

function parseInlineImageEntry(raw: unknown, index: number): PostInlineImage | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const afterHeading = typeof row.after_heading === "string" ? row.after_heading.trim() : "";
  const url = typeof row.url === "string" ? row.url.trim() : "";
  const alt = typeof row.alt === "string" ? row.alt.trim() : "";
  const caption = typeof row.caption === "string" ? row.caption.trim() : null;
  const credit = typeof row.credit === "string" ? row.credit.trim() : null;
  if (!afterHeading || !url || !alt) return null;
  return {
    afterHeading,
    url,
    alt,
    caption: caption || null,
    credit: credit || null
  };
}

export function parseInlineImages(value: unknown): PostInlineImage[] {
  if (!Array.isArray(value)) return [];
  const parsed: PostInlineImage[] = [];
  for (let i = 0; i < value.length; i++) {
    const entry = parseInlineImageEntry(value[i], i);
    if (entry) parsed.push(entry);
  }
  return parsed;
}

/**
 * Template-only visual breaks: long prose runs should get a figure, pull quote,
 * or heading about every 300 words. This helper does not change stored bodies;
 * editors use inline_images or markdown figures instead.
 */
export const VISUAL_BREAK_WORD_TARGET = 300;

export function injectInlineImageMarkers(markdown: string, images: PostInlineImage[]): string {
  if (images.length === 0) return markdown;
  let result = markdown;
  images.forEach((image, index) => {
    const marker = inlineImageMarker(index);
    if (result.includes(marker)) return;
    const placed = insertFigureAfterHeading(result, image.afterHeading, marker);
    result = placed.markdown;
  });
  return result;
}
