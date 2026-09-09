import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * `app/chart/page.tsx` is a client component ("use client" — it drives the
 * quick-chart form with hooks), so it cannot export `metadata` itself. This
 * layout is the server-rendered sibling that carries per-route metadata for
 * `/chart` instead of it silently inheriting the root layout's generic
 * "Galaxia" title/description, and the route's canonical the same way every
 * other public page does. `/chart/compare` has its own `layout.tsx` with its
 * own copy — this file does not apply to that nested route because Next.js
 * resolves per-segment `layout.tsx` files independently and
 * `app/chart/compare/layout.tsx` fully overrides `metadata` (including
 * `alternates`) for that subtree.
 */
const TITLE = "Free Birth Chart Calculator — Galaxia";
const DESCRIPTION =
  "See anyone's real natal chart, free. Enter a birth date, time, and place for a computed chart with actual planetary positions — not a sun-sign guess.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "/chart"
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Galaxia",
    type: "website",
    url: "/chart",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia — astrology for the people you love" }]
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia — astrology for the people you love" }]
  }
};

export default function ChartLayout({ children }: { children: ReactNode }) {
  return children;
}
