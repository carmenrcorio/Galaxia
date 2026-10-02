import { readFileSync, writeFileSync, mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, afterEach } from "vitest";
// @ts-expect-error .mjs import
import {
  applyChironSynastryReadings,
  isApproved,
  parseBatch,
  parseExistingChironCells,
  stripChironBlock,
} from "../../../scripts/readings-apply-lib.mjs";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const SYNASTRY_SRC = join(REPO_ROOT, "packages/astro/src/synastry-interpretations.ts");

function miniSynastryTemplate(chironBlock = "") {
  const base = stripChironBlock(readFileSync(SYNASTRY_SRC, "utf8"));
  const fnIdx = base.indexOf("export function interpretSynastryAspect");
  const close = base.lastIndexOf("\n};", fnIdx);
  const head = base.slice(0, close);
  const tail = base.slice(close);
  return chironBlock ? `${head}\n${chironBlock}\n${tail}` : `${head}${tail}`;
}

describe("readings-apply parser", () => {
  it("treats blank Approve as not approved", () => {
    const md = `### CH-001 · \`chiron-sun:conjunction\`
- **Short:** a
- **Long:** b
- **Approve:**
- **Edit:** notes here
`;
    const row = parseBatch(md)[0]!;
    expect(row.approve).toBe("");
    expect(isApproved(row.approve)).toBe(false);
  });

  it("approves only exact yes (case-insensitive, trimmed)", () => {
    expect(isApproved("yes")).toBe(true);
    expect(isApproved(" YES ")).toBe(true);
    expect(isApproved("yes please")).toBe(false);
    expect(isApproved("notes")).toBe(false);
  });
});

describe("readings-apply additive merge", () => {
  let tempRoot = "";

  afterEach(() => {
    if (tempRoot) {
      rmSync(tempRoot, { recursive: true, force: true });
      tempRoot = "";
    }
  });

  it("merges 3 rows then 2 more without removing earlier cells", () => {
    tempRoot = mkdtempSync(join(tmpdir(), "readings-apply-"));
    const pkgDir = join(tempRoot, "packages/astro/src");
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(join(pkgDir, "synastry-interpretations.ts"), miniSynastryTemplate());

    const batch1 = `### CH-001 · \`chiron-sun:conjunction\`
- **Short:** one
- **Long:** long one
- **Approve:** yes
### CH-002 · \`chiron-sun:sextile\`
- **Short:** two
- **Long:** long two
- **Approve:** yes
### CH-003 · \`chiron-moon:trine\`
- **Short:** three
- **Long:** long three
- **Approve:** yes
`;
    const batch2 = `### CH-004 · \`chiron-mars:square\`
- **Short:** four
- **Long:** long four
- **Approve:** yes
### CH-005 · \`chiron-venus:opposition\`
- **Short:** five
- **Long:** long five
- **Approve:** yes
`;

    applyChironSynastryReadings(tempRoot, parseBatch(batch1).filter((r) => isApproved(r.approve)));
    applyChironSynastryReadings(tempRoot, parseBatch(batch2).filter((r) => isApproved(r.approve)));

    const src = readFileSync(join(pkgDir, "synastry-interpretations.ts"), "utf8");
    const cells = parseExistingChironCells(src);
    expect(cells.size).toBe(5);
    expect(cells.get("chiron-sun:conjunction")?.short).toBe("one");
    expect(cells.get("chiron-venus:opposition")?.short).toBe("five");
  });

  it("re-applying the same rows changes nothing in the file", () => {
    tempRoot = mkdtempSync(join(tmpdir(), "readings-apply-"));
    const pkgDir = join(tempRoot, "packages/astro/src");
    mkdirSync(pkgDir, { recursive: true });
    const path = join(pkgDir, "synastry-interpretations.ts");
    writeFileSync(path, miniSynastryTemplate());

    const batch = `### CH-001 · \`chiron-sun:conjunction\`
- **Short:** same
- **Long:** same long
- **Approve:** yes
`;
    const rows = parseBatch(batch).filter((r) => isApproved(r.approve));
    applyChironSynastryReadings(tempRoot, rows);
    const afterFirst = readFileSync(path, "utf8");
    const r2 = applyChironSynastryReadings(tempRoot, rows);
    expect(r2.added).toBe(0);
    expect(r2.updated).toBe(0);
    expect(r2.unchanged).toBe(1);
    expect(readFileSync(path, "utf8")).toBe(afterFirst);
  });
});
