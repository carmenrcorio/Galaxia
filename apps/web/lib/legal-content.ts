import fs from "node:fs";
import path from "node:path";

// The reviewed legal text lives outside apps/web (repo root `content/legal/`) so
// it is not tied to any one app; both web and (eventually) mobile can read the
// same source of truth. Read at build time only — these pages have no dynamic
// data, so Next statically renders them and this fs call never runs at request
// time in production.
const LEGAL_CONTENT_ROOT = path.join(process.cwd(), "..", "..", "content", "legal");

export function readLegalMarkdown(filename: "privacy-policy.md" | "terms-of-service.md"): string {
  return fs.readFileSync(path.join(LEGAL_CONTENT_ROOT, filename), "utf8");
}
