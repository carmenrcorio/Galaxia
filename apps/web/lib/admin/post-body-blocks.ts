/**
 * Parse a post `body` into ordered blocks for the admin photo editor.
 * Headings, paragraphs, and markdown image lines are each one block.
 * Reordering / inserting / removing images rewrites the whole body by
 * joining blocks with a blank line. Callers (the editor) are responsible
 * for having already run requireAdmin(); this module has no guard of its
 * own, same contract as every other lib/admin/* helper.
 */

export const BODY_WORD_WARN_LIMIT = 10000;

export type BodyBlockKind = "heading" | "text" | "image";

export interface BodyBlock {
  id: string;
  kind: BodyBlockKind;
  markdown: string;
  alt?: string;
  url?: string;
}

const IMAGE_LINE_RE = /^\s*!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)\s*$/;
const HEADING_LINE_RE = /^\s{0,3}#{1,6}\s+\S/;

function newBlockId(): string {
  return `block-${crypto.randomUUID()}`;
}

export function parseImageLine(line: string): { alt: string; url: string } | null {
  const match = line.match(IMAGE_LINE_RE);
  if (!match) return null;
  return { alt: match[1] ?? "", url: match[2] ?? "" };
}

export function markdownImageLine(url: string, alt = "photo"): string {
  const safeAlt = alt.replace(/[[\]]/g, "").trim() || "photo";
  return `![${safeAlt}](${url})`;
}

export function makeImageBlock(url: string, alt = "photo"): BodyBlock {
  return {
    id: newBlockId(),
    kind: "image",
    markdown: markdownImageLine(url, alt),
    alt: alt.replace(/[[\]]/g, "").trim() || "photo",
    url
  };
}

export function parseBodyBlocks(body: string): BodyBlock[] {
  const lines = (body ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocks: BodyBlock[] = [];
  let buffer: string[] = [];

  function flushBuffer() {
    if (buffer.length === 0) return;
    const markdown = buffer.join("\n");
    const kind: BodyBlockKind = HEADING_LINE_RE.test(buffer[0] ?? "") ? "heading" : "text";
    blocks.push({ id: newBlockId(), kind, markdown });
    buffer = [];
  }

  for (const line of lines) {
    const image = parseImageLine(line);
    if (image) {
      flushBuffer();
      blocks.push({
        id: newBlockId(),
        kind: "image",
        markdown: line.trim(),
        alt: image.alt,
        url: image.url
      });
      continue;
    }
    if (HEADING_LINE_RE.test(line)) {
      flushBuffer();
      blocks.push({ id: newBlockId(), kind: "heading", markdown: line.trimEnd() });
      continue;
    }
    if (line.trim() === "") {
      flushBuffer();
      continue;
    }
    buffer.push(line);
  }
  flushBuffer();
  return blocks;
}

export function serializeBodyBlocks(blocks: BodyBlock[]): string {
  return blocks
    .map((block) => block.markdown.trimEnd())
    .filter((markdown) => markdown.length > 0)
    .join("\n\n");
}

export function moveBlock<T>(items: T[], from: number, to: number): T[] {
  if (from === to) return items;
  if (from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = items.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function insertImageAfter(blocks: BodyBlock[], index: number, url: string, alt = "photo"): BodyBlock[] {
  const next = blocks.slice();
  const at = Math.min(Math.max(index + 1, 0), next.length);
  next.splice(at, 0, makeImageBlock(url, alt));
  return next;
}

export function removeBlock(blocks: BodyBlock[], index: number): BodyBlock[] {
  if (index < 0 || index >= blocks.length) return blocks;
  const next = blocks.slice();
  next.splice(index, 1);
  return next;
}

export function countBodyWords(body: string): number {
  const trimmed = body.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

export function shouldWarnBeforeBodySave(body: string): boolean {
  return countBodyWords(body) > BODY_WORD_WARN_LIMIT;
}
