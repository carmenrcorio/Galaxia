import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const WEB_ROOT = join(__dirname, "..", "..");

function readSrc(path: string): string {
  return readFileSync(join(WEB_ROOT, path), "utf8");
}

describe("error monitoring wiring", () => {
  it("registers Sentry from instrumentation.ts only after a DSN check", () => {
    const src = readSrc("instrumentation.ts");
    expect(src).toContain("SENTRY_DSN");
    expect(src).toContain("NEXT_PUBLIC_SENTRY_DSN");
    expect(src).toContain("export const onRequestError");
    expect(src).toContain("captureRequestError");
  });

  it("initialises the client SDK from instrumentation-client.ts", () => {
    const src = readSrc("instrumentation-client.ts");
    expect(src).toContain("initMonitoring");
  });

  it("does not wrap next.config.mjs (ENGINEERING.md §2)", () => {
    const src = readSrc("next.config.mjs");
    expect(src).not.toMatch(/withSentryConfig|sentry/);
  });
});
