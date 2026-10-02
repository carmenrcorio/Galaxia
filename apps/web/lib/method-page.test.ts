import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { METHOD_DESCRIPTION, METHOD_PATH, METHOD_SECTIONS, METHOD_TITLE } from "./method-copy";

describe("/method", () => {
  it("states the stance once, keeps birth chart as the primary term, and follows the Placidus default", () => {
    expect(METHOD_PATH).toBe("/method");
    expect([...METHOD_TITLE].length).toBeGreaterThanOrEqual(50);
    expect([...METHOD_TITLE].length).toBeLessThanOrEqual(60);
    expect([...METHOD_DESCRIPTION].length).toBeGreaterThanOrEqual(140);
    expect([...METHOD_DESCRIPTION].length).toBeLessThanOrEqual(158);
    const copy = METHOD_SECTIONS.flatMap((section) => [section.heading, ...section.paragraphs]).join(" ");
    expect(copy).toMatch(/does not predict/);
    expect(copy).toMatch(/written in advance and stored/);
    expect(copy).toMatch(/reviewed and approved by the founder/);
    expect(copy).toMatch(/Written readings and Vela/);
    expect(copy).toMatch(/Birth chart is the term we use/);
    expect(copy).toMatch(/default house system is Placidus/);
    expect(copy).toMatch(/Whole Sign/);
    expect(copy).not.toContain("\u2014");
    expect(METHOD_TITLE).not.toContain("\u2014");
    expect(METHOD_DESCRIPTION).not.toContain("\u2014");
  });

  it("is a static route linked from the sitemap", () => {
    const page = readFileSync(join(__dirname, "../app/method/page.tsx"), "utf8");
    const sitemap = readFileSync(join(__dirname, "../app/sitemap.ts"), "utf8");
    expect(page).toContain("METHOD_PATH");
    expect(page).toContain('href="/methodology"');
    expect(readFileSync(join(__dirname, "../lib/method-copy.ts"), "utf8")).toMatch(/Anthropic/);
    expect(sitemap).toContain('"/method"');
    expect(page).not.toContain("\u2014");
  });
});
