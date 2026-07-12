import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Galaxia",
  description: "Astrologically-driven relationship intelligence"
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
