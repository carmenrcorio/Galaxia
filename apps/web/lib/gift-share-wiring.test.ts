import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SHARE_ADD_CTA,
  SHARE_COMPARE_CTA,
  SHARE_GALAXIA_FRAME,
  SHARE_GIFT_DISCLOSURE,
  SHARE_NEED_SUBJECT,
  giftComparePath,
  sharePath,
} from "./quick-share";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const EM = "\u2014";

function read(path: string): string {
  return readFileSync(join(REPO_ROOT, path), "utf8");
}

describe("gift share reuses /s/[token] rather than a fourth token pattern", () => {
  it("keeps /s/[token] as the share snapshot and /r/[slug] as the native bridge", () => {
    expect(existsSync(join(REPO_ROOT, "apps/web/app/s/[token]/page.tsx"))).toBe(true);
    expect(existsSync(join(REPO_ROOT, "apps/web/app/r/[slug]/page.tsx"))).toBe(true);
    expect(existsSync(join(REPO_ROOT, "apps/web/app/invite/[token]/page.tsx"))).toBe(true);
    expect(existsSync(join(REPO_ROOT, "apps/web/app/connect/[token]/page.tsx"))).toBe(true);
    const page = read("apps/web/app/s/[token]/page.tsx");
    expect(page).toContain("token={token}");
    expect(page).toContain("robots: { index: false, follow: false }");
  });

  it("does not add a /gift or /share route", () => {
    expect(existsSync(join(REPO_ROOT, "apps/web/app/gift"))).toBe(false);
    expect(existsSync(join(REPO_ROOT, "apps/web/app/share"))).toBe(false);
  });

  it("Copy share link on /chart posts giftBirth and copies a /s token URL", () => {
    const src = read("apps/web/app/chart/quick-chart-page.tsx");
    expect(src).toContain("giftBirth: input");
    expect(src).toContain("expiresInDays");
    expect(src).toContain('variant="gift"');
    expect(src).toContain("/s/${body.token as string}");
    const persist = src.slice(src.indexOf("async function createShareUrl"), src.indexOf("const title"));
    expect(persist).not.toContain("name:");
  });

  it("shared view is readable with no account and offers the two return path actions", () => {
    const src = read("apps/web/components/share-snapshot-view.tsx");
    expect(src).toContain("singleChartNeed");
    expect(src).toContain("SHARE_GALAXIA_FRAME");
    expect(src).toContain("SHARE_ADD_CTA");
    expect(src).toContain("SHARE_COMPARE_CTA");
    expect(src).toContain("giftComparePath(token)");
    expect(src).toContain("signupWithNextHref(sharePath(token))");
    expect(src).not.toContain("Upgrade");
    expect(src).not.toContain("paywall");
  });

  it("gift compare reuses /chart/compare?gift= so birth data stays off that URL", () => {
    const src = read("apps/web/app/chart/compare/page.tsx");
    expect(src).toContain('params.get("gift")');
    expect(src).toContain("/api/quick-share/");
    expect(src).toContain("SHARE_GIFT_COMPARE_B_LOCKED");
    expect(src).toContain("`/chart/compare?gift=${encodeURIComponent(giftToken)}`");
    expect(giftComparePath("tok")).toBe("/chart/compare?gift=tok");
    expect(sharePath("tok")).toBe("/s/tok");
  });

  it("share control discloses what the recipient will see", () => {
    const src = read("apps/web/components/share-link-button.tsx");
    expect(src).toContain("SHARE_GIFT_DISCLOSURE");
    expect(src).toContain("SHARE_COMPARE_DISCLOSURE");
    expect(src).toContain("SHARE_EXPIRY_OPTIONS");
    expect(src).toContain("SHARE_ANON_EXPIRY_NOTE");
  });

  it("settings can revoke live share links through DELETE /api/quick-share/[token]", () => {
    const pending = read("apps/web/components/pending-share-links.tsx");
    expect(pending).toContain("method: \"DELETE\"");
    expect(pending).toContain("/api/quick-share/");
    const route = read("apps/web/app/api/quick-share/[token]/route.ts");
    expect(route).toContain("export async function DELETE");
    expect(route).toContain("revokeQuickShare");
  });

  it("PDF footnote carries the galaxiamea.com URL", () => {
    const src = read("apps/web/components/chart-pdf-export.tsx");
    expect(src).toContain("galaxiamea.com");
  });

  it("authored gift copy has no em dash", () => {
    const files = [
      "apps/web/lib/quick-share.ts",
      "apps/web/components/share-link-button.tsx",
      "apps/web/components/share-snapshot-view.tsx",
      "apps/web/components/pending-share-links.tsx",
    ];
    expect(SHARE_GIFT_DISCLOSURE).toContain("natal chart");
    expect(SHARE_ADD_CTA).toContain("constellation");
    expect(SHARE_COMPARE_CTA).toContain("compare");
    expect(SHARE_GALAXIA_FRAME).toContain("Galaxia");
    expect(SHARE_NEED_SUBJECT).toBe("This person");
    for (const rel of files) {
      const src = read(rel);
      const withoutComments = src
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/^\s*\/\/.*$/gm, " ")
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");
      expect(withoutComments, rel).not.toContain(EM);
    }
  });
});
