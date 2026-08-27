import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import type { ReactNode } from "react";
import { publicEnv } from "../lib/env";
import "./globals.css";

export const metadata: Metadata = {
  title: "Galaxia",
  description: "Astrologically-driven relationship intelligence",
  // Site-wide base for every route's relative metadata URLs (og:image,
  // twitter:image, canonical). Without this, a relative `openGraph.images`
  // path (e.g. `/s/<token>/opengraph-image`, see app/s/[token]/page.tsx)
  // resolves against nothing and link-preview crawlers — which never
  // execute JS and have no request origin to fall back to — get a broken
  // image URL. Same prod fallback already used by the cron routes
  // (lib/env.ts has no non-empty default; NEXT_PUBLIC_SITE_URL is unset in
  // this environment).
  metadataBase: new URL(publicEnv.siteUrl || "https://galaxia-three.vercel.app")
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
