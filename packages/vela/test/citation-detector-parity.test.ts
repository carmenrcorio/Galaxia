import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Edge cannot import the workspace, so it mirrors the citation detector by hand.
 * Fails CI if planets, aspects, connectors, or the regex template diverge.
 */

function readBoth(): { pkg: string; edge: string } {
  return {
    pkg: readFileSync(resolve(__dirname, "../src/index.ts"), "utf8"),
    edge: readFileSync(
      resolve(__dirname, "../../../supabase/functions/vela-chat/index.ts"),
      "utf8"
    )
  };
}

function extractQuotedArray(src: string, name: string): string[] {
  const match = src.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\] as const;`));
  if (!match) {
    throw new Error(`Could not find ${name}`);
  }
  const literals = [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  if (literals.length === 0) {
    throw new Error(`${name} array was empty`);
  }
  return literals;
}

function extractCitationRegexTemplate(src: string): string {
  const match = src.match(/const VELA_CITATION_RE = new RegExp\(\s*`([\s\S]*?)`\s*,\s*"gi"\s*\)/);
  if (!match) {
    throw new Error("Could not find VELA_CITATION_RE template");
  }
  return match[1];
}

describe("countVelaAspectCitations parity (workspace ↔ edge)", () => {
  it("keeps planet, aspect, connector lists and the regex template identical", () => {
    const { pkg, edge } = readBoth();
    expect(extractQuotedArray(pkg, "VELA_CITATION_PLANETS")).toEqual(
      extractQuotedArray(edge, "VELA_CITATION_PLANETS")
    );
    expect(extractQuotedArray(pkg, "VELA_CITATION_ASPECTS")).toEqual(
      extractQuotedArray(edge, "VELA_CITATION_ASPECTS")
    );
    expect(extractQuotedArray(pkg, "VELA_CITATION_CONNECTORS")).toEqual(
      extractQuotedArray(edge, "VELA_CITATION_CONNECTORS")
    );
    expect(extractCitationRegexTemplate(pkg)).toBe(extractCitationRegexTemplate(edge));
  });
});
