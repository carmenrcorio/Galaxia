/**
 * Render-time curly quotes for blog prose.
 *
 * Stored `posts` rows keep straight quotes. Titles, deks, bodies, and
 * figure text are curled when a page reads them, so the transform is
 * idempotent and does not rewrite `published_at`. Fenced code, inline
 * code, markdown link URLs, and raw URLs are left alone.
 */

const APOSTROPHE = "\u2019";
const LDQUO = "\u201c";
const RDQUO = "\u201d";
const LSQUO = "\u2018";
const TOKEN = "\u0000";

/** Curly quotes for a string that contains no code fences or URLs. */
export function applyCurlyQuotesPlain(text: string): string {
  return text
    .replace(/([\p{L}\p{N}])'(?=[\p{L}\p{N}])/gu, `$1${APOSTROPHE}`)
    .replace(/([\p{L}\p{N}])'/gu, `$1${APOSTROPHE}`)
    .replace(/(^|[\s(\[{])'(?=\d)/gm, `$1${APOSTROPHE}`)
    .replace(/(^|[\s(\[{])"(?=\S)/gm, `$1${LDQUO}`)
    .replace(/"/g, RDQUO)
    .replace(/(^|[\s(\[{])'(?=\S)/gm, `$1${LSQUO}`)
    .replace(/'/g, APOSTROPHE);
}

function shieldMarkdown(input: string): { text: string; saved: string[] } {
  const saved: string[] = [];
  const text = input.replace(
    /```[\s\S]*?```|`[^`\n]*`|\[[^\]]*\]\((?:[^()\s]|\([^)]*\))*\)|https?:\/\/[^\s)]+/g,
    (match) => {
      const link = match.match(/^\[([^\]]*)\]\(((?:[^()\s]|\([^)]*\))*)\)$/);
      const stored = link ? `[${applyCurlyQuotesPlain(link[1] ?? "")}](${link[2] ?? ""})` : match;
      saved.push(stored);
      return `${TOKEN}${saved.length - 1}${TOKEN}`;
    }
  );
  return { text, saved };
}

export function applyCurlyQuotes(input: string): string {
  const { text, saved } = shieldMarkdown(input);
  return applyCurlyQuotesPlain(text).replace(
    new RegExp(`${TOKEN}(\\d+)${TOKEN}`, "g"),
    (_, index: string) => saved[Number(index)] ?? ""
  );
}
