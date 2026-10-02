import assert from "node:assert/strict";
import test from "node:test";
import {
  applyTagRemoval,
  classifyVisibility,
  parseQueueRows,
  resolveDisplayString,
  stripFounderReviewFromLine,
} from "./founder-review-lib.mjs";

test("resolveDisplayString reads export on next line", () => {
  const source = `// FOUNDER-REVIEW: note
export const X = "Hello founder";`;
  assert.equal(resolveDisplayString(source, 0), "Hello founder");
});

test("stripFounderReviewFromLine removes line comments", () => {
  assert.equal(
    stripFounderReviewFromLine('  // FOUNDER-REVIEW: privacy note'),
    null,
  );
});

test("applyTagRemoval keeps string literal", () => {
  const source = `// FOUNDER-REVIEW: note
export const X = "Keep me";
`;
  const next = applyTagRemoval(source, [1]);
  assert.match(next, /Keep me/);
  assert.doesNotMatch(next, /FOUNDER-REVIEW/);
});

test("classifyVisibility treats CSS notes as internal", () => {
  const source = "/* FOUNDER-REVIEW: Rx label */";
  const hit = { file: "apps/web/app/globals.css", line: 1, cover: ".foo" };
  assert.equal(classifyVisibility(hit, source), "internal");
});

test("parseQueueRows reads checked markdown rows", () => {
  const md = `
| FR-001 | [x] | \`apps/web/a.ts:3\` | Hello |
| FR-002 | [ ] | \`apps/web/b.ts:4\` | World |
`;
  const rows = parseQueueRows(md).filter((r) => r.approved);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "FR-001");
  assert.deepEqual(rows[0].tagLines, [3]);
});
