import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * `app/chart/compare/page.tsx` is a client component ("use client"), so it
 * cannot export `metadata` itself. This layout carries per-route metadata
 * for `/chart/compare`, overriding the `title`/`description`/`openGraph`/
 * `twitter` inherited from the parent `app/chart/layout.tsx` (Next merges
 * metadata per top-level key per segment, so restating the full objects
 * here fully replaces the parent's `/chart` copy rather than partially
 * merging with it).
 */
const TITLE = "Free Synastry Chart — Compare Two Charts | Galaxia";
const DESCRIPTION =
  "See how two birth charts interact. Free synastry comparison with real aspect data, compatibility dynamics, and relationship insights.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Galaxia",
    type: "website",
    url: "/chart/compare",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia — astrology for the people you love" }]
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia — astrology for the people you love" }]
  }
};

export default function ChartCompareLayout({ children }: { children: ReactNode }) {
  return children;
}
