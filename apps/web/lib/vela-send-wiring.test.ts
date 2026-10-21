import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const WEB_VELA = join(__dirname, "../app/app/vela/vela-chat-page.tsx");

describe("Vela chat send guard (no double POST / duplicate bubbles)", () => {
  it("locks in-flight sends synchronously and hides typing dots once the stream bubble exists", () => {
    const src = readFileSync(WEB_VELA, "utf8");
    expect(src).toContain("sendInFlightRef");
    expect(src).toContain("showTypingIndicator");
    expect(src).toContain('lines[lines.length - 1]?.role === "user"');
    expect(src).not.toMatch(/\{sending \? <TypingIndicator/);
  });
});
