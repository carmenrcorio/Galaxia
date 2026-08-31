import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import type { ReactNode } from "react";
import { publicEnv } from "../lib/env";
import "./globals.css";

const SITE_DESCRIPTION = "Astrologically-driven relationship intelligence";

/**
 * Site-wide OG/Twitter defaults. Any route that does not define its own
 * `openGraph`/`twitter` (i.e. every marketing page except `/`, which sets
 * page-specific copy in `app/page.tsx`) inherits this whole object — Next
 * merges metadata per top-level key, not deep-per-field, so a route that
 * wants different copy must restate the full object rather than partially
 * override it. This is what makes a bare `galaxiamea.com` link (e.g. the
 * Reddit launch post) unfurl with a branded image instead of a gray link
 * with no preview.
 */
const DEFAULT_OG_IMAGE = { url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia — astrology for the people you love" };

export const metadata: Metadata = {
  title: "Galaxia",
  description: SITE_DESCRIPTION,
  // Site-wide base for every route's relative metadata URLs (og:image,
  // twitter:image, canonical). Without this, a relative `openGraph.images`
  // path (e.g. `/s/<token>/opengraph-image`, see app/s/[token]/page.tsx)
  // resolves against nothing and link-preview crawlers — which never
  // execute JS and have no request origin to fall back to — get a broken
  // image URL. Same prod fallback already used by the cron routes
  // (lib/env.ts has no non-empty default; NEXT_PUBLIC_SITE_URL is unset in
  // this environment).
  metadataBase: new URL(publicEnv.siteUrl || "https://galaxia-three.vercel.app"),
  openGraph: {
    title: "Galaxia",
    description: SITE_DESCRIPTION,
    siteName: "Galaxia",
    type: "website",
    images: [DEFAULT_OG_IMAGE]
  },
  twitter: {
    card: "summary_large_image",
    title: "Galaxia",
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE]
  }
};

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  // Expose the optical-size axis (the reference loads Fraunces with opsz 9..144).
  // With it variable, the browser's default `font-optical-sizing: auto` uses the
  // delicate high-opsz display cut at large sizes and the sturdier text cut at
  // body sizes — so the big hero statement stops rendering as a chunky grotesque.
  axes: ["opsz"],
  variable: "--font-fraunces"
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter"
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${fraunces.variable}`}>{children}</body>
    </html>
  );
}
