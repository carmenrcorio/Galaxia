import type { Metadata } from "next";
import type { ReactNode } from "react";

// page.tsx here is a client component ("use client" — useState/useEffect
// for the live chart form), so it cannot export `metadata` itself. This
// layout carries the route's canonical the same way every other public
// page does. /chart/compare below overrides `alternates` with its own
// canonical (Next merges metadata per top-level key, so a closer layout's
// `alternates` fully replaces this one rather than merging into it).
export const metadata: Metadata = {
  alternates: {
    canonical: "/chart"
  }
};

export default function ChartLayout({ children }: { children: ReactNode }) {
  return children;
}
