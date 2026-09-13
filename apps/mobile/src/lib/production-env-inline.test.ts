import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { transformFileSync } from "@babel/core";
import { describe, expect, it } from "vitest";

// @types/babel__core's TransformCaller only declares the four keys the
// upstream Babel types ship with; babel-preset-expo reads several more off
// the same object (isDev, isServer, isNodeModule, platform). Augmenting here
// is the pattern the upstream type comment itself recommends.
declare module "@babel/core" {
  interface TransformCaller {
    isDev?: boolean;
    isServer?: boolean;
    isNodeModule?: boolean;
    platform?: string;
  }
}

/**
 * `supabase.ts` and `vela.tsx` both read `EXPO_PUBLIC_SUPABASE_URL` /
 * `EXPO_PUBLIC_SUPABASE_ANON_KEY`. This file pins the read shape and, more
 * importantly, runs each one through the real `babel-preset-expo` transform
 * with the exact caller shape Metro passes in a production build
 * (`isDev: false`), the same measurement that caught the original bug: an
 * aliased `globalThis.process?.env` read is invisible to the inliner and
 * evaluates to `undefined` in a release bundle even when the variable is set
 * in EAS. Do not "tidy" the reads in these files back into that alias shape.
 */

const SUPABASE_PATH = resolve(__dirname, "./supabase.ts");
const VELA_PATH = resolve(__dirname, "../../app/(app)/vela.tsx");

function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
}

function transformForProductionMetro(filename: string): string {
  const result = transformFileSync(filename, {
    presets: ["babel-preset-expo"],
    filename,
    caller: {
      name: "metro",
      isDev: false,
      isServer: false,
      isNodeModule: false,
      platform: "ios"
    },
    babelrc: false,
    configFile: false
  });
  if (!result?.code) {
    throw new Error(`Babel produced no output for ${filename}`);
  }
  return result.code;
}

describe("supabase.ts and vela.tsx read env vars in the one shape Metro can inline for production", () => {
  const supabaseSrc = stripComments(readFileSync(SUPABASE_PATH, "utf8"));
  const velaSrc = stripComments(readFileSync(VELA_PATH, "utf8"));

  it("supabase.ts reads both variables as literal process.env member accesses", () => {
    expect(supabaseSrc).toContain("process.env.EXPO_PUBLIC_SUPABASE_URL");
    expect(supabaseSrc).toContain("process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY");
  });

  it("vela.tsx reads the Supabase URL as a literal process.env member access", () => {
    expect(velaSrc).toContain("process.env.EXPO_PUBLIC_SUPABASE_URL");
  });

  it("neither file reads through a globalThis.process alias", () => {
    expect(supabaseSrc).not.toMatch(/\.process\?\.env/);
    expect(velaSrc).not.toMatch(/\.process\?\.env/);
  });
});

describe("real Metro production transform (dev=false, platform=ios) inlines the variables", () => {
  const originalUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  function withEnv(url: string | undefined, key: string | undefined, fn: () => void) {
    if (url === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    else process.env.EXPO_PUBLIC_SUPABASE_URL = url;
    if (key === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = key;
    try {
      fn();
    } finally {
      if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_URL;
      else process.env.EXPO_PUBLIC_SUPABASE_URL = originalUrl;
      if (originalKey === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      else process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = originalKey;
    }
  }

  it("supabase.ts: the set values are present as literals in the compiled bundle", () => {
    withEnv("https://proof-project.supabase.co", "proof-anon-key-abc123", () => {
      const code = transformForProductionMetro(SUPABASE_PATH);
      expect(code).toContain("https://proof-project.supabase.co");
      expect(code).toContain("proof-anon-key-abc123");
      // The read itself must not survive as a live member access: if the
      // inliner missed it, the property access remains in the output and
      // reads undefined at runtime because Metro's runtime process.env is a
      // development-only injection.
      expect(code).not.toMatch(/process\.env\.EXPO_PUBLIC_SUPABASE_URL(?!["'])/);
      expect(code).not.toMatch(/process\.env\.EXPO_PUBLIC_SUPABASE_ANON_KEY(?!["'])/);
    });
  });

  it("vela.tsx: the set Supabase URL is present as a literal in the compiled bundle", () => {
    withEnv("https://proof-project.supabase.co", undefined, () => {
      const code = transformForProductionMetro(VELA_PATH);
      expect(code).toContain("https://proof-project.supabase.co");
      expect(code).not.toMatch(/process\.env\.EXPO_PUBLIC_SUPABASE_URL(?!["'])/);
    });
  });

  it("supabase.ts: unset variables compile to undefined, never a stale or fabricated value", () => {
    withEnv(undefined, undefined, () => {
      const code = transformForProductionMetro(SUPABASE_PATH);
      expect(code).toContain("supabaseUrl=hasProcessEnv?undefined:undefined");
      expect(code).toContain("supabaseAnonKey=hasProcessEnv?undefined:undefined");
    });
  });
});
