#!/usr/bin/env node
/**
 * Release-time collator for the `changelog.d/` fragment directory.
 *
 * Every branch drops its changelog entry into its own file under
 * `changelog.d/<branch-slug>.md` (see `changelog.d/README.md`), so parallel
 * branches never collide on `CHANGELOG.md`. At release, this script folds those
 * fragments into the top of `CHANGELOG.md` (newest first) and removes them.
 *
 * Ordering: fragments are inserted newest-first, using each file's last git
 * commit time when git is available, falling back to filesystem mtime. This
 * matches the "Newest first" house style of CHANGELOG.md.
 *
 * Usage (from the repo root):
 *   node scripts/collate-changelog.mjs           # preview only, no writes
 *   node scripts/collate-changelog.mjs --write   # apply + delete fragments
 *   pnpm changelog:collate -- --write
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FRAGMENT_DIR = path.join(ROOT, "changelog.d");
const CHANGELOG = path.join(ROOT, "CHANGELOG.md");

const WRITE = process.argv.includes("--write");

/** Files in changelog.d/ that are NOT entries. */
function isIgnored(name) {
  return name === "README.md" || name.startsWith("_") || !name.endsWith(".md");
}

/** Last git commit time (ms) for a file, or null if unavailable/untracked. */
function gitTime(file) {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%ct", "--", file], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    return out ? Number(out) * 1000 : null;
  } catch {
    return null;
  }
}

function listFragments() {
  if (!fs.existsSync(FRAGMENT_DIR)) return [];
  return fs
    .readdirSync(FRAGMENT_DIR)
    .filter((name) => !isIgnored(name))
    .map((name) => {
      const full = path.join(FRAGMENT_DIR, name);
      const time = gitTime(full) ?? fs.statSync(full).mtimeMs;
      return { name, full, time };
    })
    // Newest first; stable tiebreak on name (descending) for determinism.
    .sort((a, b) => b.time - a.time || (a.name < b.name ? 1 : -1));
}

/** Insert `block` right after the intro header (the first `---` line). */
function spliceIntoChangelog(source, block) {
  const lines = source.split("\n");
  const sepIndex = lines.findIndex((l) => l.trim() === "---");
  if (sepIndex === -1) {
    throw new Error(
      "Could not find the intro separator (`---`) in CHANGELOG.md; refusing to guess where to insert.",
    );
  }
  const head = lines.slice(0, sepIndex + 1).join("\n");
  const rest = lines.slice(sepIndex + 1).join("\n").replace(/^\n+/, "");
  // Trailing `---` keeps the collated block separated from existing history,
  // matching the "one `---` between every section" house style.
  return `${head}\n\n${block.trim()}\n\n---\n\n${rest}`;
}

function main() {
  const fragments = listFragments();

  if (fragments.length === 0) {
    console.log("No changelog fragments in changelog.d/ — nothing to collate.");
    return;
  }

  const block = fragments
    .map((f) => fs.readFileSync(f.full, "utf8").trim())
    .join("\n\n---\n\n");

  console.log(`Collating ${fragments.length} fragment(s), newest first:`);
  for (const f of fragments) console.log(`  - ${f.name}`);

  if (!WRITE) {
    console.log("\n--- preview (run with --write to apply) ---\n");
    console.log(block);
    return;
  }

  const updated = spliceIntoChangelog(fs.readFileSync(CHANGELOG, "utf8"), block);
  fs.writeFileSync(CHANGELOG, updated);
  for (const f of fragments) fs.rmSync(f.full);

  console.log(`\nCHANGELOG.md updated; removed ${fragments.length} consumed fragment(s).`);
}

main();
