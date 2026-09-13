import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { missingSiteUrlMessage, requireSiteUrl, siteUrl, siteUrlFor, SITE_URL_VAR } from "./env";

const ORIGINAL = process.env[SITE_URL_VAR];

function setSiteUrl(value: string | undefined) {
  if (value === undefined) {
    delete process.env[SITE_URL_VAR];
  } else {
    process.env[SITE_URL_VAR] = value;
  }
}

afterEach(() => {
  setSiteUrl(ORIGINAL);
});

describe("siteUrl reads EXPO_PUBLIC_SITE_URL and never invents a default", () => {
  it("returns null when the variable is unset", () => {
    setSiteUrl(undefined);
    expect(siteUrl()).toBeNull();
  });

  it("returns null when the variable is blank or whitespace", () => {
    setSiteUrl("");
    expect(siteUrl()).toBeNull();
    setSiteUrl("   ");
    expect(siteUrl()).toBeNull();
  });

  it("returns the configured origin", () => {
    setSiteUrl("https://galaxiamea.com");
    expect(siteUrl()).toBe("https://galaxiamea.com");
  });

  it("trims surrounding whitespace and trailing slashes so joins cannot double up", () => {
    setSiteUrl("  https://galaxiamea.com///  ");
    expect(siteUrl()).toBe("https://galaxiamea.com");
  });

  it("reads the value at call time, not once at module load", () => {
    setSiteUrl("https://galaxiamea.com");
    expect(siteUrl()).toBe("https://galaxiamea.com");
    setSiteUrl("https://galaxia-three.vercel.app");
    expect(siteUrl()).toBe("https://galaxia-three.vercel.app");
  });
});

describe("requireSiteUrl fails loudly, naming the exact variable", () => {
  it("throws when unset", () => {
    setSiteUrl(undefined);
    expect(() => requireSiteUrl()).toThrow(/EXPO_PUBLIC_SITE_URL/);
  });

  it("throws when blank", () => {
    setSiteUrl("  ");
    expect(() => requireSiteUrl()).toThrow(/EXPO_PUBLIC_SITE_URL/);
  });

  it("names the variable and says what to set it to, per ENGINEERING.md section 6", () => {
    const message = missingSiteUrlMessage();
    expect(message).toContain("EXPO_PUBLIC_SITE_URL");
    expect(message).toContain("https://galaxiamea.com");
    expect(message).toMatch(/^Missing /);
    // No em dash (U+2014) in an authored string, per ENGINEERING.md section 15.
    expect(message).not.toContain("\u2014");
  });

  it("returns the origin when set", () => {
    setSiteUrl("https://galaxiamea.com");
    expect(requireSiteUrl()).toBe("https://galaxiamea.com");
  });
});

describe("siteUrlFor builds an absolute web URL or refuses", () => {
  it("joins a path onto the origin with exactly one slash", () => {
    setSiteUrl("https://galaxiamea.com");
    expect(siteUrlFor("connect/abc123")).toBe("https://galaxiamea.com/connect/abc123");
    expect(siteUrlFor("/connect/abc123")).toBe("https://galaxiamea.com/connect/abc123");
    expect(siteUrlFor("subscribe")).toBe("https://galaxiamea.com/subscribe");
  });

  it("does not double the slash when the configured origin has a trailing one", () => {
    setSiteUrl("https://galaxiamea.com/");
    expect(siteUrlFor("/subscribe")).toBe("https://galaxiamea.com/subscribe");
  });

  it("returns the bare origin for an empty path", () => {
    setSiteUrl("https://galaxiamea.com");
    expect(siteUrlFor("")).toBe("https://galaxiamea.com");
  });

  it("throws rather than returning a relative or half-formed link when unset", () => {
    setSiteUrl(undefined);
    expect(() => siteUrlFor("connect/abc123")).toThrow(/EXPO_PUBLIC_SITE_URL/);
    // The failure must not be a silently usable value.
    let produced: string | null = null;
    try {
      produced = siteUrlFor("connect/abc123");
    } catch {
      produced = null;
    }
    expect(produced).toBeNull();
  });
});

describe("the read stays in the one shape Metro can inline for production", () => {
  // Comments are stripped first: the module's own doc comment names the broken
  // shapes in order to warn against them, and that prose is not code.
  const code = readFileSync(resolve(__dirname, "./env.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");

  // babel-preset-expo's expo-inline-production-environment-variables plugin
  // rewrites ONLY a member expression whose object matches the pattern
  // `process.env` with a literal EXPO_PUBLIC_-prefixed key, and
  // @expo/metro-config injects a runtime `process.env` object in development
  // only. Reading through an alias or a computed key therefore compiles to a
  // property access on an object that does not exist in a release bundle,
  // yielding `undefined` even when the variable IS set in EAS. That would make
  // the app refuse to build a link in exactly the builds that ship, so the
  // access shape is an invariant, not a style preference. Do not "tidy" this
  // into the aliased shape used by supabase.ts and vela.tsx.
  it("reads the variable as a literal process.env member access", () => {
    expect(code).toContain("process.env.EXPO_PUBLIC_SITE_URL");
  });

  it("never reads it through an alias of process.env", () => {
    expect(code).not.toMatch(/\.process\?\.env/);
    expect(code).not.toMatch(/=\s*process\.env\s*[;,)]/);
  });

  it("never reads it through a computed key, including SITE_URL_VAR", () => {
    expect(code).not.toMatch(/\[\s*SITE_URL_VAR\s*\]/);
    expect(code).not.toMatch(/env\[[^\]]+\]/);
  });

  it("keeps SITE_URL_VAR as the name used in the message, matching the read", () => {
    expect(SITE_URL_VAR).toBe("EXPO_PUBLIC_SITE_URL");
    expect(missingSiteUrlMessage()).toContain(SITE_URL_VAR);
  });
});

describe("wiring: the paywall builds its web link through siteUrlFor", () => {
  const src = readFileSync(resolve(__dirname, "../../app/subscribe.tsx"), "utf8");

  it("imports siteUrlFor from the shared env module", () => {
    expect(src).toContain('from "../src/lib/env"');
    expect(src).toContain("siteUrlFor");
  });

  it("has no hardcoded origin standing in for the variable", () => {
    expect(src).not.toContain("galaxiamea.com");
    expect(src).not.toContain("vercel.app");
    expect(src).not.toMatch(/https?:\/\//);
  });

  it("opens the resolved URL rather than a custom scheme or a dead button", () => {
    expect(src).toContain("Linking.openURL");
    expect(src).not.toContain("galaxia://");
  });

  it("logs the missing-variable error instead of swallowing it", () => {
    expect(src).toContain("console.error");
    expect(src).toContain("[paywall]");
  });

  it("renders no link at all when the URL cannot be built", () => {
    expect(src).toMatch(/"url" in webLink \?/);
  });
});
