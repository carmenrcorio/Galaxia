import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Source-level guards for app/s/[token]/opengraph-image.tsx and
 * app/s/[token]/page.tsx's generateMetadata. Same reasoning as
 * comp-route-wiring.test.ts: importing the route directly pulls in
 * lib/quick-share-server.ts -> lib/env.server.ts -> the `server-only`
 * package, which throws unconditionally outside a Next.js server bundle —
 * plain vitest/Node has no such alias. This reads the actual source
 * instead. The safety-critical logic itself (confident-only signs,
 * chart.asc-only rising, no scores, no romantic summary) is unit-tested
 * directly in og-card.test.ts; this file only proves the route wires that
 * logic in, and never re-derives or bypasses it inline.
 */

const REPO_ROOT = join(__dirname, "..", "..", "..");
const IMAGE_ROUTE_PATH = "apps/web/app/s/[token]/opengraph-image.tsx";
const PAGE_ROUTE_PATH = "apps/web/app/s/[token]/page.tsx";
const LAYOUT_PATH = "apps/web/app/layout.tsx";

function readRoute(path: string): string {
  return readFileSync(join(REPO_ROOT, path), "utf8");
}

describe("opengraph-image route — never touches scores/whatTheyNeed/compareHeadline directly", () => {
  const src = readRoute(IMAGE_ROUTE_PATH);
  // Code only, past the leading file-level doc comment (which describes the
  // guarantee in prose and legitimately says the words "scores"/"synastry").
  const code = src.slice(src.indexOf("*/") + 2);

  it("never accesses .scores or .synastry as a property", () => {
    expect(code).not.toMatch(/\.scores\b/);
    expect(code).not.toMatch(/\.synastry\b/);
  });

  it("never calls whatTheyNeed or compareHeadline (compareHeadline's fallback reads a score-derived overall)", () => {
    expect(code).not.toMatch(/whatTheyNeed\(/);
    expect(code).not.toMatch(/compareHeadline\(/);
  });

  it("imports RELATION_HEADLINE directly from @galaxia/astro and passes it into buildOgCompareCard", () => {
    expect(src).toMatch(/import\s*\{\s*RELATION_HEADLINE[,\s]/);
    expect(src).toMatch(/buildOgCompareCard\([^)]*RELATION_HEADLINE\)/);
  });

  it("imports its card data from lib/og-card instead of re-deriving placements/signs inline", () => {
    expect(src).toContain('from "../../../lib/og-card"');
    expect(src).toContain("buildOgSingleCard");
    expect(src).toContain("buildOgCompareCard");
    // The route file itself never touches raw chart placements.
    expect(src).not.toMatch(/\.placements\b/);
  });
});

describe("opengraph-image route — fonts read once at module scope, never inside the handler", () => {
  const src = readRoute(IMAGE_ROUTE_PATH);

  it("reads all 5 font files via a single top-level readFile/Promise.all block", () => {
    expect(src).toMatch(/^const \[[^\]]*\] = await Promise\.all\(\[/m);
    for (const file of [
      "Fraunces-Regular.ttf",
      "Fraunces-SemiBold.ttf",
      "Inter-Regular.ttf",
      "Inter-SemiBold.ttf",
      "ZodiacGlyphs-Regular.ttf",
    ]) {
      expect(src).toContain(file);
    }
  });

  it("the module-scope font read happens before the default export (never re-read per request)", () => {
    const fontReadIndex = src.indexOf("await Promise.all([");
    const handlerIndex = src.indexOf("export default async function Image(");
    expect(fontReadIndex).toBeGreaterThan(-1);
    expect(handlerIndex).toBeGreaterThan(-1);
    expect(fontReadIndex).toBeLessThan(handlerIndex);
  });

  it("is a Node-runtime route (no `export const runtime = \"edge\"`) — fs.readFile needs Node", () => {
    expect(src).not.toMatch(/export const runtime\s*=\s*["']edge["']/);
  });
});

describe("opengraph-image route — one branching route, 1200x630 PNG, fallback card on a missing snapshot", () => {
  const src = readRoute(IMAGE_ROUTE_PATH);

  it("exports the documented size and contentType", () => {
    expect(src).toContain("export const size = { width: 1200, height: 630 };");
    expect(src).toContain('export const contentType = "image/png";');
  });

  it("calls getQuickShareByToken exactly once and branches on snapshot.kind", () => {
    const calls = src.match(/getQuickShareByToken\(/g) ?? [];
    expect(calls).toHaveLength(1);
    expect(src).toMatch(/snapshot\.kind === "single"/);
  });

  it("returns a fallback card (not a broken image) when the snapshot is missing", () => {
    const notFoundIdx = src.indexOf("if (!snapshot)");
    const fallbackIdx = src.indexOf("<FallbackCard />");
    expect(notFoundIdx).toBeGreaterThan(-1);
    expect(fallbackIdx).toBeGreaterThan(notFoundIdx);
    expect(fallbackIdx).toBeLessThan(src.indexOf("if (snapshot.kind"));
  });
});

describe('/s/[token]/page.tsx generateMetadata — openGraph + twitter summary_large_image, robots unchanged', () => {
  const src = readRoute(PAGE_ROUTE_PATH);

  it("exports an async generateMetadata that reads params and calls getQuickShareByToken", () => {
    expect(src).toMatch(/export async function generateMetadata\(/);
    expect(src).toContain("await getQuickShareByToken(token)");
  });

  it("points openGraph.images and twitter.images at the sibling opengraph-image route for this token", () => {
    expect(src).toMatch(/openGraph:\s*\{[\s\S]{0,200}images:\s*\[imagePath\]/);
    expect(src).toMatch(/twitter:\s*\{[\s\S]{0,200}card:\s*"summary_large_image"/);
    expect(src).toContain("`/s/${token}/opengraph-image`");
  });

  it("keeps robots noindex/nofollow on the generated metadata", () => {
    expect(src).toMatch(/robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);
  });

  it("no longer exports a static `metadata` object (generateMetadata replaces it)", () => {
    expect(src).not.toMatch(/^export const metadata:/m);
  });
});

describe("app/layout.tsx — metadataBase set from publicEnv.siteUrl with the existing prod fallback", () => {
  const src = readRoute(LAYOUT_PATH);

  it("sets metadataBase to a URL built from publicEnv.siteUrl, falling back to the existing prod URL", () => {
    expect(src).toMatch(/metadataBase:\s*new URL\(publicEnv\.siteUrl \|\| "https:\/\/galaxia-three\.vercel\.app"\)/);
  });
});
