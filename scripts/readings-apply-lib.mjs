/**
 * Shared logic for readings:apply (tested from packages/astro).
 */
import { readFileSync, writeFileSync } from "node:fs";

export const CHIRON_MARKER = "  // ---- CHIRON SYNASTRY (Batch 01) ----";
export const SYNASTRY_PATH = "packages/astro/src/synastry-interpretations.ts";
export const MAJOR_ASPECTS = ["conjunction", "sextile", "square", "trine", "opposition"];

/** @typedef {{ id: string, cell: string, short: string, long: string, approve: string }} Row */
/** @typedef {Map<string, { short: string, long: string }>} CellMap */

/**
 * @param {string} chunk
 * @param {string} name
 */
export function extractFieldLine(chunk, name) {
  // Value is same-line only; trailing \\s* must not swallow the next bullet line.
  const re = new RegExp(`^-\\s\\*\\*${name}:\\*\\*([^\\n]*)$`, "m");
  const m = chunk.match(re);
  return m ? m[1].trim() : "";
}

/** @param {string} md */
export function parseBatch(md) {
  /** @type {Row[]} */
  const rows = [];
  const chunks = md.split(/^### /m).slice(1);
  for (const chunk of chunks) {
    const headerLine = chunk.split("\n")[0] ?? "";
    const idMatch = headerLine.match(/^([A-Z]+-\d+)/);
    const cellMatch = headerLine.match(/·\s*`([^`]+)`/);
    if (!idMatch || !cellMatch) continue;
    const id = idMatch[1];
    const cell = cellMatch[1];
    const short = extractFieldLine(chunk, "Short");
    const long = extractFieldLine(chunk, "Long");
    const approve = extractFieldLine(chunk, "Approve");
    if (!short || !long) {
      continue;
    }
    rows.push({ id, cell, short, long, approve });
  }
  return rows;
}

/** @param {string} approve */
export function isApproved(approve) {
  return approve.trim().toLowerCase() === "yes";
}

/** @param {string} s */
export function escapeTsString(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** @param {string} s */
export function unescapeTsString(s) {
  return s.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

/**
 * @param {string} src full synastry-interpretations.ts
 * @returns {CellMap}
 */
export function parseExistingChironCells(src) {
  /** @type {CellMap} */
  const map = new Map();
  const body = synastryPairObjectBody(src);
  if (!body) return map;

  const pairRe = /"([^"]*chiron[^"]*)":\s*\{/g;
  let m;
  while ((m = pairRe.exec(body)) !== null) {
    const pair = m[1];
    const pairStart = m.index + m[0].length;
    const pairBody = extractBalancedBody(body, pairStart - 1);
    if (!pairBody) continue;
    for (const aspect of MAJOR_ASPECTS) {
      const aspectRe = new RegExp(
        `${aspect}:\\s*\\{\\s*short:\\s*"((?:\\\\.|[^"\\\\])*)",\\s*long:\\s*"((?:\\\\.|[^"\\\\])*)"`,
        "s"
      );
      const am = pairBody.match(aspectRe);
      if (am) {
        map.set(`${pair}:${aspect}`, {
          short: unescapeTsString(am[1]),
          long: unescapeTsString(am[2]),
        });
      }
    }
  }
  return map;
}

/** @param {string} src */
function synastryPairObjectBody(src) {
  const open = src.indexOf("export const SYNASTRY_PAIR");
  if (open === -1) return "";
  const brace = src.indexOf("{", open);
  if (brace === -1) return "";
  const fnIdx = src.indexOf("export function interpretSynastryAspect");
  if (fnIdx === -1) return "";
  const close = src.lastIndexOf("\n};", fnIdx);
  if (close === -1 || close <= brace) return "";
  return src.slice(brace, close + 1);
}

/** @param {string} text @param {number} braceOpenIdx index of { */
function extractBalancedBody(text, braceOpenIdx) {
  if (text[braceOpenIdx] !== "{") return "";
  let depth = 0;
  for (let i = braceOpenIdx; i < text.length; i++) {
    const c = text[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return text.slice(braceOpenIdx + 1, i);
    }
  }
  return "";
}

/**
 * @param {CellMap} merged
 */
export function buildChironSynastryBlock(merged) {
  const byPair = new Map();
  for (const [cell, reading] of merged) {
    const [pair, aspect] = cell.split(":");
    if (!pair || !aspect) throw new Error(`Bad cell key ${cell}`);
    if (!pair.includes("chiron")) throw new Error(`Not a chiron pair: ${pair}`);
    if (!byPair.has(pair)) byPair.set(pair, {});
    byPair.get(pair)[aspect] = reading;
  }
  const lines = [CHIRON_MARKER];
  for (const pair of [...byPair.keys()].sort()) {
    lines.push(`  "${pair}": {`);
    for (const aspect of MAJOR_ASPECTS) {
      const reading = byPair.get(pair)[aspect];
      if (!reading) continue;
      lines.push(`    ${aspect}: {`);
      lines.push(`      short: "${escapeTsString(reading.short)}",`);
      lines.push(`      long: "${escapeTsString(reading.long)}",`);
      lines.push(`    },`);
    }
    lines.push(`  },`);
  }
  return lines.join("\n");
}

/**
 * @param {Row[]} approvedRows
 * @param {CellMap} existing
 */
export function mergeApprovedRows(approvedRows, existing) {
  /** @type {CellMap} */
  const merged = new Map(existing);
  let added = 0;
  let updated = 0;
  let unchanged = 0;
  for (const row of approvedRows) {
    const prev = merged.get(row.cell);
    const next = { short: row.short, long: row.long };
    if (!prev) {
      added++;
      merged.set(row.cell, next);
    } else if (prev.short === next.short && prev.long === next.long) {
      unchanged++;
    } else {
      updated++;
      merged.set(row.cell, next);
    }
  }
  return { merged, added, updated, unchanged };
}

/**
 * @param {string} src
 * @param {string} block
 */
/** @returns {{ start: number, end: number } | null} */
export function locateChironBlockSpan(src) {
  if (!src.includes(CHIRON_MARKER)) return null;
  const start = src.indexOf(CHIRON_MARKER);
  let end = start;
  const after = src.slice(start);
  const pairLineRe = /^\s{2}"[^"]*chiron[^"]*":\s*\{/gm;
  let lastEnd = start;
  for (const m of after.matchAll(pairLineRe)) {
    const absIdx = start + (m.index ?? 0);
    const bodyStart = absIdx + m[0].lastIndexOf("{");
    const body = extractBalancedBody(src, bodyStart);
    if (body) {
      lastEnd = bodyStart + body.length + 2;
    }
  }
  end = lastEnd;
  while (end < src.length && (src[end] === "\n" || src[end] === ",")) end++;
  return { start, end };
}

/** Remove authored Chiron block (for tests / re-staging). */
export function stripChironBlock(src) {
  const span = locateChironBlockSpan(src);
  if (!span) return src;
  return src.slice(0, span.start) + src.slice(span.end);
}

export function insertOrReplaceChironBlock(src, block) {
  const fnIdx = src.indexOf("export function interpretSynastryAspect");
  const close = src.lastIndexOf("\n};", fnIdx);
  if (close === -1) throw new Error("Could not locate SYNASTRY_PAIR closing brace");

  const span = locateChironBlockSpan(src);
  if (span) {
    const glue = block.trim() ? block + "\n" : "";
    return src.slice(0, span.start) + glue + src.slice(span.end);
  }

  return src.slice(0, close) + "\n" + block + "\n" + src.slice(close);
}

/**
 * @param {string} repoRoot
 * @param {Row[]} approved
 * @param {{ dryRun?: boolean }} opts
 */
export function applyChironSynastryReadings(repoRoot, approved, opts = {}) {
  const path = `${repoRoot}/${SYNASTRY_PATH}`;
  const src = readFileSync(path, "utf8");
  const existing = parseExistingChironCells(src);
  const { merged, added, updated, unchanged } = mergeApprovedRows(approved, existing);
  const block = buildChironSynastryBlock(merged);
  const next = insertOrReplaceChironBlock(src, block);
  if (!opts.dryRun && (added > 0 || updated > 0)) {
    writeFileSync(path, next);
  }
  return { added, updated, unchanged, totalMerged: merged.size, block, next };
}
