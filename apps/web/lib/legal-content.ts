import fs from "node:fs";
import path from "node:path";
import { GALAXIA_HELP_EMAIL } from "@galaxia/core";

// The reviewed legal text lives outside apps/web (repo root `content/legal/`) so
// it is not tied to any one app; both web and (eventually) mobile can read the
// same source of truth. Read at build time only — these pages have no dynamic
// data, so Next statically renders them and this fs call never runs at request
// time in production.
const LEGAL_CONTENT_ROOT = path.join(process.cwd(), "..", "..", "content", "legal");

// content/legal/*.md carries internal editorial markers as HTML comments
// (e.g. `<!-- FOUNDER-REVIEW: ... -->`, per ENGINEERING.md §15's convention).
// LegalDocument's react-markdown has no rehype-raw plugin wired in, so
// without stripping, an HTML comment renders as literal escaped text on the
// live page instead of being dropped. Strip comments here, at the read
// boundary, so the source markdown keeps the markers for grep/review while
// nothing reaches the renderer.
const HTML_COMMENT = /<!--[\s\S]*?-->/g;
const HELP_EMAIL_TOKEN = "{{GALAXIA_HELP_EMAIL}}";

export function readLegalMarkdown(filename: "privacy-policy.md" | "terms-of-service.md"): string {
  const raw = fs.readFileSync(path.join(LEGAL_CONTENT_ROOT, filename), "utf8");
  return raw.replace(HTML_COMMENT, "").replaceAll(HELP_EMAIL_TOKEN, GALAXIA_HELP_EMAIL);
}
