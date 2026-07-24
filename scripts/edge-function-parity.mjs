#!/usr/bin/env node
/**
 * Edge-function source parity check (Management API body vs repo).
 *
 * Compares deployed SOURCE TEXT from
 *   GET /v1/projects/{ref}/functions/{slug}/body  (multipart/form-data)
 * against `supabase/functions/<slug>/…` on disk.
 *
 * Does NOT use `ezbr_sha256` — that hashes the bundled eszip, not index.ts.
 * A raw-source SHA vs ezbr_sha256 comparison would never match and would hide
 * real drift.
 *
 * Also asserts each function's live `verify_jwt` matches EXPECTED_VERIFY_JWT.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=… node scripts/edge-function-parity.mjs
 *   node scripts/edge-function-parity.mjs --offline-deployed <dir>
 *
 * Exit 0 = parity. Exit 1 = divergence / misconfig / missing secret.
 */

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const FUNCTIONS_DIR = join(ROOT, "supabase", "functions");
const API_BASE = "https://api.supabase.com/v1";
const DEFAULT_PROJECT_REF = "eigfvribtntbxyjutsma";

/** Live config that must not flip silently. */
const EXPECTED_VERIFY_JWT = {
  "vela-chat": false
};

function fail(msg) {
  console.error(`::error::${msg}`);
  console.error(`FAIL: ${msg}`);
  process.exitCode = 1;
}

function info(msg) {
  console.log(msg);
}

function sha256(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/** Normalize to LF so laptop CRLF vs deployed LF cannot false-positive. */
function normalizeText(text) {
  return text.replace(/\r\n/g, "\n");
}

function listLocalFunctions() {
  if (!existsSync(FUNCTIONS_DIR)) {
    fail(`Missing ${FUNCTIONS_DIR}`);
    return [];
  }
  return readdirSync(FUNCTIONS_DIR)
    .filter((name) => {
      if (name.startsWith(".") || name.startsWith("_")) return false;
      return statSync(join(FUNCTIONS_DIR, name)).isDirectory();
    })
    .sort();
}

function walkFiles(dir) {
  /** @type {string[]} */
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "." || entry === "..") continue;
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) out.push(...walkFiles(abs));
    else out.push(abs);
  }
  return out;
}

function localFilesForSlug(slug) {
  const base = join(FUNCTIONS_DIR, slug);
  /** @type {Map<string, string>} */
  const map = new Map();
  for (const abs of walkFiles(base)) {
    const rel = relative(base, abs).split(sep).join("/");
    map.set(rel, normalizeText(readFileSync(abs, "utf8")));
  }
  return map;
}

/**
 * Minimal multipart/form-data parser (no deps).
 * Returns { files: Map<relativePath, text>, metadata }
 */
function parseMultipart(buffer, contentType) {
  const ct = contentType || "";
  const m = /boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(ct);
  if (!m) {
    throw new Error(`No multipart boundary in Content-Type: ${ct}`);
  }
  const boundary = m[1] || m[2];
  const text = buffer.toString("utf8");
  const parts = text.split(`--${boundary}`);
  /** @type {Map<string, string>} */
  const files = new Map();
  let metadata = {};

  for (const raw of parts) {
    if (!raw || raw === "--" || raw === "--\r\n" || raw === "--\n") continue;
    let part = raw;
    if (part.startsWith("\r\n")) part = part.slice(2);
    else if (part.startsWith("\n")) part = part.slice(1);
    if (part.endsWith("\r\n")) part = part.slice(0, -2);
    else if (part.endsWith("\n")) part = part.slice(0, -1);
    if (part === "--") continue;

    const headerEnd = part.indexOf("\r\n\r\n") >= 0
      ? part.indexOf("\r\n\r\n")
      : part.indexOf("\n\n");
    if (headerEnd < 0) continue;
    const sepLen = part.includes("\r\n\r\n") ? 4 : 2;
    const header = part.slice(0, headerEnd);
    let body = part.slice(headerEnd + sepLen);
    if (body.endsWith("\r\n")) body = body.slice(0, -2);
    else if (body.endsWith("\n")) body = body.slice(0, -1);

    const nameMatch = /name="([^"]+)"/i.exec(header);
    const fileMatch = /filename="([^"]+)"/i.exec(header);
    if (fileMatch) {
      let name = fileMatch[1].replace(/\\/g, "/");
      // Deployed parts often look like "vela-chat/index.ts" — strip slug prefix later.
      files.set(name, normalizeText(body));
    } else if (nameMatch && nameMatch[1] === "metadata") {
      try {
        metadata = JSON.parse(body);
      } catch {
        metadata = { raw: body };
      }
    }
  }
  return { files, metadata };
}

/**
 * Map deployed filenames onto local relative paths for a slug.
 * Accepts "index.ts", "vela-chat/index.ts", or "supabase/functions/vela-chat/index.ts".
 */
function normalizeDeployedPaths(slug, deployedFiles) {
  /** @type {Map<string, string>} */
  const out = new Map();
  const prefixes = [
    `${slug}/`,
    `supabase/functions/${slug}/`,
    `source/supabase/functions/${slug}/`
  ];
  for (const [name, content] of deployedFiles) {
    let rel = name.replace(/\\/g, "/");
    for (const p of prefixes) {
      if (rel.startsWith(p)) {
        rel = rel.slice(p.length);
        break;
      }
    }
    out.set(rel, content);
  }
  return out;
}

async function apiFetch(path, token, { accept } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...(accept ? { Accept: accept } : {})
    }
  });
  return res;
}

async function fetchDeployedFunction(projectRef, slug, token) {
  const metaRes = await apiFetch(
    `/projects/${projectRef}/functions/${slug}`,
    token
  );
  if (!metaRes.ok) {
    throw new Error(
      `GET function ${slug} → HTTP ${metaRes.status}: ${await metaRes.text()}`
    );
  }
  const meta = await metaRes.json();

  const bodyRes = await apiFetch(
    `/projects/${projectRef}/functions/${slug}/body`,
    token,
    { accept: "multipart/form-data" }
  );
  if (!bodyRes.ok) {
    throw new Error(
      `GET function body ${slug} → HTTP ${bodyRes.status}: ${await bodyRes.text()}`
    );
  }
  const buf = Buffer.from(await bodyRes.arrayBuffer());
  const parsed = parseMultipart(buf, bodyRes.headers.get("content-type") || "");
  return {
    meta,
    files: normalizeDeployedPaths(slug, parsed.files)
  };
}

function loadOfflineDeployed(dir, slug) {
  const base = join(dir, slug);
  if (!existsSync(base)) {
    throw new Error(`Offline deployed dir missing slug folder: ${base}`);
  }
  /** @type {Map<string, string>} */
  const files = new Map();
  for (const abs of walkFiles(base)) {
    const rel = relative(base, abs).split(sep).join("/");
    files.set(rel, normalizeText(readFileSync(abs, "utf8")));
  }
  // Offline mode cannot see live verify_jwt — caller must pass --expect-verify-jwt
  // via the EXPECTED map check only when meta is present.
  return { meta: null, files };
}

function compareSlug(slug, local, deployed) {
  let ok = true;
  const allKeys = new Set([...local.keys(), ...deployed.keys()]);
  for (const key of [...allKeys].sort()) {
    const l = local.get(key);
    const d = deployed.get(key);
    if (l === undefined) {
      fail(`[${slug}] deployed has ${key} but repo does not`);
      ok = false;
      continue;
    }
    if (d === undefined) {
      fail(`[${slug}] repo has ${key} but deployed does not`);
      ok = false;
      continue;
    }
    if (l !== d) {
      fail(
        `[${slug}] SOURCE DIVERGENCE in ${key}: ` +
          `repo_sha256=${sha256(l)} deployed_sha256=${sha256(d)} ` +
          `(compared body text from Management API, not ezbr_sha256)`
      );
      ok = false;
      continue;
    }
    info(`[${slug}] OK ${key} sha256=${sha256(l)}`);
  }
  return ok;
}

function parseArgs(argv) {
  /** @type {{ offlineDeployed: string | null; projectRef: string }} */
  const out = {
    offlineDeployed: null,
    projectRef: process.env.SUPABASE_PROJECT_REF || DEFAULT_PROJECT_REF
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--offline-deployed") {
      out.offlineDeployed = argv[++i];
    } else if (a === "--project-ref") {
      out.projectRef = argv[++i];
    } else if (a === "--help" || a === "-h") {
      console.log(`Usage:
  SUPABASE_ACCESS_TOKEN=sbp_… node scripts/edge-function-parity.mjs
  node scripts/edge-function-parity.mjs --offline-deployed <dir>

Options:
  --project-ref <ref>     Default: ${DEFAULT_PROJECT_REF}
  --offline-deployed <dir>
      Compare repo sources to <dir>/<slug>/… instead of calling the API.
      Skips live verify_jwt assertion (use the deploy workflow for that).
`);
      process.exit(0);
    } else {
      fail(`Unknown arg: ${a}`);
    }
  }
  return out;
}

async function main() {
  process.exitCode = 0;
  const args = parseArgs(process.argv.slice(2));
  if (process.exitCode) return;

  const slugs = listLocalFunctions();
  if (!slugs.length) {
    fail("No local edge functions under supabase/functions/");
    return;
  }
  info(`Local functions: ${slugs.join(", ")}`);
  info(
    `Comparison mode: deployed SOURCE BODY text (multipart) vs repo — not ezbr_sha256`
  );

  const token = process.env.SUPABASE_ACCESS_TOKEN || "";
  if (!args.offlineDeployed && !token) {
    fail(
      "SUPABASE_ACCESS_TOKEN is not set. Add it as a repo Actions secret (CI-dedicated PAT)."
    );
    return;
  }

  for (const slug of slugs) {
    const local = localFilesForSlug(slug);
    if (!local.size) {
      fail(`[${slug}] no local source files`);
      continue;
    }

    let deployed;
    try {
      deployed = args.offlineDeployed
        ? loadOfflineDeployed(args.offlineDeployed, slug)
        : await fetchDeployedFunction(args.projectRef, slug, token);
    } catch (err) {
      fail(`[${slug}] fetch failed: ${err instanceof Error ? err.message : err}`);
      continue;
    }

    if (deployed.meta) {
      const expected = Object.prototype.hasOwnProperty.call(
        EXPECTED_VERIFY_JWT,
        slug
      )
        ? EXPECTED_VERIFY_JWT[slug]
        : true;
      const actual = deployed.meta.verify_jwt;
      info(
        `[${slug}] version=${deployed.meta.version} verify_jwt=${actual} ` +
          `ezbr_sha256=${deployed.meta.ezbr_sha256 ?? "(none)"} (bundle hash; not used for parity)`
      );
      if (actual !== expected) {
        fail(
          `[${slug}] verify_jwt is ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}. ` +
            `Refusing to treat this as healthy — custom bearer auth depends on verify_jwt=false.`
        );
      }
    } else {
      info(`[${slug}] offline mode — skipping live verify_jwt assertion`);
    }

    compareSlug(slug, local, deployed.files);
  }

  if (process.exitCode) {
    console.error("\nEdge function parity FAILED.");
  } else {
    info("\nEdge function parity PASSED.");
  }
}

main().catch((err) => {
  fail(err instanceof Error ? err.stack || err.message : String(err));
});
