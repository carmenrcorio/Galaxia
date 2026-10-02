/**
 * Above-the-fold primary CTAs for standalone marketing pages.
 * All copy is FOUNDER-REVIEW.
 */

import type { Route } from "next";

export interface MarketingPageCta {
  label: string;
  href: Route | string;
}

export const WHY_GALAXIA_ATF_CTA: MarketingPageCta = {
  label: "Run your free chart in 60 seconds",
  href: "/chart"
};

export const GENERATIONS_ATF_CTA: MarketingPageCta = {
  label: "Add your family, free for 14 days",
  href: "/signup"
};

export const MEET_VELA_ATF_CTA: MarketingPageCta = {
  label: "Ask Vela about your chart",
  href: "/signup"
};

export const SECURITY_ATF_CTA: MarketingPageCta = {
  label: "Start with a free chart, no signup",
  href: "/chart"
};

export const PRICING_ATF_CTA: MarketingPageCta = {
  label: "See the plan and what is included",
  href: "#plans"
};

export const FOR_WORK_ATF_CTA: MarketingPageCta = {
  label: "Try a free chart before your next meeting",
  href: "/chart"
};

export const METHODOLOGY_ATF_CTA: MarketingPageCta = {
  label: "See a chart computed this way",
  href: "/chart"
};

export const GLOSSARY_ATF_CTA: MarketingPageCta = {
  label: "Run a free chart in this vocabulary",
  href: "/chart"
};

export const PRESS_ATF_CTA: MarketingPageCta = {
  label: "Try Galaxia on a real chart",
  href: "/chart"
};
