import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const ROUTE_PATH = "apps/web/app/api/family-pattern-card/route.tsx";
const VIEW_PATH = "apps/web/lib/family-pattern-card-view.tsx";
const GRID_PATH = "apps/web/components/groups/chart-grid-section.tsx";
const SHARE_PATH = "apps/web/components/groups/family-pattern-share.tsx";
const FONT_DIR = "apps/web/app/api/family-pattern-card/fonts";

function read(path: string): string {
  return readFileSync(join(REPO_ROOT, path), "utf8");
}

describe("family-pattern-card route — bundled fonts, no Google Fonts fetch", () => {
  const src = read(ROUTE_PATH);

  it("reads the five local TTF files inside a lazy loader", () => {
    const loaderIndex = src.indexOf("async function loadPatternCardFonts(");
    expect(loaderIndex).toBeGreaterThan(-1);
    const loaderBody = src.slice(loaderIndex);
    for (const file of [
      "CormorantGaramond-Regular.ttf",
      "CormorantGaramond-SemiBold.ttf",
      "CormorantGaramond-Italic.ttf",
      "DMSans-Regular.ttf",
      "DMSans-Medium.ttf",
    ]) {
      expect(loaderBody).toContain(file);
    }
  });

  it("never mentions fonts.googleapis.com or next/font/google", () => {
    expect(src).not.toContain("fonts.googleapis.com");
    expect(src).not.toContain("next/font/google");
    expect(read(VIEW_PATH)).not.toContain("fonts.googleapis.com");
  });

  it("never reads fonts at module scope", () => {
    expect(src).not.toMatch(/^const \[[^\]]*\] = await Promise\.all\(\[/m);
    expect(src).not.toMatch(/^await\s/m);
  });

  it("is a Node-runtime route so fs.readFile works", () => {
    expect(src).toMatch(/export const runtime\s*=\s*["']nodejs["']/);
    expect(src).not.toMatch(/export const runtime\s*=\s*["']edge["']/);
  });

  it("renders through parseFamilyPatternCardRequest and FamilyPatternCardImage, never recomputes a chart", () => {
    expect(src).toContain("parseFamilyPatternCardRequest");
    expect(src).toContain("FamilyPatternCardImage");
    expect(src).not.toContain("computeNatalChart");
    expect(src).not.toContain("detectFamilyPatterns");
    expect(src).not.toMatch(/birthDate|birth_date|birth_time|birth_place/);
  });

  it("returns ImageResponse at 1080x1080", () => {
    expect(src).toContain("new ImageResponse");
    expect(src).toContain("FAMILY_PATTERN_CARD_SIZE");
    expect(read("apps/web/lib/family-pattern-card.ts")).toContain("width: 1080");
    expect(read("apps/web/lib/family-pattern-card.ts")).toContain("height: 1080");
  });
});

describe("bundled font files exist", () => {
  it("ships NOTICE, OFL, and the five TTF files", () => {
    const notice = read(`${FONT_DIR}/NOTICE.md`);
    expect(notice).toContain("Cormorant Garamond");
    expect(notice).toContain("DM Sans");
    expect(notice).toContain("must not fetch Google Fonts");
    for (const file of [
      "CormorantGaramond-Regular.ttf",
      "CormorantGaramond-SemiBold.ttf",
      "CormorantGaramond-Italic.ttf",
      "DMSans-Regular.ttf",
      "DMSans-Medium.ttf",
      "OFL.txt",
      "NOTICE.md",
    ]) {
      const buf = readFileSync(join(REPO_ROOT, FONT_DIR, file));
      expect(buf.byteLength).toBeGreaterThan(32);
    }
  });
});

describe("chart grid wires the privacy confirm, not a grid screenshot", () => {
  const grid = read(GRID_PATH);
  const share = read(SHARE_PATH);

  it("uses FamilyPatternShare instead of capturing the comparison table", () => {
    expect(grid).toContain("FamilyPatternShare");
    expect(grid).not.toContain("ShareImageButton");
    expect(grid).not.toContain("group-chart-comparison.png");
  });

  it("requires an explicit ack before generating, and allows removing a person", () => {
    expect(share).toContain("FAMILY_PATTERN_CARD_ACK");
    expect(share).toContain("FAMILY_PATTERN_CARD_CONFIRM");
    expect(share).toContain("removePerson");
    expect(share).toContain("FAMILY_PATTERN_CARD_PRIVACY_BODY");
    expect(share).toContain("/api/family-pattern-card");
  });

  it("does not generate until confirm()", () => {
    expect(share).toContain("async function confirm(");
    expect(share).toMatch(/if \(!card \|\| !acked \|\| busy\) return/);
  });
});
