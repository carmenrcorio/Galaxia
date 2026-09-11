import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SOFTWARE_APPLICATION_JSON_LD } from "./homepage-software-application-json-ld";

const REPO_ROOT = join(__dirname, "..", "..", "..");

describe("homepage SoftwareApplication JSON-LD", () => {
  it("declares operatingSystem Web only", () => {
    expect(SOFTWARE_APPLICATION_JSON_LD.operatingSystem).toBe("Web");
  });

  it("does not advertise a free product at price 0", () => {
    const offers = SOFTWARE_APPLICATION_JSON_LD.offers as {
      price?: string;
      priceCurrency?: string;
      description?: string;
    };
    expect(offers.price).not.toBe("0");
    expect(offers.price).toBe("9.99");
    expect(offers.priceCurrency).toBe("USD");
    expect(offers.description?.toLowerCase()).toContain("14 day trial");
  });

  it("is the schema the homepage actually renders", () => {
    const src = readFileSync(join(REPO_ROOT, "apps/web/app/page.tsx"), "utf8");
    expect(src).toContain("SOFTWARE_APPLICATION_JSON_LD");
    expect(src).not.toMatch(/operatingSystem:\s*"iOS/);
  });
});
