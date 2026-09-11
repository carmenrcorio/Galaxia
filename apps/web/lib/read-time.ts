const WORDS_PER_MINUTE = 225;

/**
 * Read time estimate from word count, computed once at save time (the
 * admin editor calls this before every create/update in
 * lib/admin/posts.ts) and stored in `posts.read_time_minutes`, never
 * derived at request/render time.
 *
 * Tokens with no letter or digit are not words. A bare U+2014 used to
 * inflate the estimate because `split(/\s+/)` counted it. Do not replace
 * punctuation with spaces before splitting: that breaks URL paths
 * (`/meet-vela`) into extra words and inflates the other way.
 */
export function computeReadTimeMinutes(markdownBody: string): number {
  const words = markdownBody
    .trim()
    .split(/\s+/)
    .filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
  if (words === 0) return 1;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
