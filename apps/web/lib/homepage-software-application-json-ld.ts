import type { JsonLdObject } from "../components/seo/json-ld";

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
  description:
    "Relationship intelligence powered by computed astrology. Real natal charts, synastry readings, and an AI guide for you and the people in your life.",
  offers: {
    "@type": "Offer",
    price: "9.99",
    priceCurrency: "USD",
    // FOUNDER-REVIEW: rewritten. Machine-readable offer must match the 14-day trial then $9.99/month paywall.
    description: "14 day trial, then $9.99 per month. No credit card required to start."
  },
  publisher: {
    "@type": "Organization",
    name: "Galaxia",
    url: "https://galaxiamea.com",
    contactPoint: {
      "@type": "ContactPoint",
      email: "help@galaxiamea.com",
      contactType: "customer support"
    }
  }
};
