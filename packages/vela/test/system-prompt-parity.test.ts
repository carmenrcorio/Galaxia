import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function resolveVelaSystemPrompt(src: string): string {
  const aspect = src.match(/(?:export )?const VELA_ASPECT_LIST_GUARDRAIL =\s*"([^"]+)"/)?.[1];
  const remembrance = src.match(
    /(?:export )?const VELA_REMEMBRANCE_GUARDRAIL =\s*"([^"]+)"/
  )?.[1];
  const prompt = src.match(/VELA_SYSTEM_PROMPT\s*=\s*`([\s\S]*?)`;/)?.[1];
  if (!aspect || !remembrance || prompt === undefined) {
    throw new Error("Could not resolve VELA_SYSTEM_PROMPT from source");
  }
  return prompt
    .replace(/\$\{VELA_ASPECT_LIST_GUARDRAIL\}/g, aspect)
    .replace(/\$\{VELA_REMEMBRANCE_GUARDRAIL\}/g, remembrance);
}

describe("VELA_SYSTEM_PROMPT parity (workspace ↔ edge)", () => {
  it("resolves to identical text in packages/vela and vela-chat", () => {
    const pkg = readFileSync(resolve(__dirname, "../src/index.ts"), "utf8");
    const edge = readFileSync(
      resolve(__dirname, "../../../supabase/functions/vela-chat/index.ts"),
      "utf8"
    );
    expect(resolveVelaSystemPrompt(pkg)).toBe(resolveVelaSystemPrompt(edge));
  });
});
