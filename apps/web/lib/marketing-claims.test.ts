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
    expect(src).toContain("Monthly");
    expect(src).toContain("$9.99");
    expect(src).not.toMatch(/Yearly/);
    expect(src).not.toMatch(/Best value/);
    expect(src).not.toMatch(/save 26%/);
  });

  it("/download mounts WaitlistForm instead of pointing elsewhere", () => {
    const src = read("apps/web/app/download/page.tsx");
    expect(src).toContain("WaitlistForm");
    expect(src).not.toMatch(/signup and landing forms/);
  });
});
