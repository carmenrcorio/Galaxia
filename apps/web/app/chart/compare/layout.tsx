import type { Metadata } from "next";
import type { ReactNode } from "react";

// See app/chart/layout.tsx — same reasoning: page.tsx here is a client
// component, so its canonical has to live in a layout. This overrides the
// parent /chart layout's `alternates` (not just canonical) for this route.
export const metadata: Metadata = {
  alternates: {
    canonical: "/chart/compare"
  }
};

export default function ChartCompareLayout({ children }: { children: ReactNode }) {
  return children;
}
