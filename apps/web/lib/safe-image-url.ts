import { SITE_ORIGIN } from "./blog-metadata";

const BLOCKED_IN_IMAGE_URL = /<\/script>|javascript:|data:/i;

function containsBlockedImageUrlPattern(value: string): boolean {
  return BLOCKED_IN_IMAGE_URL.test(value);
}

/** Absolute image URLs for OG / JSON-LD must be https and parse as a URL. */
export function isValidHttpsAbsoluteImageUrl(url: string): boolean {
  if (!url.startsWith("https://")) return false;
  if (containsBlockedImageUrlPattern(url)) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Relative public paths or absolute https URLs safe to use in `<img src>`.
 * Rejects `http:`, `data:`, `javascript:`, protocol-relative URLs, and strings
 * that could break out of HTML context.
 */
export function safeFigureImageSrc(src: string): string | null {
  const trimmed = src.trim();
  if (!trimmed || containsBlockedImageUrlPattern(trimmed)) return null;

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    try {
      new URL(trimmed, SITE_ORIGIN);
      return trimmed;
    } catch {
      return null;
    }
  }

  if (!isValidHttpsAbsoluteImageUrl(trimmed)) return null;
  return trimmed;
}
