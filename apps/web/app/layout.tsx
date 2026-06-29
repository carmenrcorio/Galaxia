import type { Metadata } from "next";
import { tokens } from "@galaxia/ui";
import type { CSSProperties, ReactNode } from "react";

export const metadata: Metadata = {
  title: "Galaxia",
  description: "Astrologically-driven relationship intelligence"
};

const containerStyle: CSSProperties = {
  minHeight: "100vh",
  background: tokens.colors.ink,
  color: tokens.colors.cream,
  fontFamily: "Inter, sans-serif"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={containerStyle}>{children}</body>
    </html>
  );
}
