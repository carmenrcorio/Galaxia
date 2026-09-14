import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { HOMEPAGE_DESCRIPTION } from "./homepage-seo";
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

  it("keeps SoftwareApplication shape and matches homepage metadata description", () => {
    expect(SOFTWARE_APPLICATION_JSON_LD["@type"]).toBe("SoftwareApplication");
    expect(SOFTWARE_APPLICATION_JSON_LD["@context"]).toBe("https://schema.org");
    expect(SOFTWARE_APPLICATION_JSON_LD.name).toBe("Galaxia");
    expect(SOFTWARE_APPLICATION_JSON_LD.applicationCategory).toBe("LifestyleApplication");
    expect(SOFTWARE_APPLICATION_JSON_LD.operatingSystem).toBe("Web");
    expect(SOFTWARE_APPLICATION_JSON_LD.url).toBe("https://galaxiamea.com");
    expect(SOFTWARE_APPLICATION_JSON_LD.description).toBe(HOMEPAGE_DESCRIPTION);
    expect(SOFTWARE_APPLICATION_JSON_LD.offers).toMatchObject({
      "@type": "Offer",
      price: "9.99",
      priceCurrency: "USD",
    });
    expect(SOFTWARE_APPLICATION_JSON_LD.publisher).toMatchObject({
      "@type": "Organization",
      name: "Galaxia",
    });
  });
});
