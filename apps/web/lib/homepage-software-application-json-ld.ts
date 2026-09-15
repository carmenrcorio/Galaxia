import { GALAXIA_HELP_EMAIL } from "@galaxia/core";
import type { JsonLdObject } from "../components/seo/json-ld";
import { HOMEPAGE_DESCRIPTION } from "./homepage-seo";

/**
 * Homepage SoftwareApplication JSON-LD. Galaxia ships on the web only;
 * the paywall sells a monthly subscription after a 14-day trial.
 */
export const SOFTWARE_APPLICATION_JSON_LD: JsonLdObject = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Galaxia",
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Web",
  url: "https://galaxiamea.com",
  description: HOMEPAGE_DESCRIPTION,
  offers: {
    "@type": "Offer",
    price: "9.99",
    priceCurrency: "USD",
    description: "14 day trial, then $9.99 per month. No credit card required to start."
  },
  publisher: {
    "@type": "Organization",
    name: "Galaxia",
    url: "https://galaxiamea.com",
    contactPoint: {
      "@type": "ContactPoint",
      email: GALAXIA_HELP_EMAIL,
      contactType: "customer support"
    }
  }
};
