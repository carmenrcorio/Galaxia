import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const HOME = readFileSync(join(__dirname, "../app/app/page.tsx"), "utf8");

describe("constellation home block order", () => {
  it("puts the compact This Week card after the greeting and before the constellation canvas", () => {
    const greeting = HOME.indexOf("Welcome back");
    const thisWeek = HOME.indexOf('<RelationalTransitFeed ownerId={ownerId} variant="compact" />');
    const canvas = HOME.indexOf("Your constellation");
    const today = HOME.indexOf('id="today-in-your-sky"');
    expect(greeting).toBeGreaterThan(0);
    expect(thisWeek).toBeGreaterThan(greeting);
    expect(canvas).toBeGreaterThan(thisWeek);
    expect(today).toBeGreaterThan(canvas);
  });

  it("does not mount a second This Week feed below Today", () => {
    const mounts = HOME.match(/<RelationalTransitFeed\b/g) ?? [];
    expect(mounts).toEqual(['<RelationalTransitFeed']);
  });
});
