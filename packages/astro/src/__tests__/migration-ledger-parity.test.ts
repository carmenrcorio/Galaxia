/**
 * Fixture proof for scripts/migration-ledger-parity.mjs.
 *
 * Matching repo/ledger pair (including version skew on the same name) must
 * exit 0. A deliberate two-way gap must exit 1 and print both sides of the
 * diff. Lives here so `pnpm test` (`turbo run test` → @galaxia/astro) runs
 * it the same way the em-dash copy gates do.
 */
import { spawnSync } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const SCRIPT = path.join(REPO_ROOT, "scripts/migration-ledger-parity.mjs");
const FIXTURES = path.join(REPO_ROOT, "scripts/fixtures/migration-ledger");

function runParity(args: string[]) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: "utf8",
    cwd: REPO_ROOT,
  });
}

describe("migration ledger parity script", () => {
  it("built-in self-test: match fixture passes, gap fixture fails internally", () => {
    const r = runParity(["--self-test"]);
    expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(0);
    expect(r.stdout).toContain("self-test match fixture PASSED");
    expect(r.stdout).toContain("self-test gap fixture FAILED as required");
  });

  it("passes on a fixture repo/ledger pair with no name gap (version skew allowed)", () => {
    const r = runParity([
      "--migrations-dir",
      path.join(FIXTURES, "match/migrations"),
      "--offline-ledger",
      path.join(FIXTURES, "match/ledger.json"),
    ]);
    expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(0);
    expect(r.stdout).toContain("Migration ledger parity PASSED");
    expect(r.stdout).toContain("beta:");
  });

  it("fails on a fixture repo/ledger pair with a deliberate two-way gap", () => {
    const r = runParity([
      "--migrations-dir",
      path.join(FIXTURES, "gap/migrations"),
      "--offline-ledger",
      path.join(FIXTURES, "gap/ledger.json"),
    ]);
    expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(1);
    const out = `${r.stdout}\n${r.stderr}`;
    expect(out).toContain("IN REPO, NOT IN PRODUCTION LEDGER");
    expect(out).toContain("only_in_repo");
    expect(out).toContain("IN PRODUCTION LEDGER, NOT IN REPO");
    expect(out).toContain("only_in_ledger");
    expect(out).toContain("This check does not apply migrations");
  });
});
