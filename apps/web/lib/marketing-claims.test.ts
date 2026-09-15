import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");

function read(path: string): string {
  return readFileSync(join(REPO_ROOT, path), "utf8");
}

describe("marketing claims match what ships", () => {
  it("/r/[slug] has no App Store or Google Play buttons", () => {
    const src = read("apps/web/app/r/[slug]/page.tsx");
    expect(src).not.toMatch(/App Store/);
    expect(src).not.toMatch(/Google Play/);
    expect(src).not.toMatch(/NEXT_PUBLIC_IOS_APP_STORE_URL/);
    expect(src).not.toMatch(/NEXT_PUBLIC_ANDROID_PLAY_URL/);
  });

  it("/pricing sells monthly only", () => {
    const src = read("apps/web/components/marketing/pricing-section.tsx");
    const page = read("apps/web/app/pricing/page.tsx");
    const visible = src
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/^\s*\/\/.*$/gm, " ")
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");
    expect(src).toContain("Monthly");
    expect(src).toContain("$9.99");
    expect(src).toContain("per month");
    expect(src).toContain("Vela is included. Never charged per message.");
    expect(src).toContain("Without an account, anyone can run a real chart.");
    expect(src).not.toContain("\u2014");
    expect(src).not.toContain("\u2013");
    const description = page.match(/const DESCRIPTION =\s*"([^"]+)"/)?.[1] ?? "";
    expect(page).toContain("$9.99 per month");
    expect(page).toContain("never charged per message");
    expect(page).toContain("anyone can run a real chart");
    expect(description).toContain("$9.99 per month");
    expect(description).not.toContain("\u2014");
    expect(description).not.toContain("\u2013");
    expect(visible).not.toMatch(/pcard-name">Yearly/);
    expect(visible).not.toMatch(/Best value/);
    expect(visible).not.toMatch(/save 26%/);
    expect(visible).not.toMatch(/\$89/);
    expect(visible).not.toMatch(/\$7\.42/);
    expect(visible).not.toMatch(/countdown/i);
    expect(visible).not.toMatch(/founding member/i);
    expect(visible).not.toMatch(/Yearly/);
    expect(visible).not.toMatch(/annual/i);
  });

  it("/download mounts WaitlistForm instead of pointing elsewhere", () => {
    const src = read("apps/web/app/download/page.tsx");
    expect(src).toContain("WaitlistForm");
    expect(src).not.toMatch(/signup and landing forms/);
  });
});
