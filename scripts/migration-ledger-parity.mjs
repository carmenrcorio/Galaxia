#!/usr/bin/env node
/**
 * Migration ledger parity check (production list_migrations vs repo files).
 *
 * Compares GET /v1/projects/{ref}/database/migrations (read-only) against
 * `supabase/migrations/*.sql`. Identity is the snake_case **name** (the
 * filename suffix after `{YYYYMMDDHHMMSS}_`). Version timestamps often
 * diverge because MCP `apply_migration` stamps the apply time rather than
 * the committed filename prefix — that skew is logged, not a failure.
 *
 * This script does NOT apply migrations. Drift is a human decision.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=… node scripts/migration-ledger-parity.mjs
 *   node scripts/migration-ledger-parity.mjs --offline-ledger <file.json>
 *   node scripts/migration-ledger-parity.mjs --self-test
 *
 * Exit 0 = parity. Exit 1 = drift / misconfig / missing secret.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const DEFAULT_MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");
const API_BASE = "https://api.supabase.com/v1";
const DEFAULT_PROJECT_REF = "eigfvribtntbxyjutsma";
const FILENAME_RE = /^(\d{14})_(.+)\.sql$/;

const LABEL_REPO_ONLY = "IN REPO, NOT IN PRODUCTION LEDGER";
const LABEL_LEDGER_ONLY = "IN PRODUCTION LEDGER, NOT IN REPO";

export { FILENAME_RE, LABEL_LEDGER_ONLY, LABEL_REPO_ONLY };

function fail(msg) {
  console.error(`::error::${msg}`);
  console.error(`FAIL: ${msg}`);
  process.exitCode = 1;
}

function info(msg) {
  console.log(msg);
}

/**
 * @param {string} filename
 * @returns {{ version: string, name: string } | null}
 */
export function parseMigrationFilename(filename) {
  const m = FILENAME_RE.exec(filename);
  if (!m) return null;
  return { version: m[1], name: m[2] };
}

/**
 * @param {string} dir
 * @returns {{ files: { filename: string, version: string, name: string }[], malformed: string[] }}
 */
export function listLocalMigrations(dir) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    throw new Error(`Missing migrations directory: ${dir}`);
  }
  /** @type {{ filename: string, version: string, name: string }[]} */
  const files = [];
  /** @type {string[]} */
  const malformed = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".") || entry.startsWith("_")) continue;
    const abs = join(dir, entry);
    if (!statSync(abs).isFile()) continue;
    if (!entry.endsWith(".sql")) continue;
    const parsed = parseMigrationFilename(entry);
    if (!parsed) {
      malformed.push(entry);
      continue;
    }
    files.push({ filename: entry, version: parsed.version, name: parsed.name });
  }
  files.sort((a, b) => a.filename.localeCompare(b.filename));
  return { files, malformed };
}

/**
 * Accept a raw Management API array, MCP `{ migrations: [...] }`, or a
 * JSON file that wrapped either.
 * @param {unknown} raw
 * @returns {{ version: string, name: string }[]}
 */
export function normalizeLedger(raw) {
  if (raw == null) {
    throw new Error("Ledger payload is empty");
  }
  /** @type {unknown} */
  let rows = raw;
  if (typeof raw === "object" && !Array.isArray(raw) && raw !== null) {
    const obj = /** @type {Record<string, unknown>} */ (raw);
    if (Array.isArray(obj.migrations)) rows = obj.migrations;
    else if (Array.isArray(obj.data)) rows = obj.data;
  }
  if (!Array.isArray(rows)) {
    throw new Error(
      `Ledger payload is not an array (got ${Object.prototype.toString.call(raw)})`
    );
  }
  return rows.map((row, i) => {
    if (!row || typeof row !== "object") {
      throw new Error(`Ledger row ${i} is not an object`);
    }
    const r = /** @type {Record<string, unknown>} */ (row);
    const version = String(r.version ?? "");
    const name = String(r.name ?? "");
    if (!name) throw new Error(`Ledger row ${i} has no name`);
    return { version, name };
  });
}

/**
 * @param {{ filename: string, version: string, name: string }[]} local
 * @param {{ version: string, name: string }[]} ledger
 */
export function diffMigrationLedger(local, ledger) {
  /** @type {Map<string, { filename: string, version: string, name: string }[]>} */
  const localByName = new Map();
  for (const f of local) {
    const list = localByName.get(f.name) || [];
    list.push(f);
    localByName.set(f.name, list);
  }
  /** @type {Map<string, { version: string, name: string }[]>} */
  const ledgerByName = new Map();
  for (const row of ledger) {
    const list = ledgerByName.get(row.name) || [];
    list.push(row);
    ledgerByName.set(row.name, list);
  }

  const localNames = new Set(localByName.keys());
  const ledgerNames = new Set(ledgerByName.keys());

  const inRepoNotLedger = [...localNames]
    .filter((n) => !ledgerNames.has(n))
    .sort()
    .map((name) => localByName.get(name)[0]);

  const inLedgerNotRepo = [...ledgerNames]
    .filter((n) => !localNames.has(n))
    .sort()
    .map((name) => ledgerByName.get(name)[0]);

  /** @type {{ name: string, fileVersion: string, ledgerVersion: string, filename: string }[]} */
  const versionSkew = [];
  for (const name of localNames) {
    if (!ledgerNames.has(name)) continue;
    const file = localByName.get(name)[0];
    const remote = ledgerByName.get(name)[0];
    if (file.version !== remote.version) {
      versionSkew.push({
        name,
        filename: file.filename,
        fileVersion: file.version,
        ledgerVersion: remote.version
      });
    }
  }
  versionSkew.sort((a, b) => a.name.localeCompare(b.name));

  const duplicateLocalNames = [...localByName.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([name, list]) => ({ name, files: list.map((f) => f.filename) }));
  const duplicateLedgerNames = [...ledgerByName.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([name, list]) => ({
      name,
      versions: list.map((r) => r.version)
    }));

  return {
    inRepoNotLedger,
    inLedgerNotRepo,
    versionSkew,
    duplicateLocalNames,
    duplicateLedgerNames
  };
}

/**
 * @param {ReturnType<typeof diffMigrationLedger>} diff
 * @param {string[]} malformed
 */
function reportDiff(diff, malformed) {
  let failed = false;

  if (malformed.length) {
    failed = true;
    fail(
      `Malformed migration filename(s) (want {YYYYMMDDHHMMSS}_{name}.sql): ${malformed.join(", ")}`
    );
  }

  if (diff.duplicateLocalNames.length) {
    failed = true;
    for (const d of diff.duplicateLocalNames) {
      fail(
        `Duplicate migration name in repo: ${d.name} → ${d.files.join(", ")}`
      );
    }
  }

  if (diff.duplicateLedgerNames.length) {
    failed = true;
    for (const d of diff.duplicateLedgerNames) {
      fail(
        `Duplicate migration name in production ledger: ${d.name} → versions ${d.versions.join(", ")}`
      );
    }
  }

  if (diff.inRepoNotLedger.length || diff.inLedgerNotRepo.length) {
    failed = true;
    const lines = ["Migration ledger drift."];
    lines.push(`${LABEL_REPO_ONLY}:`);
    if (!diff.inRepoNotLedger.length) {
      lines.push("  (none)");
    } else {
      for (const f of diff.inRepoNotLedger) {
        lines.push(`  - ${f.filename} (name=${f.name})`);
      }
    }
    lines.push(`${LABEL_LEDGER_ONLY}:`);
    if (!diff.inLedgerNotRepo.length) {
      lines.push("  (none)");
    } else {
      for (const r of diff.inLedgerNotRepo) {
        lines.push(`  - ${r.version} ${r.name}`);
      }
    }
    lines.push(
      "This check does not apply migrations. A human decides whether to apply, skip, or document the gap."
    );
    fail(lines.join("\n"));
  }

  if (diff.versionSkew.length) {
    info(
      `NOTE: ${diff.versionSkew.length} name(s) match with different version timestamps (apply_migration stamps apply-time; not a failure):`
    );
    for (const s of diff.versionSkew) {
      info(
        `  ${s.name}: file ${s.fileVersion} vs ledger ${s.ledgerVersion}`
      );
    }
  }

  return failed;
}

async function fetchProductionLedger(projectRef, token) {
  const url = `${API_BASE}/projects/${projectRef}/database/migrations`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `GET ${url} → HTTP ${res.status}: ${text.slice(0, 500)}`
    );
  }
  try {
    return normalizeLedger(JSON.parse(text));
  } catch (err) {
    throw new Error(
      `Failed to parse migrations response: ${err instanceof Error ? err.message : err}. Body starts: ${text.slice(0, 200)}`
    );
  }
}

function loadOfflineLedger(path) {
  const raw = readFileSync(path, "utf8");
  return normalizeLedger(JSON.parse(raw));
}

function fixtureDir(kind) {
  return join(ROOT, "scripts", "fixtures", "migration-ledger", kind);
}

function runSelfTest() {
  const matchDir = join(fixtureDir("match"), "migrations");
  const matchLedger = loadOfflineLedger(join(fixtureDir("match"), "ledger.json"));
  const matchLocal = listLocalMigrations(matchDir);
  if (matchLocal.malformed.length) {
    fail(`self-test match fixture has malformed files: ${matchLocal.malformed.join(", ")}`);
    return;
  }
  const matchDiff = diffMigrationLedger(matchLocal.files, matchLedger);
  if (
    matchDiff.inRepoNotLedger.length ||
    matchDiff.inLedgerNotRepo.length ||
    matchDiff.duplicateLocalNames.length ||
    matchDiff.duplicateLedgerNames.length
  ) {
    fail("self-test: match fixture must pass (no name gaps)");
    return;
  }
  if (matchDiff.versionSkew.length !== 1 || matchDiff.versionSkew[0].name !== "beta") {
    fail(
      `self-test: match fixture must record version skew on beta, got ${JSON.stringify(matchDiff.versionSkew)}`
    );
    return;
  }
  info("self-test match fixture PASSED (including version-skew-is-not-failure)");

  const gapDir = join(fixtureDir("gap"), "migrations");
  const gapLedger = loadOfflineLedger(join(fixtureDir("gap"), "ledger.json"));
  const gapLocal = listLocalMigrations(gapDir);
  const gapDiff = diffMigrationLedger(gapLocal.files, gapLedger);
  const repoOnly = gapDiff.inRepoNotLedger.map((f) => f.name);
  const ledgerOnly = gapDiff.inLedgerNotRepo.map((r) => r.name);
  if (!repoOnly.includes("only_in_repo") || !ledgerOnly.includes("only_in_ledger")) {
    fail(
      `self-test: gap fixture must report both directions, got repoOnly=${JSON.stringify(repoOnly)} ledgerOnly=${JSON.stringify(ledgerOnly)}`
    );
    return;
  }
  info("self-test gap fixture FAILED as required (both directions of drift)");
  info("self-test OK");
}

function parseArgs(argv) {
  /** @type {{ offlineLedger: string | null, projectRef: string, migrationsDir: string, selfTest: boolean }} */
  const out = {
    offlineLedger: null,
    projectRef: process.env.SUPABASE_PROJECT_REF || DEFAULT_PROJECT_REF,
    migrationsDir: DEFAULT_MIGRATIONS_DIR,
    selfTest: false
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--offline-ledger") {
      out.offlineLedger = argv[++i];
    } else if (a === "--project-ref") {
      out.projectRef = argv[++i];
    } else if (a === "--migrations-dir") {
      out.migrationsDir = argv[++i];
    } else if (a === "--self-test") {
      out.selfTest = true;
    } else if (a === "--help" || a === "-h") {
      console.log(`Usage:
  SUPABASE_ACCESS_TOKEN=sbp_… node scripts/migration-ledger-parity.mjs
  node scripts/migration-ledger-parity.mjs --offline-ledger <file.json>
  node scripts/migration-ledger-parity.mjs --self-test

Options:
  --project-ref <ref>       Default: ${DEFAULT_PROJECT_REF}
  --migrations-dir <dir>    Default: supabase/migrations
  --offline-ledger <file>   Compare against a JSON array of {version,name}
                            (or {migrations:[...]}) instead of the live API.
  --self-test               Fixture check: matching pair passes, gap pair fails.
`);
      process.exit(0);
    } else {
      fail(`Unknown arg: ${a}`);
    }
  }
  if (out.migrationsDir && !out.migrationsDir.startsWith("/")) {
    out.migrationsDir = join(process.cwd(), out.migrationsDir);
  }
  if (out.offlineLedger && !out.offlineLedger.startsWith("/")) {
    out.offlineLedger = join(process.cwd(), out.offlineLedger);
  }
  return out;
}

async function main() {
  process.exitCode = 0;
  const args = parseArgs(process.argv.slice(2));
  if (process.exitCode) return;

  if (args.selfTest) {
    runSelfTest();
    if (!process.exitCode) info("\nMigration ledger parity self-test PASSED.");
    else console.error("\nMigration ledger parity self-test FAILED.");
    return;
  }

  let local;
  try {
    local = listLocalMigrations(args.migrationsDir);
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
    return;
  }
  info(`Local migration files: ${local.files.length} in ${args.migrationsDir}`);

  const token = process.env.SUPABASE_ACCESS_TOKEN || "";
  /** @type {{ version: string, name: string }[]} */
  let ledger;
  try {
    if (args.offlineLedger) {
      info(`Comparison mode: offline ledger ${args.offlineLedger}`);
      ledger = loadOfflineLedger(args.offlineLedger);
    } else {
      if (!token) {
        fail(
          "SUPABASE_ACCESS_TOKEN is not set. Add it as a repo Actions secret (CI-dedicated PAT)."
        );
        return;
      }
      info(
        `Comparison mode: live GET /v1/projects/${args.projectRef}/database/migrations (read-only; does not apply)`
      );
      ledger = await fetchProductionLedger(args.projectRef, token);
    }
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
    return;
  }

  info(`Production ledger entries: ${ledger.length}`);
  const diff = diffMigrationLedger(local.files, ledger);
  const failed = reportDiff(diff, local.malformed);

  if (failed || process.exitCode) {
    console.error("\nMigration ledger parity FAILED.");
  } else {
    info(
      `\nMigration ledger parity PASSED. ${local.files.length} file(s) ↔ ${ledger.length} ledger row(s) matched by name.`
    );
  }
}

function isMain() {
  try {
    return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
  } catch {
    return false;
  }
}

if (isMain()) {
  main().catch((err) => {
    fail(err instanceof Error ? err.stack || err.message : String(err));
  });
}
