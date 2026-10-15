import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SERVER_SRC = readFileSync(join(__dirname, "server.ts"), "utf8");

describe("createSupabaseServerClient cookie wiring", () => {
  it("swallows cookie writes in read-only Server Component renders", () => {
    expect(SERVER_SRC).toMatch(/setAll\(cookiesToSet\)/);
    const setAllBlock = SERVER_SRC.slice(SERVER_SRC.indexOf("setAll(cookiesToSet)"));
    expect(setAllBlock).toMatch(/try\s*\{[\s\S]*cookieStore\.set/);
    expect(setAllBlock).toMatch(/catch\s*\{[\s\S]*middleware/);
  });
});
