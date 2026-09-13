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
