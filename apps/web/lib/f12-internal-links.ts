/**
 * F12 Phase 6: first-mention internal links in published post bodies.
 * Shared by the migration generator and unit tests. Does not open a database.
 */

export const F12_TERM_LINKS = [
  { term: "synastry aspects", slug: "synastry-aspects-explained" },
  { term: "synastry chart", slug: "synastry-chart-meaning" },
  { term: "moon square saturn", slug: "moon-square-saturn-parent-child" },
  { term: "compatibility scores", slug: "compatibility-scores-wrong-question" },
  { term: "sun sign", slug: "sun-sign-not-personality" },
  { term: "moon sign", slug: "mothers-moon-sign-apology" },
  { term: "synastry", slug: "synastry-chart-meaning" }
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function termPattern(term: string): RegExp {
  // Do not match inside a path (/synastry-chart-meaning) or a hyphenated
  // token (sun-sign). Trailing letters block "sun sign" inside "sun signs".
  return new RegExp(`(?<![A-Za-z0-9/-])${escapeRegExp(term)}(?![A-Za-z0-9-])`, "i");
}

function collectProtectedRanges(markdown: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let inFence = false;
  let offset = 0;
  const lines = markdown.split("\n");
  for (const line of lines) {
    const lineEnd = offset + line.length;
    if (line.trimStart().startsWith("```")) {
      inFence = !inFence;
      ranges.push([offset, lineEnd]);
    } else if (inFence || /^#{1,6} /.test(line)) {
      ranges.push([offset, lineEnd]);
    }
    offset = lineEnd + 1;
  }

  const link = /!?\[(?:[^\]]*)\]\([^)]*\)/g;
  let match: RegExpExecArray | null;
  while ((match = link.exec(markdown))) {
    ranges.push([match.index, match.index + match[0].length]);
  }
  return ranges;
}

function isProtected(index: number, ranges: Array<[number, number]>): boolean {
  return ranges.some(([start, end]) => index >= start && index < end);
}

function isPrefixOfLongerTerm(markdown: string, index: number, term: string): boolean {
  const rest = markdown.slice(index);
  return F12_TERM_LINKS.some(({ term: other }) => {
    if (other.length <= term.length) return false;
    if (!other.toLowerCase().startsWith(term.toLowerCase())) return false;
    return termPattern(other).exec(rest)?.index === 0;
  });
}

function linkFirstMention(markdown: string, term: string, slug: string): string {
  const ranges = collectProtectedRanges(markdown);
  const scanner = new RegExp(termPattern(term).source, "gi");
  let match: RegExpExecArray | null;
  while ((match = scanner.exec(markdown))) {
    if (isProtected(match.index, ranges)) continue;
    if (isPrefixOfLongerTerm(markdown, match.index, term)) continue;
    const original = match[0];
    const linked = `[${original}](/${slug})`;
    return markdown.slice(0, match.index) + linked + markdown.slice(match.index + original.length);
  }
  return markdown;
}

/**
 * Link the first unlinked mention of each approved term. Longer phrases
 * are applied first so "synastry chart" wins over "synastry" at the same
 * span. Never links a post to itself.
 */
export function linkFirstMentions(body: string, sourceSlug: string): string {
  const terms = [...F12_TERM_LINKS].sort((a, b) => b.term.length - a.term.length);
  let out = body;
  for (const { term, slug } of terms) {
    if (slug === sourceSlug) continue;
    out = linkFirstMention(out, term, slug);
  }
  return out;
}

export function markdownContainsLink(body: string, href: string): boolean {
  return body.includes(`](${href})`);
}
