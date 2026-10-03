import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LEARN_HUB_LINKS, LEARN_PATH } from "./learn-copy";

const WEB_ROOT = join(__dirname, "..");

describe("/learn hub", () => {
  it("lists glossary, blog, and methodology destinations", () => {
    expect(LEARN_HUB_LINKS.map((l) => l.href)).toEqual(["/glossary", "/blog", "/methodology"]);
  });

  it("renders hub links from LEARN_HUB_LINKS", () => {
    const page = readFileSync(join(WEB_ROOT, "app/learn/page.tsx"), "utf8");
    expect(page).toContain("LEARN_HUB_LINKS");
    expect(page).toContain("LEARN_PATH");
    expect(page).toContain("alternates: { canonical: LEARN_PATH }");
  });

  it("settings exposes learn hub and glossary links", () => {
    const settings = readFileSync(join(WEB_ROOT, "app/app/settings/page.tsx"), "utf8");
    expect(settings).toContain("SETTINGS_LEARN_SECTION_TITLE");
    expect(settings).toContain("LEARN_PATH");
    expect(settings).toContain('href="/glossary"');
  });
});
