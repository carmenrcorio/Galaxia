import { readdirSync, readFileSync, existsSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { RC_ENTITLEMENT_ID } from "../src/rc-entitlement";

const REPO_ROOT = join(__dirname, "../../..");
const DEFINITION = "packages/core/src/rc-entitlement.ts";
const PIN_TEST = "packages/core/test/rc-entitlement-id.test.ts";

/** Dashboard identifier. The only place this literal may appear in code is the core export (and this pin). */
const DASHBOARD_ID = "GalaxiaMea App Unlimited";
/** Retired identifier from #63/#64. Must not reappear in application code. */
const RETIRED_ID = "GalaxiaMea App Pro";

const SCAN_ROOTS = ["apps", "packages", "supabase/functions"];
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".jsx"]);
const SKIP_DIR_NAMES = new Set(["node_modules", ".next", "dist", "coverage", ".git"]);

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry.name)) continue;
      walk(abs, out);
      continue;
    }
    if (!EXTENSIONS.has(extname(entry.name))) continue;
    out.push(relative(REPO_ROOT, abs).split("\\").join("/"));
  }
  return out;
}

describe("RC_ENTITLEMENT_ID", () => {
  it("is the dashboard entitlement id, exactly", () => {
    expect(RC_ENTITLEMENT_ID).toBe(DASHBOARD_ID);
  });

  it("is exported from the one definition file as that exact literal", () => {
    const src = readFileSync(join(REPO_ROOT, DEFINITION), "utf8");
    expect(src).toContain(`export const RC_ENTITLEMENT_ID = "${DASHBOARD_ID}"`);
  });

  it("fails if a literal entitlement identifier reappears outside the core export", () => {
    const hits: string[] = [];
    for (const root of SCAN_ROOTS) {
      for (const rel of walk(join(REPO_ROOT, root))) {
        if (rel === DEFINITION || rel === PIN_TEST) continue;
        const src = readFileSync(join(REPO_ROOT, rel), "utf8");
        for (const needle of [DASHBOARD_ID, RETIRED_ID]) {
          if (src.includes(needle)) {
            hits.push(`${rel} contains ${JSON.stringify(needle)}`);
          }
        }
      }
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });
});
